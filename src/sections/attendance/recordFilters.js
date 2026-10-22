// The records list's filter state, kept apart from the screen so the rules that
// decide WHICH day or window is asked for, and what a hand-edited URL may mean,
// can be tested under plain Node (no import.meta, no React).
//
// The screen holds one flat object of strings so it round-trips through the URL.
// buildRecordsParams (attendanceParams.js) picks the date by precedence — date,
// from+to, month(+year), year — so the UI's MODE decides which of those fields
// reach it at all: a stale `month` left from before the user switched to a range
// must not win over an unfinished one.
import { RECORDS_SORT_KEYS } from "../../redux/actions/attendanceParams.js";
import { MAX_SEARCH, isPositiveId } from "../../utils/filterValues.js";

export const DATE_MODES = [
  { value: "day", label: "يوم" },
  { value: "range", label: "فترة" },
  { value: "month", label: "شهر" },
];
const MODE_VALUES = DATE_MODES.map((m) => m.value);

export const MONTH_OPTIONS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
].map((label, i) => ({ value: String(i + 1), label }));

export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;

export const isDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  // Rejects 2026-02-31, which Date would roll into March.
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};
export const isValidYear = (s) => {
  const n = Number(s);
  return /^\d{4}$/.test(String(s)) && n >= MIN_YEAR && n <= MAX_YEAR;
};
export const validMonth = (s) => /^\d{1,2}$/.test(String(s)) && Number(s) >= 1 && Number(s) <= 12;

// «Today» is the server's: the list without a date is today in Damascus (API
// doc §13.1), so a browser in another zone must not default to its own day.
export const todayInDamascus = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Damascus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export const defaultRecordFilters = (now = new Date()) => {
  const today = todayInDamascus(now);
  return {
    mode: "day",
    date: today,
    from: "",
    to: "",
    month: String(Number(today.slice(5, 7))),
    year: today.slice(0, 4),
    type: "",
    missing_checkout: "",
    is_corrected: "",
    rejected: "",
    rejection_reason: "",
    employee_id: "",
    department_id: "",
    search: "",
    sort: "",
  };
};

/**
 * The filters as buildRecordsParams should see them: only the active date
 * fields, and the rejection reason only while its control is shown (a reason
 * left over from «مرفوض» would otherwise keep filtering invisibly).
 */
export const toQueryFilters = (f) => {
  const { mode, date, from, to, month, year, rejection_reason, ...rest } = f;
  const out = { ...rest };
  // The department box falls back to a free number input (no departments.view),
  // and the params builder only trims: an invalid id is simply not sent, so it
  // can never become a 422 that a retry cannot cure. The control keeps the text.
  for (const key of ["employee_id", "department_id"]) {
    if (!isPositiveId(out[key])) out[key] = "";
  }
  if (f.rejected === "1") out.rejection_reason = rejection_reason;
  if (mode === "range") return { ...out, from, to };
  if (mode === "month") return { ...out, month, year };
  return { ...out, date };
};

/**
 * Why the current date cannot be asked for, as Arabic text — or null. The list
 * is NOT fetched while this is non-null: the builder silently drops half a
 * range (or an empty date) and the server would then answer with TODAY's rows
 * under a filter that says otherwise.
 */
export const dateProblem = (f) => {
  if (f.mode === "range") {
    if (!isDate(f.from) || !isDate(f.to)) return "حدّد تاريخ البداية وتاريخ النهاية.";
    if (f.to < f.from) return "تاريخ النهاية يجب أن يكون مساوياً أو بعد تاريخ البداية.";
    return null;
  }
  if (f.mode === "month") {
    if (!validMonth(f.month)) return "الشهر غير صحيح.";
    if (!isValidYear(f.year)) return "السنة غير صحيحة.";
    return null;
  }
  if (!isDate(f.date)) return "حدّد اليوم.";
  return null;
};

const TRI = ["0", "1"];

/**
 * Filters from the URL's query string over the defaults. Every value is checked:
 * a hand-edited or stale link falls back to the default for that field rather
 * than becoming a 422 or an unknown control state. A range with only one end is
 * kept (it is shown with its inline message); only values that cannot even be a
 * date are dropped.
 */
export const filtersFromSearch = (get, defaults) => {
  const out = { ...defaults };
  const pick = (key, ok) => {
    const v = get(key);
    if (v != null && v !== "" && ok(v)) out[key] = v;
  };
  pick("mode", (v) => MODE_VALUES.includes(v));
  pick("date", isDate);
  pick("from", isDate);
  pick("to", isDate);
  pick("month", validMonth);
  pick("year", isValidYear);
  pick("type", (v) => ["1", "2"].includes(v));
  for (const key of ["missing_checkout", "is_corrected", "rejected"]) {
    pick(key, (v) => TRI.includes(v));
  }
  pick("rejection_reason", (v) => ["1", "2", "3"].includes(v));
  pick("employee_id", isPositiveId);
  pick("department_id", isPositiveId);
  pick("sort", (v) =>
    RECORDS_SORT_KEYS.includes(v.startsWith("-") ? v.slice(1) : v)
  );
  const search = get("search");
  if (search) out.search = search.slice(0, MAX_SEARCH);
  return out;
};

/** The page from the URL: a positive integer, else 1. */
export const pageFromSearch = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
};
