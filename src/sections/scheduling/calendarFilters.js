// The calendar's filter state (API doc §19.5), kept apart from the screen so
// what a hand-edited URL may mean is testable under plain Node.
import { todayInDamascus } from "../attendance/recordFilters.js";
import { MAX_SEARCH, isPositiveId, isRealDate } from "../../utils/filterValues.js";

export const CALENDAR_DEFAULT_DAYS = 14;
export const CALENDAR_PER_PAGE = 25;
export const MAX_WINDOW_DAYS = 92;

const DAY_MS = 86400000;
const toUtc = (date) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms) => new Date(ms).toISOString().slice(0, 10);
const addDays = (date, n) => fromUtc(toUtc(date) + n * DAY_MS);

export const defaultCalendarFilters = (now = new Date()) => {
  const today = todayInDamascus(now);
  return {
    from: today,
    to: addDays(today, CALENDAR_DEFAULT_DAYS - 1),
    department_id: "",
    employee_id: "",
    search: "",
  };
};

// «هذا الأسبوع» runs Saturday to Friday, the week the schedules are shown in.
export const presetWindow = (kind, now = new Date()) => {
  const today = todayInDamascus(now);
  if (kind === "month") {
    const [y, m] = today.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: `${today.slice(0, 8)}01`, to: `${today.slice(0, 8)}${String(last).padStart(2, "0")}` };
  }
  const weekday = new Date(toUtc(today)).getUTCDay(); // 0 Sunday … 6 Saturday
  const sinceSaturday = (weekday + 1) % 7;
  const from = addDays(today, -sinceSaturday);
  return { from, to: addDays(from, 6) };
};

export const windowDates = (from, to) => {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

export const calendarWindowIsValid = (from, to) =>
  isRealDate(from) &&
  isRealDate(to) &&
  from <= to &&
  (toUtc(to) - toUtc(from)) / DAY_MS + 1 <= MAX_WINDOW_DAYS;

export const calendarFiltersFromSearch = (get, defaults) => {
  const out = { ...defaults };
  const from = get("from");
  const to = get("to");
  if (calendarWindowIsValid(from, to)) {
    out.from = from;
    out.to = to;
  }
  for (const key of ["department_id", "employee_id"]) {
    const v = get(key);
    if (v != null && isPositiveId(v)) out[key] = v;
  }
  const search = get("search");
  if (search) out.search = search.slice(0, MAX_SEARCH);
  return out;
};

export const toCalendarParams = (f, page) => {
  const params = { from: f.from, to: f.to, page, per_page: CALENDAR_PER_PAGE };
  if (isPositiveId(f.department_id)) params.department_id = f.department_id;
  if (isPositiveId(f.employee_id)) params.employee_id = f.employee_id;
  const search = String(f.search ?? "").trim();
  if (search) params.search = search;
  return params;
};

