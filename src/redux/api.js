import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "../utils/tokenStore";
import { toastNotify } from "../utils";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

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
  }
  return config;
});

const isAuthEndpoint = (url = "") =>
  url.includes("/auth/login") || url.includes("/auth/refresh");

// Single-flight refresh: concurrent 401s all await the same promise so the
// single-use refresh token is only ever sent once. Retrying /auth/refresh with
// a consumed token is treated as theft server-side and revokes ALL sessions.
let refreshPromise = null;

const performRefresh = async () => {
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

    // 429 rate limit: `{ "message": "Too Many Requests" }` + Retry-After header.
    // Auth endpoints handle their own back-off UI (login countdown), so only
    // toast for regular API calls.
    if (status === 429 && !isAuthEndpoint(config?.url)) {
      const retryAfter = parseInt(response.headers?.["retry-after"], 10) || 60;
      toastNotify(
        `محاولات كثيرة، يرجى الانتظار ${retryAfter} ثانية ثم المحاولة مجدداً.`,
        "warning"
      );
      return Promise.reject(error);
    }

    // Refresh flow — triggered by HTTP status 401, NOT by `success === false`
    // (the expired-token body `{ "message": "Unauthenticated." }` has no
    // `success` key). Never triggered for:
    //  - /auth/login 401 (invalid credentials — envelope error)
    //  - /auth/refresh 401 (handled below as a hard logout)
    //  - requests already retried once (config._retry)
    // 403 (missing permission / disabled account) never reaches this branch.
    if (
      status === 401 &&
      !isAuthEndpoint(config?.url) &&
      !config._retry &&
      response.data?.message === "Unauthenticated."
    ) {
      config._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = performRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        config.headers.Authorization = `Bearer ${newToken}`;
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
