// The leave register's filter state, kept apart from the screen so the rules
// that decide WHICH window is asked for can be tested under plain Node.
//
// The screen holds one flat object of strings (so it round-trips through the
// URL). The params builder (leaveParams.js) picks a window by precedence —
// from+to, then month, then year — so the UI's window MODE has to decide which
// of those fields reach it at all: a stale `month` left over from before the
// user switched to a date range must not win over an unfinished one.
import { REGISTER_SORT_KEYS } from "../../redux/actions/leaveParams.js";
import { MAX_SEARCH, isPositiveId } from "../../utils/filterValues.js";

export const WINDOW_MODES = [
  { value: "month", label: "الشهر" },
  { value: "range", label: "الفترة" },
  { value: "year", label: "السنة" },
];

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
// Inclusive, as the server counts it (LeaveRegisterRequest::MAX_RANGE_DAYS).
export const MAX_RANGE_DAYS = 366;

// Approved only — the server's own default, shown as the chip it really is.
export const DEFAULT_STATUSES = "2";

export const defaultRegisterFilters = (now = new Date()) => ({
  mode: "month",
  month: String(now.getMonth() + 1),
  year: String(now.getFullYear()),
  from: "",
  to: "",
  statuses: DEFAULT_STATUSES,
  leave_type_ids: "",
  is_excuse: "",
  employee_id: "",
  department_id: "",
  search: "",
  sort: "",
});

/** The filters as buildRegisterParams should see them: only the active window. */
export const toQueryFilters = (f) => {
  const { mode, month, year, from, to, ...rest } = f;
  if (mode === "range") return { ...rest, from, to };
  if (mode === "year") return { ...rest, year };
  return { ...rest, month, year };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
// UTC midnights, so a daylight-saving shift never makes a day 23 or 25 hours.
const dayNumber = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};

/**
 * Why the current window cannot be asked for, as Arabic text — or null when it
 * can. The register is NOT fetched while this is non-null: half a range would
 * be dropped by the params builder and answer for the wrong window, and a span
 * over 366 days is a 422.
 */
export const windowProblem = (f) => {
  if (f.mode === "range") {
    if (!isDate(f.from) || !isDate(f.to)) return "حدّد تاريخ البداية وتاريخ النهاية.";
    if (f.to < f.from) return "تاريخ النهاية يجب أن يكون مساوياً أو بعد تاريخ البداية.";
    if (dayNumber(f.to) - dayNumber(f.from) + 1 > MAX_RANGE_DAYS)
      return `الفترة تتجاوز الحد الأقصى (${MAX_RANGE_DAYS} يوماً).`;
    return null;
  }
  const year = Number(f.year);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR)
    return "السنة غير صحيحة.";
  if (f.mode === "month") {
    const month = Number(f.month);
    if (!Number.isInteger(month) || month < 1 || month > 12)
      return "الشهر غير صحيح.";
  }
  return null;
};

// A real calendar day: 2026-02-31 and 2026-13-45 pass a shape check but are a
// 422 server-side.
const isRealDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};
export const isValidYear = (s) =>
  /^\d{4}$/.test(String(s)) && Number(s) >= MIN_YEAR && Number(s) <= MAX_YEAR;

// The members of a CSV that satisfy `ok`; "" when none do.
const csvOf = (value, ok) =>
  String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(ok)
    .join(",");

const STATUS_VALUES = ["1", "2", "3", "4"];
const MODE_VALUES = WINDOW_MODES.map((m) => m.value);

/**
 * Filters from the URL's query string over the defaults. Every value is checked:
 * a hand-edited or stale link falls back to the default for that field rather
 * than becoming a 422 (there is no retry that would cure one) or an unknown
 * control state. A range with only one end is kept — the screen shows its
 * inline message — only values that cannot even be a date are dropped.
 */
export const registerFiltersFromSearch = (get, defaults) => {
  const out = { ...defaults };
  const pick = (key, ok) => {
    const v = get(key);
    if (v != null && v !== "" && ok(v)) out[key] = v;
  };
  // A list keeps its valid members; none left means the default stays.
  const pickList = (key, ok) => {
    const v = get(key);
    if (v == null || v === "") return;
    const kept = csvOf(v, ok);
    if (kept !== "") out[key] = kept;
  };
  pick("mode", (v) => MODE_VALUES.includes(v));
  pick("month", (v) => /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 12);
  pick("year", isValidYear);
  pick("from", isRealDate);
  pick("to", isRealDate);
  pickList("statuses", (v) => STATUS_VALUES.includes(v));
  pickList("leave_type_ids", isPositiveId);
  pick("is_excuse", (v) => ["0", "1"].includes(v));
  pick("employee_id", isPositiveId);
  pick("department_id", isPositiveId);
  pick("sort", (v) =>
    REGISTER_SORT_KEYS.includes(v.startsWith("-") ? v.slice(1) : v)
  );
  const search = get("search");
  if (search) out.search = search.slice(0, MAX_SEARCH);
  return out;
};
