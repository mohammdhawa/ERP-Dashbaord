// Filter-value rules shared by the attendance and leave screens and their params
// builders — pure, so `npm test` runs it under plain Node.
//
// The server's person filters are `employee_id` / `department_id` (an existing
// positive id) and `search` (max:100). Anything else is a 422 that no retry can
// cure, so the values are checked here once, in one place.

export const MAX_SEARCH = 100;

// A person/unit id filter: a positive integer of at most 9 digits, no leading
// zero ("007" is rejected, not normalised: the server would read it as 7 while
// the URL and the control still said "007"). 0, -3, 1.5, 1e2 and absurdly long
// digit strings are all a 422 server-side.
export const isPositiveId = (s) => /^[1-9]\d{0,8}$/.test(String(s ?? ""));

/**
 * A real calendar day as `YYYY-MM-DD`. 2026-02-31 and 2026-13-45 pass a shape
 * check but are a 422 server-side (`date_format:Y-m-d`).
 */
export const isRealDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s ?? ""))) return false;
  const [y, m, d] = String(s).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};

/** A search text as the server accepts it: trimmed, at most MAX_SEARCH long. */
export const capSearch = (value) => String(value ?? "").trim().slice(0, MAX_SEARCH);
