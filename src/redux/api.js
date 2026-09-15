import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  withRefreshLock,
} from "../utils/tokenStore";
import { toastNotify } from "../utils";

// VITE_API_URL is inlined at BUILD time. The dev server gets it from
// .env.development; a production build without it is refused outright by
// vite.config.js, so there is deliberately no localhost fallback here — that
// fallback is exactly what shipped a bundle calling every user's own machine.
const BASE_URL = import.meta.env.VITE_API_URL;

// Sanctum bearer tokens — NOT cookies, so no withCredentials.
// Accept: application/json is required so Laravel returns JSON 401/422
// instead of HTML redirects.
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Remembered so the 401 handler can tell "my token expired" from "another
    // tab rotated while this request was in flight". Those need opposite
    // responses: refresh, versus retry with the token that already exists.
    config.__accessToken = token;
  }

  // Correlation id. The API honours a client-supplied X-Request-Id (up to 64
  // chars of A-Za-z0-9._-), echoes it back on the response, and stores it on
  // every audit row the request writes. Sending our own means a user reporting
  // "it failed at 14:32" can be traced to the exact server-side rows, instead
  // of guessing from timestamps. If we send nothing the server mints one, so
  // this is purely so the id is known to us too.
  if (!config.headers["X-Request-Id"] && globalThis.crypto?.randomUUID) {
    config.headers["X-Request-Id"] = globalThis.crypto.randomUUID();
  }

  return config;
});

const isAuthEndpoint = (url = "") =>
  url.includes("/auth/login") || url.includes("/auth/refresh");

// Single-flight refresh WITHIN this tab: concurrent 401s all await the same
// promise so the single-use refresh token is only ever sent once here.
let refreshPromise = null;

// ⚠️ ACROSS TABS, a promise is not enough. Every tab runs its own JS and its own
// `refreshPromise`, while the refresh token is ONE single-use server-side row.
// Two tabs hitting 401 together would both post it; the second is read as a
// replay and the server revokes EVERY token the user holds. `withRefreshLock`
// serialises the rotation across tabs (Web Locks, with a localStorage mutex
// where that is unavailable — see tokenStore).
//
// A request is allowed at most this many auth recoveries. It is a COUNTER and
// not the old boolean `_retry`, because there are now two distinct recoveries
// and one request can legitimately need each in turn: first "another tab
// rotated, retry with the current token", then "that one expired too, refresh".
// A boolean spent on the first made the second impossible, and the request
// failed as though the session had ended.
const MAX_AUTH_ATTEMPTS = 2;

const rotateTokens = async () => {
  // Read INSIDE the critical section, never before it: by the time we hold the
  // lock another tab may have rotated, and the stored value is the fresh one.
  const refresh_token = getRefreshToken();
  if (!refresh_token) {
    throw new Error("NO_REFRESH_TOKEN");
  }
  // Bare axios call: bypasses our interceptors so a 401 here can't recurse.
  const res = await axios.post(
    `${BASE_URL}/auth/refresh`,
    { refresh_token },
    { headers: { "Content-Type": "application/json", Accept: "application/json" } }
  );
  const { access_token, refresh_token: newRefreshToken } = res.data.data;
  // Rotation: persist the NEW pair immediately; the old refresh token is dead.
  setTokens(access_token, newRefreshToken);
  return access_token;
};

/**
 * Obtains a working access token for a request whose own token was rejected.
 *
 * `staleAccessToken` is the token the failed request actually carried, and the
 * comparison is against THAT — not against the refresh token. The question is
 * "has the token I used already been replaced?", and only the access token can
 * answer it.
 *
 * Comparing refresh tokens got this wrong whenever another tab rotated BEFORE
 * this tab reached its own 401: the "before" value read here was already the
 * new one, no difference was seen, and this tab rotated again needlessly —
 * destroying the other tab's brand-new access token and, with a single-use
 * retry flag, potentially stranding its in-flight request for good.
 */
const performRefresh = async (staleAccessToken) =>
  withRefreshLock(async () => {
    // Someone else rotated while we queued: their token is live, so use it
    // rather than burning a rotation that would invalidate them in turn.
    const current = getAccessToken();
    if (current && current !== staleAccessToken) return current;
    return rotateTokens();
  });

const forceLogoutRedirect = () => {
  clearTokens();
  const path = window.location.pathname;
  if (!path.includes("/signin") && !path.includes("/session-expired")) {
    window.location.href = "/session-expired";
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // Network failure / CORS — nothing to intercept.
    if (!response) return Promise.reject(error);

    const status = response.status;

    // 429 rate limit. The body now carries the standard envelope with an Arabic
    // message; prefer it and fall back to our own text. Retry-After is still
    // sent. Auth endpoints handle their own back-off UI (login countdown), so
    // only toast for regular API calls.
    if (status === 429 && !isAuthEndpoint(config?.url)) {
      const retryAfter = parseInt(response.headers?.["retry-after"], 10) || 60;
      toastNotify(
        response.data?.message ||
          `محاولات كثيرة، يرجى الانتظار ${retryAfter} ثانية ثم المحاولة مجدداً.`,
        "warning"
      );
      return Promise.reject(error);
    }

    // Refresh flow — triggered by HTTP STATUS 401 and nothing else.
    //
    // ⚠️ This used to additionally require `response.data.message ===
    // "Unauthenticated."`. That string no longer exists: the API now returns
    // the standard envelope on 401 as well, with an Arabic message
    // ({ success: false, message: "غير مصرّح بالوصول." }). Matching on it meant
    // the condition was never true, so NO expired token was ever refreshed and
    // every session died at the 15-minute mark instead of renewing silently.
    //
    // Never match on the body again. The status code is the contract — that is
    // exactly what API_DOCUMENTATION.md §1 tells clients to do, and why: a 403
    // also carries `success: false` and must never trigger a refresh.
    //
    // Still excluded:
    //  - /auth/login 401 (invalid credentials — a real answer, not an expiry)
    //  - /auth/refresh 401 (handled below as a hard logout)
    //  - requests that have already used their auth recoveries
    //    (config.__authAttempts, see MAX_AUTH_ATTEMPTS)
    const attempts = config?.__authAttempts || 0;

    if (
      status === 401 &&
      !isAuthEndpoint(config?.url) &&
      attempts < MAX_AUTH_ATTEMPTS
    ) {
      config.__authAttempts = attempts + 1;
      const staleAccessToken = config.__accessToken;

      // FIRST: has this token simply been replaced already? Another tab (or an
      // earlier request in this one) may have rotated while this request was in
      // flight, which invalidates it server-side. That is not an expiry and
      // must NOT trigger a rotation of its own — retrying with the token that
      // already exists is both correct and free, and avoids the mutual
      // invalidation two tabs would otherwise inflict on each other.
      const currentToken = getAccessToken();
      if (currentToken && currentToken !== staleAccessToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
        config.__accessToken = currentToken;
        return api(config);
      }

      try {
        if (!refreshPromise) {
          refreshPromise = performRefresh(staleAccessToken).finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        config.headers.Authorization = `Bearer ${newToken}`;
        config.__accessToken = newToken;
        return api(config);
      } catch (refreshError) {
        // Any refresh failure (expired / revoked / reuse-detected / missing)
        // means the session is unrecoverable: wipe tokens and force re-login.
        forceLogoutRedirect();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
