import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
export default defineConfig({
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
});
