// The profile «الحضور» tab's window and filters (API doc §14.3), kept apart from
// the screen so what a hand-edited link may mean, and which window may be asked
// for, are testable under plain Node.
//
// The window logic is the monthly report's: the same 92-day limit and the same
// «today» (Damascus), so the link from a monthly row opens the SAME window.
import { GRID_SORT_KEYS, rangeTooLong } from "../../redux/actions/attendanceParams.js";
import { MAX_RANGE_DAYS, RANGE_TOO_LONG } from "./monthlyFilters.js";
import { isDate, todayInDamascus } from "./recordFilters.js";

// `weekday` is a number (0 Sunday … 6 Saturday); the server sends no name.
export const WEEKDAY_NAMES = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export { GRID_SORT_KEYS };

/** This month's first and last day, on the Damascus calendar. */
export const monthBoundsInDamascus = (now = new Date()) => {
  const today = todayInDamascus(now);
  const [year, month] = today.split("-").map(Number);
  // Day 0 of the next month is this month's last day (UTC, so no zone shift).
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = today.slice(0, 8);
  return { from: `${prefix}01`, to: `${prefix}${String(last).padStart(2, "0")}` };
};

/**
 * A window given by the link (`?from` / `?to`) — or null when it cannot be
 * trusted: both present and real dates, not inverted, within 92 days. A `to`
 * after today is fine (the month's last day).
 */
export const windowFromQuery = (from, to) => {
  if (!isDate(from ?? "") || !isDate(to ?? "")) return null;
  if (to < from) return null;
  if (rangeTooLong(from, to, MAX_RANGE_DAYS)) return null;
  return { from, to };
};

export const defaultGridFilters = (now = new Date(), initial = null) => ({
  ...(initial || monthBoundsInDamascus(now)),
  status: "",
  working_days_only: "",
  sort: "",
});

/**
 * Why the window cannot be asked for, as Arabic text — or null. Nothing is sent
 * while this is non-null: the builder drops half a range and the server would
 * then answer with this month under a window that says otherwise.
 */
export const gridProblem = (f) => {
  if (!isDate(f.from) || !isDate(f.to)) return "حدّد تاريخ البداية وتاريخ النهاية.";
  if (f.to < f.from) return "تاريخ النهاية يجب أن يكون مساوياً أو بعد تاريخ البداية.";
  if (rangeTooLong(f.from, f.to, MAX_RANGE_DAYS)) return RANGE_TOO_LONG;
  return null;
};

/** The profile's first tab: the link's `?tab=`, only if this user has that tab. */
export const initialTabFromQuery = (tab, availableKeys) =>
  tab && availableKeys.includes(tab) ? tab : "overview";
