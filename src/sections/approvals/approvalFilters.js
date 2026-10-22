// The filter state of the two approval lists — the inbox (API doc §15.2) and
// «كل الطلبات» (§15.7) — kept apart from the screens so what a hand-edited
// link may mean is testable under plain Node.
//
// One flat object of strings, so it round-trips through the URL. Every value
// read back is checked: a stale or hand-edited link falls back to the default
// for that field rather than becoming a 422 or an unknown control state.
import {
  APPROVAL_STATUSES,
  INBOX_SORT_KEYS,
} from "../../redux/actions/approvalsParams.js";
import {
  MAX_SEARCH,
  isPositiveId,
  isRealDate,
} from "../../utils/filterValues.js";

export const defaultApprovalFilters = () => ({
  search: "",
  department_id: "",
  leave_type_ids: "",
  date_from: "",
  date_to: "",
  submitted_from: "",
  submitted_to: "",
  sort: "",
});

// «كل الطلبات» shows every status by default — the server's own default — so
// an empty `statuses` is "all", not "nothing".
export const defaultListFilters = () => ({
  ...defaultApprovalFilters(),
  statuses: "",
});

const csvOf = (value, ok) =>
  String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(ok)
    .join(",");

/**
 * Filters from the URL's query string over `defaults`. Only the keys the
 * defaults name are read, so the inbox never picks up a `statuses` it cannot
 * send. `sortKeys` is the list's own sort vocabulary.
 */
export const approvalFiltersFromSearch = (
  get,
  defaults,
  sortKeys = INBOX_SORT_KEYS
) => {
  const out = { ...defaults };
  const pick = (key, ok) => {
    if (!(key in defaults)) return;
    const v = get(key);
    if (v != null && v !== "" && ok(v)) out[key] = v;
  };
  const pickList = (key, ok) => {
    if (!(key in defaults)) return;
    const v = get(key);
    if (v == null || v === "") return;
    const kept = csvOf(v, ok);
    if (kept !== "") out[key] = kept;
  };
  pick("department_id", isPositiveId);
  pickList("leave_type_ids", isPositiveId);
  pickList("statuses", (v) => APPROVAL_STATUSES.includes(v));
  for (const key of [
    "date_from",
    "date_to",
    "submitted_from",
    "submitted_to",
  ]) {
    pick(key, isRealDate);
  }
  pick("sort", (v) => sortKeys.includes(v.startsWith("-") ? v.slice(1) : v));
  const search = get("search");
  if (search) out.search = search.slice(0, MAX_SEARCH);
  return out;
};

/**
 * Why the filters cannot be asked for, as Arabic text — or null. An inverted
 * range is a 422 server-side (`after_or_equal`), so the list is not fetched
 * while it stands; the message sits beside the inputs that caused it.
 */
export const approvalFiltersProblem = (f) => {
  if (
    isRealDate(f.date_from) &&
    isRealDate(f.date_to) &&
    f.date_to < f.date_from
  )
    return "تاريخ نهاية الإجازة يجب أن يكون مساوياً لتاريخ البداية أو بعده.";
  if (
    isRealDate(f.submitted_from) &&
    isRealDate(f.submitted_to) &&
    f.submitted_to < f.submitted_from
  )
    return "تاريخ التقديم (إلى) يجب أن يكون مساوياً لتاريخ التقديم (من) أو بعده.";
  return null;
};

/** True when any filter differs from its default. */
export const hasAnyApprovalFilter = (f, defaults) =>
  Object.keys(defaults).some((key) => f[key] !== defaults[key]);
