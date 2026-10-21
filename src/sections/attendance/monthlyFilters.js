// The monthly report's filter state (API doc §14.2), kept apart from the screen
// so what a hand-edited URL may mean, and which window may be asked for, are
// testable under plain Node.
//
// One flat object of strings so it round-trips through the URL. The MODE (this
// month / a range) decides which date fields reach buildMonthlyParams, so a
// stale `from` left from a range cannot win over an unfinished month.
import {
  MONTHLY_SORT_KEYS,
  rangeTooLong,
} from "../../redux/actions/attendanceParams.js";
import {
  isDate,
  isValidYear,
  todayInDamascus,
  validMonth,
} from "./recordFilters.js";
import { MAX_SEARCH, isPositiveId } from "../../utils/filterValues.js";

export const MONTHLY_MODES = [
  { value: "month", label: "شهر" },
  { value: "range", label: "فترة" },
];
const MODE_VALUES = MONTHLY_MODES.map((m) => m.value);

export const MAX_RANGE_DAYS = 92;
export const RANGE_TOO_LONG = "الفترة لا يجب أن تتجاوز 92 يوماً.";

export const defaultMonthlyFilters = (now = new Date()) => {
  const today = todayInDamascus(now);
  return {
    mode: "month",
    month: String(Number(today.slice(5, 7))),
    year: today.slice(0, 4),
    from: "",
    to: "",
    has_absences: "",
    has_missing_checkouts: "",
    employee_id: "",
    department_id: "",
    search: "",
    sort: "",
  };
};

export const monthlyFiltersFromSearch = (get, defaults) => {
  const out = { ...defaults };
  const pick = (key, ok) => {
    const v = get(key);
    if (v != null && v !== "" && ok(v)) out[key] = v;
  };
  pick("mode", (v) => MODE_VALUES.includes(v));
  pick("month", validMonth);
  pick("year", isValidYear);
  pick("from", isDate);
  pick("to", isDate);
  pick("has_absences", (v) => v === "1");
  pick("has_missing_checkouts", (v) => v === "1");
  pick("employee_id", isPositiveId);
  pick("department_id", isPositiveId);
  pick("sort", (v) =>
    MONTHLY_SORT_KEYS.includes(v.startsWith("-") ? v.slice(1) : v)
  );
  const search = get("search");
  if (search) out.search = search.slice(0, MAX_SEARCH);
  return out;
};

/**
 * The filters as buildMonthlyParams should see them: only the active date
 * fields, and a person id that is not a positive integer withheld (the
 * department box falls back to a free number input; the control keeps the text).
 */
export const toMonthlyQuery = (f) => {
  const { mode, month, year, from, to, ...rest } = f;
  const out = { ...rest };
  for (const key of ["employee_id", "department_id"]) {
    if (!isPositiveId(out[key])) out[key] = "";
  }
  return mode === "range" ? { ...out, from, to } : { ...out, month, year };
};

/**
 * Why the window cannot be asked for, as Arabic text — or null. The report is
 * NOT fetched while this is non-null: the builder drops half a range and the
 * server would then answer with this month under a filter that says otherwise.
 */
export const monthlyProblem = (f) => {
  if (f.mode === "range") {
    if (!isDate(f.from) || !isDate(f.to)) return "حدّد تاريخ البداية وتاريخ النهاية.";
    if (f.to < f.from) return "تاريخ النهاية يجب أن يكون مساوياً أو بعد تاريخ البداية.";
    if (rangeTooLong(f.from, f.to, MAX_RANGE_DAYS)) return RANGE_TOO_LONG;
    return null;
  }
  if (!validMonth(f.month)) return "الشهر غير صحيح.";
  if (!isValidYear(f.year)) return "السنة غير صحيحة.";
  return null;
};

/** Hours as the server writes them in a row ("15h 30m"); the totals carry no
 *  formatted twin. Minutes are carried so 59.99 minutes never reads "60m". */
export const formatHours = (hours) => {
  const n = Number(hours);
  if (!Number.isFinite(n) || n < 0) return "";
  const minutes = Math.round(n * 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

/** The employee profile's attendance tab, for the window the SERVER answered. */
export const employeeAttendanceLink = (base, employeeId, from, to) =>
  `${base}hr/employees/${employeeId}?tab=attendance&from=${encodeURIComponent(
    from
  )}&to=${encodeURIComponent(to)}`;

/**
 * How much of a report's window the counts cover (API doc §14, 2026-10-20,
 * parity audit S-1): the reports count only up to today, and say where they
 * stopped in `counted_to` — null when the window starts after today.
 *   "whole"   — every day of the window is counted;
 *   "partial" — counted from `from` to `counted_to`;
 *   "none"    — nothing counted yet.
 */
export const countedSpan = (report) => {
  if (!report) return "whole";
  if (report.counted_to === null) return "none";
  if (report.counted_to === undefined || report.counted_to >= report.to)
    return "whole";
  return "partial";
};
