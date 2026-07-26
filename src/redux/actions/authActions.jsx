import api from "../api";
import {
  setTokens,
  clearTokens,
  hasSession,
} from "../../utils/tokenStore";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";

export const loginStart = () => ({ type: "LOGIN_START" });
export const loginSuccess = (user) => ({
  type: "LOGIN_SUCCESS",
  payload: user,
});
export const loginFailure = (error) => ({
  type: "LOGIN_FAILURE",
  payload: error,
});
// 403 on login = disabled account (تم تعطيل هذا الحساب) — a dedicated state so
// the Signin page can render an "account disabled" view instead of a generic
// failure. Must NOT be routed through the token-refresh flow.
export const loginDisabled = (message) => ({
  type: "LOGIN_DISABLED",
  payload: message,
});
// 422 on login = per-field Arabic validation messages (Laravel error bag).
export const loginValidationFailure = (payload) => ({
  type: "LOGIN_VALIDATION_FAILURE",
  payload,
});
// 429 on login = rate limited (5/min/IP); payload carries Retry-After seconds
// so the form can show a countdown and block resubmission.
export const loginRateLimited = (payload) => ({
  type: "LOGIN_RATE_LIMITED",
  payload,
});
// Cooldown elapsed → drop the stale rate-limit message so it doesn't linger as
// a red error once the user is allowed to retry.
export const clearRateLimit = () => ({ type: "LOGIN_RATE_LIMIT_CLEARED" });

export const bootstrapStart = () => ({ type: "AUTH_BOOTSTRAP_START" });
export const bootstrapSuccess = (user) => ({
  type: "AUTH_BOOTSTRAP_SUCCESS",
  payload: user,
});
export const bootstrapDone = () => ({ type: "AUTH_BOOTSTRAP_DONE" });

export const logoutSuccess = () => ({ type: "LOGOUT_SUCCESS" });

export const login = (email, password) => async (dispatch) => {
  dispatch(loginStart());
  try {
    const response = await api.post("/auth/login", { email, password });
    const { user, access_token, refresh_token } = response.data.data;

    // access token in memory, refresh token persisted (single-use rotation).
    setTokens(access_token, refresh_token);

    dispatch(loginSuccess(user));
    toastNotify(response.data.message, "success");
  } catch (error) {
    const parsed = parseApiError(error);

    if (parsed.status === 403) {
      dispatch(loginDisabled(parsed.message));
    } else if (parsed.status === 422) {
      dispatch(
        loginValidationFailure({ message: parsed.message, errors: parsed.errors })
      );
    } else if (parsed.status === 429) {
      dispatch(
        loginRateLimited({ message: parsed.message, retryAfter: parsed.retryAfter })
      );
    } else {
      // 401 invalid credentials returns a deliberately generic Arabic message.
      dispatch(loginFailure(parsed.message));
    }
  }
};

// Session bootstrap (app mount): if a refresh token survived the reload, call
// /auth/me to validate the session and rehydrate the user + flattened
// `permissions` array the whole UI gates on. The access token never survives a
// reload (in-memory), so the first /me returns 401 "Unauthenticated." and the
// interceptor transparently refreshes and retries it.
export const bootstrapSession = () => async (dispatch) => {
  if (!hasSession()) {
    dispatch(bootstrapDone());
    return;
  }
  dispatch(bootstrapStart());
  try {
    const response = await api.get("/auth/me");
    dispatch(bootstrapSuccess(response.data.data));
  } catch {
    // Refresh failed → interceptor already wiped tokens and redirected.
    clearTokens();
    dispatch(bootstrapDone());
  }
};

// Re-fetch the current user (e.g. after RBAC changes) without a full reload.
export const refreshCurrentUser = () => async (dispatch) => {
  try {
    const response = await api.get("/auth/me");
    dispatch(bootstrapSuccess(response.data.data));
  } catch {
    /* non-fatal — keep the cached user */
  }
};

export const logout = () => async (dispatch) => {
  try {
    // Revokes ALL access + refresh tokens server-side (every device).
    await api.post("/auth/logout");
  } catch {
    /* even if the call fails, wipe the local session */
  }
  clearTokens();
  dispatch(logoutSuccess());
};
