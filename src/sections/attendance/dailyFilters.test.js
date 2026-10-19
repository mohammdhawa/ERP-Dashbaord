import test from "node:test";
import assert from "node:assert/strict";
import {
  dailyFiltersFromSearch,
  dateIsValid,
  defaultDailyFilters,
  toDailyQuery,
} from "./dailyFilters.js";
import {
  ABSENT_SORT_KEYS,
  buildDailyParams,
} from "../../redux/actions/attendanceParams.js";

const NOW = new Date("2026-10-19T12:00:00Z");
const from = (qs) => {
  const p = new URLSearchParams(qs);
  return dailyFiltersFromSearch((k) => p.get(k), defaultDailyFilters(NOW));
};

test("defaults to today in Damascus", () => {
  assert.equal(defaultDailyFilters(NOW).date, "2026-10-19");
  assert.equal(
    defaultDailyFilters(new Date("2026-10-19T22:30:00Z")).date,
    "2026-10-20"
  );
});

test("a valid URL is read back", () => {
  const f = from("date=2026-05-02&employee_id=7&department_id=3&search=ali&sort=-work_hours");
  assert.deepEqual(f, {
    date: "2026-05-02",
    employee_id: "7",
    department_id: "3",
    search: "ali",
    sort: "-work_hours",
  });
});

test("an invalid date falls back to today; bad ids and sorts are dropped", () => {
  const f = from("date=2026-02-31&employee_id=0&department_id=1e2&sort=bogus");
  assert.equal(f.date, "2026-10-19");
  assert.equal(f.employee_id, "");
  assert.equal(f.department_id, "");
  assert.equal(f.sort, "");
  assert.equal(from("date=tomorrow").date, "2026-10-19");
});

test("search is cut to 100 characters", () => {
  assert.equal(from(`search=${"x".repeat(150)}`).search.length, 100);
});

test("an id typed into the fallback box that is not valid is never sent", () => {
  const f = { ...defaultDailyFilters(NOW), department_id: "-3", employee_id: "007" };
  assert.equal(dateIsValid(f), true);
  const params = buildDailyParams(toDailyQuery(f));
  assert.equal(params.department_id, undefined);
  assert.equal(params.employee_id, undefined);
  assert.equal(params.date, "2026-10-19");
});

test("a cleared date is a problem, not a request", () => {
  assert.equal(dateIsValid({ ...defaultDailyFilters(NOW), date: "" }), false);
});

test("another one-day list reads the URL through its own sort vocabulary", () => {
  const read = (qs) => {
    const p = new URLSearchParams(qs);
    return dailyFiltersFromSearch(
      (k) => p.get(k),
      defaultDailyFilters(NOW),
      ABSENT_SORT_KEYS
    );
  };
  assert.equal(read("sort=-employee_number").sort, "-employee_number");
  assert.equal(read("sort=employee_name").sort, "employee_name");
  // Valid on the daily board, a 422 on absent-today: dropped.
  assert.equal(read("sort=work_hours").sort, "");
  // ...and the other way round on the board itself.
  assert.equal(from("sort=employee_number").sort, "");
});
