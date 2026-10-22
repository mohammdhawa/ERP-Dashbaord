// The name this browser's session is listed under on /sessions ("Chrome ·
// Windows"), sent as `device_name` at sign-in (backend API doc §3.1, §3.6).
//
// PURE — no `navigator` here, the caller passes the user agent — so it runs
// under `node --test` like the other pure modules.
//
// ORDER MATTERS in both tables. Edge and Opera also say "Chrome", Chrome also
// says "Safari"; Android also says "Linux", and iOS also says "Mac OS X". Each
// table therefore lists the more specific signature first, and the first match
// wins.
//
// An unrecognised half is left out, and an unrecognised whole is null: the
// session list shows "جهاز غير معروف" for null, which is honest, where a guess
// would name the wrong device in the one place a person checks for a sign-in
// they do not recognise.

const BROWSERS = [
  ["Edge", /Edg\//],
  ["Opera", /OPR\//],
  ["Samsung Internet", /SamsungBrowser\//],
  ["Firefox", /Firefox\//],
  ["Chrome", /Chrome\//],
  ["Safari", /Version\/[\d.]+.*Safari\//],
];

const SYSTEMS = [
  ["Android", /Android/],
  ["iOS", /iPhone|iPad|iPod/],
  ["Windows", /Windows NT/],
  ["ChromeOS", /CrOS/],
  ["macOS", /Mac OS X|Macintosh/],
  ["Linux", /Linux|X11/],
];

const firstMatch = (table, userAgent) =>
  table.find(([, pattern]) => pattern.test(userAgent))?.[0] ?? null;

export const deviceName = (userAgent) => {
  if (!userAgent) return null;

  const parts = [firstMatch(BROWSERS, userAgent), firstMatch(SYSTEMS, userAgent)].filter(Boolean);

  return parts.length ? parts.join(" · ") : null;
};
