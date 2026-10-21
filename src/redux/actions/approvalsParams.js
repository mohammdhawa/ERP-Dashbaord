// Pure query-string builders for the two approval lists: the approver's inbox
// (API doc §15.2) and HR's list of every approval (§15.7). Kept free of
// imports that touch import.meta (the api module) so node --test can load it.
//
// Both lists take the same filters (backend ApprovalFilters, 2026-10-20): the
// requester's name or staff number, their current unit, the leave's type, the
// leave's dates (an overlap), and the day the request was filed. Every value is
// checked here: an unknown sort, a bad id or a half-typed date is a 422 that no
// retry would cure, so it is dropped and the server's own default applies.
import {
  capSearch,
  isPositiveId,
  isRealDate,
} from "../../utils/filterValues.js";

export const INBOX_TABS = ["pending", "decided"];

// Bare sort keys; the server also accepts each with a leading `-`.
export const INBOX_SORT_KEYS = Object.freeze(["submitted_at", "employee_name"]);
export const LIST_SORT_KEYS = Object.freeze([
  "submitted_at",
  "decided_at",
  "employee_name",
]);

// The approval's own status (§15.1): 1 pending · 2 approved · 3 rejected ·
// 4 cancelled (withdrawn by the requester).
export const APPROVAL_STATUSES = Object.freeze(["1", "2", "3", "4"]);

const DATE_KEYS = ["date_from", "date_to", "submitted_from", "submitted_to"];

const textParam = (value) => String(value ?? "").trim();

// The members of a list (a CSV string or an array) that satisfy `ok`, as CSV.
const csvOf = (value, ok) =>
  (Array.isArray(value) ? value : String(value ?? "").split(","))
    .map((v) => String(v).trim())
    .filter(ok)
    .join(",");

const sortParam = (sort, keys) => {
  const s = textParam(sort);
  const bare = s.startsWith("-") ? s.slice(1) : s;
  return keys.includes(bare) ? s : "";
};

// The filters both lists share. A one-ended date range is fine (the server
// reads a missing end as open); an inverted one is the screen's problem
// (approvalFiltersProblem) and never reaches this builder's caller's fetch.
const addFilters = (params, f) => {
  const search = capSearch(f.search);
  if (search !== "") params.search = search;
  const department = textParam(f.department_id);
  if (isPositiveId(department)) params.department_id = department;
  const types = csvOf(f.leave_type_ids, isPositiveId);
  if (types) params.leave_type_ids = types;
  for (const key of DATE_KEYS) {
    const value = textParam(f[key]);
    if (isRealDate(value)) params[key] = value;
  }
};

/**
 * GET /me/approvals (§15.2). `?status=decided` lists what the caller already
 * decided. Pending is the DEFAULT and has no status value — any other value is
 * a 422 — so an unknown tab also falls back to the plain page.
 */
export const buildInboxParams = (tab, page, perPage, f = {}) => {
  const params = { page, per_page: perPage };
  if (tab === "decided") params.status = "decided";
  addFilters(params, f);
  const sort = sortParam(f.sort, INBOX_SORT_KEYS);
  if (sort) params.sort = sort;
  return params;
};

/**
 * GET /approvals (§15.7) — every status unless `statuses` narrows it.
 */
export const buildApprovalListParams = (page, perPage, f = {}) => {
  const params = { page, per_page: perPage };
  const statuses = csvOf(f.statuses, (v) => APPROVAL_STATUSES.includes(v));
  if (statuses) params.statuses = statuses;
  addFilters(params, f);
  const sort = sortParam(f.sort, LIST_SORT_KEYS);
  if (sort) params.sort = sort;
  return params;
};
