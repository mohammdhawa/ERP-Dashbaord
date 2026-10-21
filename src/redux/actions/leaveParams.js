// Every leave query and multipart payload, in one pure module (API doc §16).
//
// Kept free of any import that touches `import.meta` so `npm test` runs it
// under plain Node, like auditParams.js. A wrong parameter here is either a 422
// or a correct-looking page of the wrong rows — on the register, a quietly
// wrong window is a wrong headcount of who was away.
import { capSearch, isPositiveId, isRealDate } from "../../utils/filterValues.js";

// Bare sort keys; the server also accepts each with a leading `-` (descending).
export const REGISTER_SORT_KEYS = Object.freeze([
  "start_date",
  "end_date",
  "requested_days",
  "created_at",
  "employee_name",
  "id",
]);
export const MY_LEAVE_SORT_KEYS = Object.freeze([
  "created_at",
  "start_date",
  "end_date",
  "requested_days",
  "status",
  "decided_at",
  "id",
]);
export const ON_LEAVE_SORT_KEYS = Object.freeze([
  "start_date",
  "end_date",
  "employee_name",
]);
export const BALANCE_SORT_KEYS = Object.freeze([
  "employee_name",
  "employee_number",
]);

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png"];

// Multi-selects hold arrays; a URL seed produces a comma string. Both go over
// the wire as CSV (same idiom as auditParams.js).
const csvParam = (value) => {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  const cleaned = list.map((v) => String(v).trim()).filter((v) => v !== "");
  return cleaned.length ? cleaned.join(",") : "";
};

const textParam = (value) => String(value ?? "").trim();

// An integer or nothing: "" / NaN / junk are omitted rather than sent blank.
const intParam = (value) => {
  if (textParam(value) === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

// `is_excuse` goes as "0"/"1" strings; "" means "no filter" and is omitted.
const flagParam = (value) => {
  if (value === true || value === 1 || value === "1") return "1";
  if (value === false || value === 0 || value === "0") return "0";
  return "";
};

// Unknown sorts are a 422 server-side, so they are dropped and the server's
// own default applies.
const sortParam = (sort, keys) => {
  const s = textParam(sort);
  const bare = s.startsWith("-") ? s.slice(1) : s;
  return keys.includes(bare) ? s : "";
};

// status/type/excuse, shared by the register and "my leave".
const addCommon = (params, f) => {
  const statuses = csvParam(f.statuses);
  if (statuses) params.statuses = statuses;
  const types = csvParam(f.leave_type_ids);
  if (types) params.leave_type_ids = types;
  const excuse = flagParam(f.is_excuse);
  if (excuse) params.is_excuse = excuse;
};

// An id the server would refuse (0, -3, 1.5, "007"…) is not sent: it would be
// a 422 that a retry cannot cure. The search is capped at the server's 100.
const addEmployeeScope = (params, f) => {
  const employee = textParam(f.employee_id);
  if (isPositiveId(employee)) params.employee_id = employee;
  const department = textParam(f.department_id);
  if (isPositiveId(department)) params.department_id = department;
  const search = capSearch(f.search);
  if (search !== "") params.search = search;
};

/**
 * GET /leave/requests (§16.8). The window, by precedence:
 *   1. `from` AND `to`, full dates — half a range is a 422, so a lone one is
 *      dropped, not forwarded;
 *   2. `month` (with `year`, or this year — hence `now`);
 *   3. `year` alone;
 *   4. nothing: the server's current month.
 * `now` exists only so tests are deterministic.
 */
export const buildRegisterParams = (page, perPage, f = {}, now = new Date()) => {
  const params = { page, per_page: perPage };

  const from = textParam(f.from);
  const to = textParam(f.to);
  const month = intParam(f.month);
  const year = intParam(f.year);

  if (from && to) {
    params.from = from;
    params.to = to;
  } else if (month !== null && month >= 1 && month <= 12) {
    params.month = month;
    params.year = year ?? now.getFullYear();
  } else if (year !== null) {
    params.year = year;
  }

  addCommon(params, f);
  addEmployeeScope(params, f);
  const sort = sortParam(f.sort, REGISTER_SORT_KEYS);
  if (sort) params.sort = sort;
  return params;
};

/**
 * GET /leave/on-leave (§16.9): one day (the server's today without one), the
 * type(s), request or excuse, and the person filters. `date` is sent only as a
 * real day — a half-typed one would be a 422.
 */
export const buildOnLeaveParams = (page, perPage, f = {}) => {
  const params = { page, per_page: perPage };
  const date = textParam(f.date);
  if (isRealDate(date)) params.date = date;
  const types = csvParam(f.leave_type_ids);
  if (types) params.leave_type_ids = types;
  const excuse = flagParam(f.is_excuse);
  if (excuse) params.is_excuse = excuse;
  addEmployeeScope(params, f);
  const sort = sortParam(f.sort, ON_LEAVE_SORT_KEYS);
  if (sort) params.sort = sort;
  return params;
};

/** GET /me/leave-requests (§16.3): status, type, start year, excuse flag. */
export const buildMyLeaveParams = (page, perPage, f = {}) => {
  const params = { page, per_page: perPage };
  const year = intParam(f.year);
  addCommon(params, f);
  if (year !== null) params.year = year;
  const sort = sortParam(f.sort, MY_LEAVE_SORT_KEYS);
  if (sort) params.sort = sort;
  return params;
};

/** GET /leave/balances (§16.2). */
export const buildBalancesParams = (page, perPage, f = {}) => {
  const params = { page, per_page: perPage };
  const year = intParam(f.year);
  if (year !== null) params.year = year;
  addEmployeeScope(params, f);
  const sort = sortParam(f.sort, BALANCE_SORT_KEYS);
  if (sort) params.sort = sort;
  return params;
};

/**
 * multipart body for POST /me/leave-requests. Empties are omitted, never sent
 * blank: an empty `reason` is not "no reason" to every validator.
 */
export const buildLeaveRequestForm = (values = {}) => {
  const form = new FormData();
  form.append("leave_type_id", textParam(values.leave_type_id));
  form.append("start_date", textParam(values.start_date));
  form.append("end_date", textParam(values.end_date));
  const reason = textParam(values.reason);
  if (reason !== "") form.append("reason", reason);
  (values.attachments ?? []).forEach((file) => form.append("attachments[]", file));
  return form;
};

const hasAllowedType = (file) => {
  if (file.type) return ALLOWED_MIME.includes(file.type);
  // Some browsers leave `type` empty; fall back to the extension.
  const name = String(file.name ?? "").toLowerCase();
  return ALLOWED_EXT.some((ext) => name.endsWith(ext));
};

/**
 * Client-side mirror of the server's attachment rules (§16.3), so the user
 * hears about it before the upload. Returns the first problem as Arabic text,
 * or null.
 */
export const validateAttachments = (files, { required = false } = {}) => {
  const list = Array.from(files ?? []);
  if (list.length > MAX_ATTACHMENTS) return "يمكن إرفاق 5 ملفات كحد أقصى.";
  if (list.some((f) => !hasAllowedType(f))) return "الملفات المسموحة: PDF أو JPG أو PNG.";
  if (list.some((f) => f.size > MAX_ATTACHMENT_BYTES))
    return "حجم الملف يجب ألا يتجاوز 10 ميغابايت.";
  if (required && list.length === 0) return "نوع الإجازة يتطلب إرفاق مستند.";
  return null;
};

/**
 * multipart body for POST /leave/excuses (§16.5): the request's fields plus
 * `employee_id`, and `force` only when true. Multipart carries strings, and
 * Laravel's boolean rule accepts "1".
 */
export const buildExcuseForm = (values = {}, { force = false } = {}) => {
  const form = buildLeaveRequestForm(values);
  form.append("employee_id", textParam(values.employee_id));
  if (force) form.append("force", "1");
  return form;
};

/**
 * The server's refusal of an excuse that ends after today (§16.5, 2026-10-20,
 * parity audit S-5): an excuse justifies an absence that happened; today is
 * allowed. `today` is the Damascus day (todayInDamascus). Null when fine, or
 * when `endDate` is not a date yet (the required rule speaks for that).
 */
export const EXCUSE_IN_FUTURE = "لا يمكن تسجيل عذر لأيام لم تأتِ بعد.";
export const excuseEndProblem = (endDate, today) =>
  isRealDate(textParam(endDate)) &&
  isRealDate(textParam(today)) &&
  textParam(endDate) > textParam(today)
    ? EXCUSE_IN_FUTURE
    : null;

/**
 * True for the one 422 the user may override: a deducting excuse past the
 * balance. `parsed` is what parseApiError returns ({ status, message, errors }).
 *
 * API GAP: the server gives this refusal no `errors` key and no code — the
 * only marker is the message text «… أرسل force لتسجيله رغم ذلك.», so the
 * match is on «أرسل force» (not the bare word, which any English message could
 * contain). If the wording is ever changed the override prompt silently stops
 * appearing. (The other refusal, an accepted check-in on one of the days, is
 * never forceable and does not contain the phrase.)
 */
export const isForceableExcuseRefusal = (parsed) =>
  parsed?.status === 422 &&
  typeof parsed.message === "string" &&
  parsed.message.includes("أرسل force");
