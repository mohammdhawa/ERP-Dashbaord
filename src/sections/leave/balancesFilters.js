// The balances screen's filter state (API doc §16.2), kept apart from the screen
// so what a hand-edited URL may mean is testable under plain Node.
//
// One flat object of strings so it round-trips through the URL. Everything read
// back is checked: a bad year, id or sort falls back to the default rather than
// becoming a 422 on a list whose retry would not cure it.
import { BALANCE_SORT_KEYS } from "../../redux/actions/leaveParams.js";
import { MAX_SEARCH, isPositiveId } from "../../utils/filterValues.js";
import { isValidYear } from "./registerFilters.js";

// The year the server answers for when none is sent; the screen shows it as
// the default so the field never reads as "no year".
export const currentYear = (now = new Date()) => String(now.getFullYear());

export const defaultBalanceFilters = (now = new Date()) => ({
  year: currentYear(now),
  employee_id: "",
  department_id: "",
  search: "",
  sort: "",
});

export const balancesFiltersFromSearch = (get, defaults) => {
  const out = { ...defaults };
  const pick = (key, ok) => {
    const v = get(key);
    if (v != null && v !== "" && ok(v)) out[key] = v;
  };
  pick("year", isValidYear);
  pick("employee_id", isPositiveId);
  pick("department_id", isPositiveId);
  pick("sort", (v) =>
    BALANCE_SORT_KEYS.includes(v.startsWith("-") ? v.slice(1) : v)
  );
  const search = get("search");
  if (search) out.search = search.slice(0, MAX_SEARCH);
  return out;
};
