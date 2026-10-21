import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultOnLeaveFilters,
  onLeaveFiltersFromSearch,
} from "./onLeaveFilters.js";

const NOW = new Date("2026-10-19T22:30:00Z"); // already the 20th in Damascus
const from = (query) => (key) => new URLSearchParams(query).get(key);

test("the day defaults to today in Damascus, every type and source", () => {
  assert.deepEqual(defaultOnLeaveFilters(NOW), {
    date: "2026-10-20",
    employee_id: "",
    department_id: "",
    search: "",
    sort: "",
    leave_type_ids: "",
    is_excuse: "",
  });
});

test("a good link is read back whole", () => {
  const f = onLeaveFiltersFromSearch(
    from(
      "date=2026-06-21&leave_type_ids=2,5&is_excuse=0&department_id=3&search=سامي&sort=-end_date"
    ),
    defaultOnLeaveFilters(NOW)
  );
  assert.equal(f.date, "2026-06-21");
  assert.equal(f.leave_type_ids, "2,5");
  assert.equal(f.is_excuse, "0");
  assert.equal(f.department_id, "3");
  assert.equal(f.search, "سامي");
  assert.equal(f.sort, "-end_date");
});

test("a hand-edited link falls back field by field", () => {
  const f = onLeaveFiltersFromSearch(
    from("date=2026-02-31&leave_type_ids=x&is_excuse=2&sort=check_in_time"),
    defaultOnLeaveFilters(NOW)
  );
  assert.deepEqual(f, defaultOnLeaveFilters(NOW));
});
