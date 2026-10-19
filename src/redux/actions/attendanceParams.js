// Every attendance query and payload, in one pure module (API doc §12.3, §13,
// §14).
//
// Kept free of any import that touches `import.meta` so `npm test` runs it
// under plain Node, like leaveParams.js. A wrong parameter here is a 422 or a
// correct-looking report of the wrong window — on attendance that is a wrong
// headcount of who was present.
import { hasPermission } from "../../data/permissionsCatalog.js";
import { MAX_SEARCH } from "../../utils/filterValues.js";

// Bare sort keys; the server also accepts each with a leading `-` (descending).
export const RECORDS_SORT_KEYS = Object.freeze([
  "recorded_at",
  "date",
  "type",
  "status",
  "work_hours",
  "created_at",
  "rejected_at",
  "id",
  "employee_name",
  "employee_number",
]);
export const DAILY_SORT_KEYS = Object.freeze([
  "employee_name",
  "department",
  "status",
  "check_in_time",
  "check_out_time",
  "work_hours",
]);
export const MONTHLY_SORT_KEYS = Object.freeze([
  "employee_name",
  "department",
  "expected_days",
  "present_days",
  "on_leave_days",
  "excused_days",
  "excused_deducted_days",
  "excused_not_deducted_days",
  "absent_days",
  "rejected_days",
  "missing_checkouts",
  "total_work_hours",
  "attendance_rate",
]);
export const GRID_SORT_KEYS = Object.freeze(["date", "status", "work_hours"]);
export const ABSENT_SORT_KEYS = Object.freeze(["employee_name", "employee_number"]);

const MAX_NOTE = 500;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TYPES = [1, 2];
const REJECTION_REASONS = [1, 2, 3];
const DAY_STATES = [1, 2, 3, 4, 5, 6, 7, 8];
const REASON_REQUIRING_NOTE = 3;

const textParam = (value) => String(value ?? "").trim();

// An integer or nothing: "" / NaN / junk are omitted rather than sent blank.
const intParam = (value) => {
  if (textParam(value) === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

// An integer that must be one of `allowed`, else nothing (the server would 422).
const enumParam = (value, allowed) => {
  const n = intParam(value);
  return n !== null && allowed.includes(n) ? n : null;
};

// Tri-state: "" means "no filter" and is omitted; otherwise "1" / "0".
const flagParam = (value) => {
  if (value === true || value === 1 || value === "1") return "1";
  if (value === false || value === 0 || value === "0") return "0";
  return "";
};

// A filter that only ever narrows: true is "1", anything else is not sent.
const onlyWhenTrue = (value) =>
  value === true || value === 1 || value === "1" ? "1" : "";

// Unknown sorts are a 422 server-side, so they are dropped and the server's
// own default applies.
const sortParam = (sort, keys) => {
  const s = textParam(sort);
  const bare = s.startsWith("-") ? s.slice(1) : s;
  return keys.includes(bare) ? s : "";
};

// Employee / unit / name-or-number, shared by the records list and all four
// reports (§14 "The person filters").
const addPeople = (params, f) => {
  if (textParam(f.employee_id) !== "") params.employee_id = textParam(f.employee_id);
  if (textParam(f.department_id) !== "")
    params.department_id = textParam(f.department_id);
  const search = textParam(f.search).slice(0, MAX_SEARCH);
  if (search !== "") params.search = search;
};

const addSort = (params, f, keys) => {
  const sort = sortParam(f.sort, keys);
  if (sort) params.sort = sort;
};

const validMonth = (month) => month !== null && month >= 1 && month <= 12;

// The window of a range report (monthly, employee grid): `from` AND `to`, or
// `month` with `year` (this year by default — hence `now`). Half a range is a
// 422, so a lone one is dropped; a bare `year` means nothing to a report.
const addRange = (params, f, now) => {
  const from = textParam(f.from);
  const to = textParam(f.to);
  const month = intParam(f.month);
  if (from && to) {
    params.from = from;
    params.to = to;
  } else if (validMonth(month)) {
    params.month = month;
    params.year = intParam(f.year) ?? now.getFullYear();
  }
};

/**
 * GET /attendance/records (§13.1). The date, by the server's precedence:
 *   1. `date`;
 *   2. `from` AND `to`;
 *   3. `month` (with `year`, or this year — hence `now`);
 *   4. `year` alone;
 *   5. nothing: the server lists today.
 * Then the record filters and the person filters. `now` exists only so tests
 * are deterministic.
 */
export const buildRecordsParams = (page, perPage, f = {}, now = new Date()) => {
  const params = { page, per_page: perPage };

  const date = textParam(f.date);
  const from = textParam(f.from);
  const to = textParam(f.to);
  const month = intParam(f.month);
  const year = intParam(f.year);

  if (date) {
    params.date = date;
  } else if (from && to) {
    params.from = from;
    params.to = to;
  } else if (validMonth(month)) {
    params.month = month;
    params.year = year ?? now.getFullYear();
  } else if (year !== null) {
    params.year = year;
  }

  const type = enumParam(f.type, TYPES);
  if (type !== null) params.type = type;
  for (const key of ["missing_checkout", "is_corrected", "rejected"]) {
    const flag = flagParam(f[key]);
    if (flag) params[key] = flag;
  }
  const reason = enumParam(f.rejection_reason, REJECTION_REASONS);
  if (reason !== null) params.rejection_reason = reason;

  addPeople(params, f);
  addSort(params, f, RECORDS_SORT_KEYS);
  return params;
};

/** GET /attendance/report (§14.1): one day (the server's default is today). */
export const buildDailyParams = (f = {}) => {
  const params = {};
  const date = textParam(f.date);
  if (date) params.date = date;
  addPeople(params, f);
  addSort(params, f, DAILY_SORT_KEYS);
  return params;
};

/** GET /attendance/report/monthly (§14.2). Not paged: totals cover every row. */
export const buildMonthlyParams = (f = {}, now = new Date()) => {
  const params = {};
  addRange(params, f, now);
  const absences = onlyWhenTrue(f.has_absences);
  if (absences) params.has_absences = absences;
  const missing = onlyWhenTrue(f.has_missing_checkouts);
  if (missing) params.has_missing_checkouts = missing;
  addPeople(params, f);
  addSort(params, f, MONTHLY_SORT_KEYS);
  return params;
};

/** GET /attendance/report/employee (§14.3): `employee_id` is always required. */
export const buildEmployeeGridParams = (employeeId, f = {}, now = new Date()) => {
  const params = { employee_id: employeeId };
  addRange(params, f, now);
  const status = enumParam(f.status, DAY_STATES);
  if (status !== null) params.status = status;
  const workingOnly = onlyWhenTrue(f.working_days_only);
  if (workingOnly) params.working_days_only = workingOnly;
  addSort(params, f, GRID_SORT_KEYS);
  return params;
};

/** GET /attendance/absent-today (§14.4): paged, one day. */
export const buildAbsentParams = (page, perPage, f = {}) => {
  const params = { page, per_page: perPage };
  const date = textParam(f.date);
  if (date) params.date = date;
  addPeople(params, f);
  addSort(params, f, ABSENT_SORT_KEYS);
  return params;
};

/**
 * True when from..to spans more days than the reports allow (92, inclusive of
 * both ends). Computed on UTC dates so a timezone or DST shift cannot move the
 * answer by a day. Missing/invalid dates are "not too long" — the server's
 * required/date rules speak for those.
 */
export const rangeTooLong = (from, to, maxDays = 92) => {
  const start = Date.parse(`${textParam(from)}T00:00:00Z`);
  const end = Date.parse(`${textParam(to)}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return Math.round((end - start) / MS_PER_DAY) + 1 > maxDays;
};

/**
 * Client-side mirror of PATCH /attendance/records/{id}/reject (§13.4):
 * `reason` required, `note` required with reason 3, at most 500 characters.
 * Returns the problems keyed by field; empty means valid.
 */
export const validateReject = ({ reason, note } = {}) => {
  const errors = {};
  const reasonValue = intParam(reason);
  const noteText = textParam(note);
  if (reasonValue === null) {
    errors.reason = "يجب اختيار سبب الرفض.";
  } else if (reasonValue === REASON_REQUIRING_NOTE && noteText === "") {
    errors.note = "الملاحظة مطلوبة عند اختيار هذا السبب.";
  }
  if (!errors.note && noteText.length > MAX_NOTE) {
    errors.note = "الملاحظة يجب ألا تتجاوز 500 حرف.";
  }
  return errors;
};

/**
 * Body of PATCH /attendance/records/{id}/checkout (§13.3). Every stored time is
 * Damascus (API doc §1, +03:00), so the HR user's wall-clock entry is written
 * with that offset — never the browser's. `note` only when there is one.
 */
export const buildCheckoutCorrection = ({ date, time, note } = {}) => {
  const body = { checked_out_at: `${textParam(date)}T${textParam(time)}:00+03:00` };
  const text = textParam(note);
  if (text !== "") body.note = text;
  return body;
};

/**
 * What a day of the employee grid offers (§14.3), for the caller's permissions:
 *   correct     — a missing check-out with a check-in to correct (§13.3);
 *   excuse      — an absent or refused day HR may excuse (a refused check-in is
 *                 not attendance, so the day is still an absence to excuse);
 *   undoExcuse  — an excused day whose excuse is a leave request HR may delete.
 * The state is checked as well as the permission: the server refuses an action
 * on the wrong state, so the button should not be offered.
 */
export const gridDayActions = (day, permissions) => {
  const status = day?.status;
  const excuse = day?.excuse;
  return {
    correct:
      status === 3 &&
      Boolean(day.check_in_id) &&
      hasPermission(permissions, "attendance.records.correct"),
    excuse:
      (status === 6 || status === 8) &&
      hasPermission(permissions, "leave.excuses.create"),
    undoExcuse:
      status === 5 &&
      Boolean(excuse?.is_excuse && excuse.leave_request_id) &&
      hasPermission(permissions, "leave.excuses.delete"),
  };
};
