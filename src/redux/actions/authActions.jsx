import api from "../api";
import {
  setTokens,
  clearTokens,
  hasSession,
} from "../../utils/tokenStore";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";
import { deviceName } from "../../utils/deviceName";

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

// The field is `login`, not `email` (account model, 2026-09-22): it carries an
// employee number (e.g. EMP-00042) or an email, and the server decides which.
// Sending `email` is now a 422 — `login` is required.
//
// `device_name` / `platform` (backend 2026-10-10) label this browser's session
// on /sessions. Both optional server-side; device_name is null for a browser
// deviceName() cannot recognise, and the server accepts that.
export const login = (identifier, password) => async (dispatch) => {
  dispatch(loginStart());
  try {
    const response = await api.post("/auth/login", {
      login: identifier,
      password,
      device_name: deviceName(navigator.userAgent),
      platform: "web",
    });
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

// POST /auth/password — replaces the caller's own password. Self-scoped, and one
// of the three routes reachable while `must_change_password` is set (the others
// are /auth/me and /auth/logout); it is the only one that clears the flag.
//
// The server revokes EVERY session on success, this one included, and hands
// back a fresh pair — so the new tokens must be stored before anything else is
// called, or the next request is a 401 against a dead refresh token.
//
// A wrong current password is a 401 on this endpoint (not a 422), so the call
// allows ONE auth recovery instead of the usual two: enough to survive an
// access token that expired while the form was open, without rotating the
// session twice more just to learn the password was wrong.
//
// Throws the parsed error so the form can map the 422 bag onto its fields.
export const changePassword =
  ({ current_password, password, password_confirmation }) =>
  async (dispatch) => {
    try {
      const response = await api.post(
        "/auth/password",
        { current_password, password, password_confirmation },
        { __maxAuthAttempts: 1 }
      );
      const { access_token, refresh_token } = response.data.data;
      setTokens(access_token, refresh_token);

      // Re-read the user rather than flipping the flag locally: /auth/me is the
      // authority on must_change_password.
      const me = await api.get("/auth/me");
      dispatch(bootstrapSuccess(me.data.data));
      toastNotify(response.data.message, "success");
    } catch (error) {
      throw parseApiError(error);
    }
  };

export const logout = () => async (dispatch) => {
  try {
    // Ends THIS browser's session only (backend 2026-10-10) — the account's
    // phone and other browsers stay signed in. logoutEverywhere() below ends
    // them all.
    await api.post("/auth/logout");
  } catch {
    /* even if the call fails, wipe the local session */
  }
  clearTokens();
  dispatch(logoutSuccess());
};

// POST /auth/logout-all — every session on every device, this one included.
// Unlike logout(), a failure is THROWN, not swallowed: the caller asked to sign
// other devices out, and wiping only this tab would look like success while
// the others stayed signed in.
export const logoutEverywhere = () => async (dispatch) => {
  try {
    await api.post("/auth/logout-all");
  } catch (error) {
    throw parseApiError(error);
  }
  clearTokens();
  dispatch(logoutSuccess());
};
