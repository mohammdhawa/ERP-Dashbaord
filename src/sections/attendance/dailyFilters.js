// The daily board's filter state (API doc §14.1), kept apart from the screen so
// what a hand-edited URL may mean is testable under plain Node.
//
// One flat object of strings, so it round-trips through the URL. Everything
// read back is validated: a bad date falls back to today and a bad id or sort
// is dropped, rather than becoming a 422 on a report that has no retry that
// would cure it.
import { DAILY_SORT_KEYS } from "../../redux/actions/attendanceParams.js";
import {
  isDate,
  todayInDamascus,
} from "./recordFilters.js";
import { MAX_SEARCH, isPositiveId } from "../../utils/filterValues.js";

export const defaultDailyFilters = (now = new Date()) => ({
  date: todayInDamascus(now),
  employee_id: "",
  department_id: "",
  search: "",
  sort: "",
});

// `sortKeys` lets another one-day list (absent-today) read the same shape with
// its own sort vocabulary; a key the server would 422 on is dropped.
export const dailyFiltersFromSearch = (
  get,
  defaults,
  sortKeys = DAILY_SORT_KEYS
) => {
  const out = { ...defaults };
  const pick = (key, ok) => {
    const v = get(key);
    if (v != null && v !== "" && ok(v)) out[key] = v;
  };
  pick("date", isDate);
  pick("employee_id", isPositiveId);
  pick("department_id", isPositiveId);
  pick("sort", (v) => sortKeys.includes(v.startsWith("-") ? v.slice(1) : v));
  const search = get("search");
  if (search) out.search = search.slice(0, MAX_SEARCH);
  return out;
};

/**
 * The filters as buildDailyParams should see them. The department box falls
 * back to a free number input (no departments.view) and the builder only
 * trims, so an id that is not a positive integer is withheld here; the control
 * keeps the text. An empty/invalid date is the screen's problem (dateIsValid),
 * not sent — the server would answer with today under a date that says otherwise.
 */
export const toDailyQuery = (f) => {
  const out = { ...f };
  for (const key of ["employee_id", "department_id"]) {
    if (!isPositiveId(out[key])) out[key] = "";
  }
  return out;
};

export const dateIsValid = (f) => isDate(f.date);
