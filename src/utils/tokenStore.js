// Token storage per API doc (§1 Authentication).
//
// THE CONSTRAINT THAT SHAPES THIS FILE: the server keeps ONE access token per
// user. `createAccessToken()` calls `$user->tokens()->delete()` before minting,
// so every rotation — in any tab — kills the access token every other tab is
// holding. The refresh token is single-use on top of that, and replaying one is
// treated as theft and revokes the entire session.
//
// So tabs cannot each keep a private copy and hope for the best:
//
//   - REFRESH TOKEN → localStorage, and re-read on EVERY access. It is the
//     shared, authoritative value; a memoised copy goes stale the moment
//     another tab rotates, and posting a stale one logs the user out of
//     everything. localStorage is also what lets a reload resume the session,
//     which the doc calls for explicitly.
//
//   - ACCESS TOKEN → IN MEMORY ONLY, per the documented storage recommendation
//     (§1, "Recommended client storage"). It is never written to localStorage.
//     To stop tabs from invalidating each other it is SHARED rather than
//     PERSISTED: a rotation broadcasts the new token over a BroadcastChannel
//     and the other tabs update their in-memory copy. Nothing touches disk, so
//     closing the tab still discards it.
//
// Cross-tab WRITE coordination (so two tabs cannot rotate at once) lives in
// redux/api.js, which holds a lock around the rotation itself.

export const REFRESH_KEY = "alraqi_refresh_token";
const CHANNEL_NAME = "alraqi_auth";
const ACCESS_MESSAGE = "access_token";

let memoryAccessToken = null;
// Only a fallback for environments where localStorage throws (private mode,
// blocked site data). Never preferred over storage.
let memoryRefreshToken = null;

const readStored = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStored = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* memory copy still applies */
  }
};

// BroadcastChannel carries the access token BETWEEN tabs without persisting it.
// Where it is unavailable each tab simply keeps its own; the refresh flow in
// api.js still converges, it just costs one extra rotation.
let channel = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    if (event?.data?.type === ACCESS_MESSAGE) {
      memoryAccessToken = event.data.value ?? null;
    }
  };
} catch {
  channel = null;
}

const broadcastAccessToken = (value) => {
  try {
    channel?.postMessage({ type: ACCESS_MESSAGE, value });
  } catch {
    /* a dead channel must never break a sign-in */
  }
};

export const getAccessToken = () => memoryAccessToken;

// Always re-read: another tab may have rotated since the last call.
export const getRefreshToken = () =>
  readStored(REFRESH_KEY) ?? memoryRefreshToken;

// Single-use rotation: always overwrite both tokens together and never keep the
// previous refresh token around (replaying it revokes ALL sessions server-side).
export const setTokens = (newAccessToken, newRefreshToken) => {
  memoryAccessToken = newAccessToken || null;
  broadcastAccessToken(memoryAccessToken);

  if (newRefreshToken) {
    memoryRefreshToken = newRefreshToken;
    writeStored(REFRESH_KEY, newRefreshToken);
  }
};

export const clearTokens = () => {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  broadcastAccessToken(null);
  writeStored(REFRESH_KEY, null);
};

// "Might be logged in": a refresh token exists, so bootstrap should try /auth/me.
export const hasSession = () => Boolean(getRefreshToken());

/**
 * Notifies the app when another tab signs out.
 *
 * `storage` fires only in OTHER tabs, which is exactly what is wanted: a tab
 * whose credentials were cleared elsewhere should stop acting logged in rather
 * than discover it on its next request.
 */
export const onTokensChangedInAnotherTab = (handler) => {
  const listener = (event) => {
    if (event.key !== REFRESH_KEY) return;
    memoryRefreshToken = event.newValue;
    handler({ key: event.key, newValue: event.newValue });
  };

  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
};

// ---------------------------------------------------------------------------
// Cross-tab mutual exclusion for the rotation itself.
//
// Web Locks is the real mechanism. The fallback is a localStorage mutex, which
// matters because WITHOUT any cross-tab coordination two tabs can post the same
// single-use refresh token simultaneously and the server revokes every session
// the user has. A best-effort mutex is far better than none here.
// ---------------------------------------------------------------------------
const LOCK_KEY = "alraqi_refresh_lock";

// ⚠️ THESE TWO MUST NOT BE EQUAL, and the wait must be the LONGER of the two.
//
// LOCK_TTL_MS is how long a held lock stays valid before another tab may treat
// the holder as dead. LOCK_WAIT_MS is how long a waiter is willing to queue.
// When both were 10s they expired together: a refresh slower than 10s meant the
// waiter gave up at the same instant the lock became collectable, and it
// rotated the refresh token the holder was still using — the exact replay the
// lock exists to prevent, and the server revokes every session for it.
//
// Waiting strictly longer than the TTL means a waiter only ever proceeds after
// the lock has genuinely expired, never merely because it got bored. The budget
// also absorbs background-tab throttling, where setTimeout is clamped to ~1s
// and a poll loop burns its allowance far faster than wall-clock suggests.
const LOCK_TTL_MS = 15000;
const LOCK_WAIT_MS = 45000;
const LOCK_POLL_MS = 40;

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const readLock = () => {
  try {
    return JSON.parse(readStored(LOCK_KEY) || "null");
  } catch {
    return null;
  }
};

const withStorageLock = async (fn) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const giveUpAt = Date.now() + LOCK_WAIT_MS;

  while (Date.now() < giveUpAt) {
    const held = readLock();
    const free = !held || typeof held.expires !== "number" || held.expires < Date.now();

    if (free) {
      writeStored(LOCK_KEY, JSON.stringify({ id, expires: Date.now() + LOCK_TTL_MS }));
      // Write-then-read-back: if another tab raced us, exactly one of the two
      // ids survives, and only that tab proceeds.
      await sleep(LOCK_POLL_MS);
      if (readLock()?.id === id) {
        try {
          return await fn();
        } finally {
          if (readLock()?.id === id) writeStored(LOCK_KEY, null);
        }
      }
    }
    await sleep(LOCK_POLL_MS);
  }

  // Waited past LOCK_WAIT_MS, which is three times the TTL: whoever held the
  // lock is not coming back. Take it over rather than stranding the user in a
  // permanently un-refreshable session. The caller re-checks the access token
  // inside the critical section, so this is still not a blind rotation.
  writeStored(LOCK_KEY, JSON.stringify({ id, expires: Date.now() + LOCK_TTL_MS }));
  try {
    return await fn();
  } finally {
    if (readLock()?.id === id) writeStored(LOCK_KEY, null);
  }
};

/**
 * Runs `fn` with no other tab inside it.
 */
export const withRefreshLock = (fn) => {
  if (globalThis.navigator?.locks?.request) {
    return navigator.locks.request("alraqi_token_refresh", fn);
  }
  return withStorageLock(fn);
};
