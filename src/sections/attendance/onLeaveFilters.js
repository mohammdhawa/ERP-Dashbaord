// «في إجازة اليوم»'s filter state (API doc §16.9), kept apart from the screen
// so what a hand-edited URL may mean is testable under plain Node.
//
// The daily board's shape (one day, the person filters, a sort) plus the
// leave's type(s) and whether it is an HR excuse or the employee's request.
import { ON_LEAVE_SORT_KEYS } from "../../redux/actions/leaveParams.js";
import { isPositiveId } from "../../utils/filterValues.js";
import { dailyFiltersFromSearch, defaultDailyFilters } from "./dailyFilters.js";

export const defaultOnLeaveFilters = (now = new Date()) => ({
  ...defaultDailyFilters(now),
  leave_type_ids: "",
  is_excuse: "",
});

export const onLeaveFiltersFromSearch = (get, defaults) => {
  const out = dailyFiltersFromSearch(get, defaults, ON_LEAVE_SORT_KEYS);
  const types = String(get("leave_type_ids") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(isPositiveId)
    .join(",");
  if (types !== "") out.leave_type_ids = types;
  const excuse = get("is_excuse");
  if (excuse === "0" || excuse === "1") out.is_excuse = excuse;
  return out;
};
