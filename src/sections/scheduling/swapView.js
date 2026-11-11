// HR's duty-exchanges screen state (API doc §19.8), kept apart from the screen
// so what a hand-edited URL may mean, and when an exchange may still be
// cancelled, are testable under plain Node.
import { isPositiveId, isRealDate } from "../../utils/filterValues.js";

export const SWAP_STATUSES = ["1", "2", "3", "4", "5"];

export const SWAP_STATUS_OPTIONS = [
  { value: "1", label: "قيد الاعتماد" },
  { value: "2", label: "معتمد" },
  { value: "3", label: "مرفوض" },
  { value: "4", label: "مسحوب" },
  { value: "5", label: "ملغى من الموارد البشرية" },
];

export const MAX_SWAP_WINDOW_DAYS = 92;
export const STATUS_APPROVED = 2;
export const STATUS_CANCELLED_BY_HR = 5;

const DAY_MS = 86400000;
const toUtc = (date) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/**
 * HR may cancel an approved exchange until the EARLIER of its two duties opens
 * — which may be the partner's. ISO strings carry +03:00, so they are compared
 * as instants, never as text.
 */
export const canCancelSwap = (swap, now = new Date()) => {
  if (!swap || swap.status !== STATUS_APPROVED) return false;
  const starts = [swap.requester_duty?.starts_at, swap.partner_duty?.starts_at].map((s) =>
    Date.parse(s)
  );
  if (starts.some((t) => Number.isNaN(t))) return false;
  return Math.min(...starts) > now.getTime();
};

export const defaultSwapFilters = () => ({
  status: "",
  employee_id: "",
  from: "",
  to: "",
});

const windowIsValid = (from, to) =>
  isRealDate(from) &&
  isRealDate(to) &&
  from <= to &&
  (toUtc(to) - toUtc(from)) / DAY_MS + 1 <= MAX_SWAP_WINDOW_DAYS;

/** Filters from the URL over the defaults; a bad value falls back, never 422s. */
export const swapFiltersFromSearch = (get, defaults) => {
  const out = { ...defaults };
  const status = get("status");
  if (status != null && SWAP_STATUSES.includes(status)) out.status = status;
  const employee = get("employee_id");
  if (employee != null && isPositiveId(employee)) out.employee_id = employee;
  const from = get("from");
  const to = get("to");
  if (windowIsValid(from, to)) {
    out.from = from;
    out.to = to;
  }
  return out;
};

/** Why the typed window is not asked for, as Arabic text — or null. */
export const swapWindowProblem = (f) => {
  if (f.from === "" && f.to === "") return null;
  if (f.from === "" || f.to === "") return "حدّد تاريخ البداية وتاريخ النهاية معاً.";
  if (!windowIsValid(f.from, f.to))
    return `الفترة يجب أن تبدأ قبل نهايتها وألّا تتجاوز ${MAX_SWAP_WINDOW_DAYS} يوماً.`;
  return null;
};

export const toSwapParams = (f, page, perPage) => {
  const params = { page, per_page: perPage };
  if (SWAP_STATUSES.includes(f.status)) params.status = f.status;
  if (isPositiveId(f.employee_id)) params.employee_id = f.employee_id;
  if (windowIsValid(f.from, f.to)) {
    params.from = f.from;
    params.to = f.to;
  }
  return params;
};

/**
 * A duty's span with dates and times, read straight from the ISO text (it
 * carries +03:00, so no timezone conversion): «11-17 08:00 → 11-20 08:00»,
 * or «11-17 08:00 → 18:00» when it ends the same day.
 */
export const dutySpanText = (startsAt, endsAt) => {
  if (!startsAt || !endsAt) return "";
  const start = `${startsAt.slice(5, 10)} ${startsAt.slice(11, 16)}`;
  const sameDay = startsAt.slice(0, 10) === endsAt.slice(0, 10);
  const end = sameDay ? endsAt.slice(11, 16) : `${endsAt.slice(5, 10)} ${endsAt.slice(11, 16)}`;
  return `${start} → ${end}`;
};
