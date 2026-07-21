import { hasSession } from "../../utils/tokenStore";

const initialState = {
  // Full user object from login / /auth/me (includes roles + permissions).
  user: null,
  // Flattened, de-duplicated permission strings — the single source of truth
  // for UI gating (e.g. permissions.includes("hr.employees.create")).
  permissions: [],
  loading: false,
  // `initialized` gates the router: until bootstrap resolves we show a loader
  // instead of bouncing the user to /signin. If no refresh token exists there
  // is nothing to bootstrap, so we start initialized.
  initialized: !hasSession(),
  error: null,
  fieldErrors: null, // 422 Laravel error bag from login
  disabled: false, // 403 on login → "account disabled" view
  retryAfter: null, // 429 on login → countdown seconds
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case "LOGIN_START":
      return {
        ...state,
        loading: true,
        error: null,
        fieldErrors: null,
        disabled: false,
        retryAfter: null,
      };

    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload,
        permissions: action.payload?.permissions || [],
        loading: false,
        initialized: true,
        error: null,
        fieldErrors: null,
        disabled: false,
        retryAfter: null,
      };

    case "LOGIN_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "LOGIN_DISABLED":
      return {
        ...state,
        loading: false,
        disabled: true,
        error: action.payload,
      };

    case "LOGIN_VALIDATION_FAILURE":
      return {
        ...state,
        loading: false,
        error: action.payload.message,
        fieldErrors: action.payload.errors,
      };

    case "LOGIN_RATE_LIMITED":
      return {
        ...state,
        loading: false,
        error: action.payload.message,
        retryAfter: action.payload.retryAfter,
      };

    case "LOGIN_RATE_LIMIT_CLEARED":
      return { ...state, retryAfter: null, error: null };

    case "AUTH_BOOTSTRAP_START":
      return { ...state, initialized: false };

    case "AUTH_BOOTSTRAP_SUCCESS":
      return {
        ...state,
        user: action.payload,
        permissions: action.payload?.permissions || [],
        initialized: true,
      };

    case "AUTH_BOOTSTRAP_DONE":
      return { ...state, initialized: true };

    case "LOGOUT_SUCCESS":
      return {
        ...initialState,
        initialized: true,
      };

    default:
      return state;
  }
};

export default authReducer;
