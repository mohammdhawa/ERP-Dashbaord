import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";

/**
 * Refuses to produce a production bundle that points at a developer's machine.
 *
 * VITE_API_URL is inlined into the bundle at BUILD time, so a wrong value is
 * not a config mistake anyone can fix after deploying — it is baked into the
 * artifact, and every user's browser then calls their own localhost. That
 * failure is invisible in CI (the build succeeds) and only shows up as an app
 * that cannot reach the API for anyone but the person who built it.
 *
 * A warning would not help: the previous default was a warning-free silent
 * fallback. So this throws, and says what to set.
 */
const assertDeployableApiUrl = (mode) => {
  // Guard EVERY mode except development, not just "production". `vite build
  // --mode staging` skipped this check entirely, and since api.js no longer
  // carries a fallback, that shipped `baseURL: undefined` — axios then resolves
  // every call against the static host's own origin and returns HTML 404s that
  // surface as a generic Arabic error with nothing pointing at the real cause.
  // Only the dev server is exempt, and .env.development supplies it there.
  if (mode === "development") return;

  const { VITE_API_URL } = loadEnv(mode, process.cwd(), "VITE_");

  if (!VITE_API_URL) {
    throw new Error(
      `VITE_API_URL is not set for the "${mode}" build.\n` +
        "Set it in the deploy environment/CI, or copy .env.production.example " +
        "to .env.production with your public API origin."
    );
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(VITE_API_URL)) {
    throw new Error(
      `VITE_API_URL points at a local address (${VITE_API_URL}).\n` +
        "A production bundle built with this would make every user's browser " +
        "call their own machine. Set the public API origin instead."
    );
  }
};

export default defineConfig(({ mode }) => {
  assertDeployableApiUrl(mode);

  return {
    plugins: [react(), compression({ algorithm: "gzip" })],
    define: {
      "process.env": {
        NODE_ENV: "production",
      },
    },
    build: {
      minify: "terser",
    },
    server: {
      host: true,
      hmr: {
        overlay: false,
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler",
        },
      },
    },
  };
});
