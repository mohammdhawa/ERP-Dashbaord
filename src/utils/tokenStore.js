// Token storage per API doc (§1 Authentication):
// - access_token lives in memory only (15 min lifetime, replaced on every refresh/login).
// - refresh_token must be JS-readable because /auth/refresh reads it from the JSON
//   body (no httpOnly-cookie path on the server). We keep it in memory with a
//   localStorage fallback so the session survives page reloads.

const REFRESH_KEY = "alraqi_refresh_token";

let accessToken = null;
let refreshToken = null;

export const getAccessToken = () => accessToken;

export const getRefreshToken = () => {
  if (refreshToken) return refreshToken;
  try {
    refreshToken = localStorage.getItem(REFRESH_KEY);
  } catch {
    /* storage unavailable — memory copy only */
  }
  return refreshToken;
};

// Single-use rotation: always overwrite both tokens together and never keep
// the previous refresh token around (reusing it revokes ALL sessions server-side).
export const setTokens = (newAccessToken, newRefreshToken) => {
  accessToken = newAccessToken || null;
  if (newRefreshToken) {
    refreshToken = newRefreshToken;
    try {
      localStorage.setItem(REFRESH_KEY, newRefreshToken);
    } catch {
      /* fall back to memory only */
    }
  }
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  try {
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
};

// "Might be logged in": a refresh token exists, so bootstrap should try /auth/me.
export const hasSession = () => Boolean(getRefreshToken());
