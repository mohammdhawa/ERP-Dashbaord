import test from "node:test";
import assert from "node:assert/strict";
import {
  RANGE_TOO_LONG,
  defaultMonthlyFilters,
  employeeAttendanceLink,
  formatHours,
  monthlyFiltersFromSearch,
  monthlyProblem,
  toMonthlyQuery,
} from "./monthlyFilters.js";
import { buildMonthlyParams } from "../../redux/actions/attendanceParams.js";

const NOW = new Date("2026-10-19T12:00:00Z");
const D = defaultMonthlyFilters(NOW);
const from = (qs) => {
  const p = new URLSearchParams(qs);
  return monthlyFiltersFromSearch((k) => p.get(k), D);
};

test("defaults to this month in Damascus", () => {
  assert.equal(D.mode, "month");
  assert.equal(D.month, "10");
  assert.equal(D.year, "2026");
  // 22:30Z on the 31st is already November in Damascus.
  const late = defaultMonthlyFilters(new Date("2026-10-31T22:30:00Z"));
  assert.equal(late.month, "11");
});

test("a valid URL is read back", () => {
  const f = from(
    "mode=range&from=2026-06-01&to=2026-06-30&has_absences=1&has_missing_checkouts=1&employee_id=7&department_id=3&search=ali&sort=-absent_days"
  );
  assert.equal(f.mode, "range");
  assert.equal(f.from, "2026-06-01");
  assert.equal(f.to, "2026-06-30");
  assert.equal(f.has_absences, "1");
  assert.equal(f.has_missing_checkouts, "1");
  assert.equal(f.employee_id, "7");
  assert.equal(f.department_id, "3");
  assert.equal(f.search, "ali");
  assert.equal(f.sort, "-absent_days");
});

test("bad values fall back to the defaults", () => {
  const f = from(
    "mode=day&month=13&year=1999&from=2026-02-31&to=x&has_absences=0&employee_id=0&department_id=1e2&sort=status"
  );
  assert.deepEqual(f, D);
});

test("search is cut to 100 characters", () => {
  assert.equal(from(`search=${"a".repeat(150)}`).search.length, 100);
});

test("month mode sends month+year, range mode from+to, never both", () => {
  const month = toMonthlyQuery({ ...D, from: "2026-01-01", to: "2026-01-05" });
  assert.deepEqual(buildMonthlyParams(month, NOW), { month: 10, year: 2026 });
  const range = toMonthlyQuery({
    ...D,
    mode: "range",
    from: "2026-06-01",
    to: "2026-06-30",
    has_absences: "1",
  });
  assert.deepEqual(buildMonthlyParams(range, NOW), {
    from: "2026-06-01",
    to: "2026-06-30",
    has_absences: "1",
  });
});

test("an id that is not a positive integer is withheld", () => {
  const q = toMonthlyQuery({ ...D, employee_id: "abc", department_id: "007" });
  assert.equal(q.employee_id, "");
  assert.equal(q.department_id, "");
});

test("a range needs both dates, in order, and at most 92 days", () => {
  const r = (f, t) => monthlyProblem({ ...D, mode: "range", from: f, to: t });
  assert.match(r("", "2026-06-30"), /حدّد/);
  assert.match(r("2026-06-30", "2026-06-01"), /مساوياً/);
  assert.equal(r("2026-01-01", "2026-04-02"), null); // 92 days inclusive
  assert.equal(r("2026-01-01", "2026-04-03"), RANGE_TOO_LONG); // 93
  assert.equal(RANGE_TOO_LONG, "الفترة لا يجب أن تتجاوز 92 يوماً.");
});

test("a month needs a valid month and a year in 2000-2100", () => {
  assert.equal(monthlyProblem(D), null);
  assert.ok(monthlyProblem({ ...D, month: "13" }));
  assert.ok(monthlyProblem({ ...D, year: "1999" }));
  assert.ok(monthlyProblem({ ...D, year: "2" }));
});

test("hours read like the server's rows", () => {
  assert.equal(formatHours(15.5), "15h 30m");
  assert.equal(formatHours(0), "0h 0m");
  assert.equal(formatHours(1.9999), "2h 0m");
  assert.equal(formatHours(null), "0h 0m");
  assert.equal(formatHours("x"), "");
});

test("the profile link carries the server's window", () => {
  assert.equal(
    employeeAttendanceLink("/", 7, "2026-06-01", "2026-06-30"),
    "/hr/employees/7?tab=attendance&from=2026-06-01&to=2026-06-30"
  );
});
