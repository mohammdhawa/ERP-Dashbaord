import test from "node:test";
import assert from "node:assert/strict";
import {
  WEEKDAY_NAMES,
  defaultGridFilters,
  gridProblem,
  initialTabFromQuery,
  monthBoundsInDamascus,
  windowFromQuery,
} from "./employeeGridFilters.js";
import { buildEmployeeGridParams } from "../../redux/actions/attendanceParams.js";

const NOW = new Date("2026-10-19T12:00:00Z");

test("this month in Damascus: first to last day", () => {
  assert.deepEqual(monthBoundsInDamascus(NOW), { from: "2026-10-01", to: "2026-10-31" });
  // 22:30Z on the 31st is already November 1st in Damascus.
  assert.deepEqual(monthBoundsInDamascus(new Date("2026-10-31T22:30:00Z")), {
    from: "2026-11-01",
    to: "2026-11-30",
  });
  // A leap February ends on the 29th.
  assert.equal(monthBoundsInDamascus(new Date("2028-02-10T12:00:00Z")).to, "2028-02-29");
  assert.equal(monthBoundsInDamascus(new Date("2026-12-10T12:00:00Z")).to, "2026-12-31");
});

test("defaults: this month, no day filters, no sort", () => {
  assert.deepEqual(defaultGridFilters(NOW), {
    from: "2026-10-01",
    to: "2026-10-31",
    status: "",
    working_days_only: "",
    sort: "",
  });
});

test("a given window replaces the default one", () => {
  const f = defaultGridFilters(NOW, { from: "2026-06-01", to: "2026-06-30" });
  assert.equal(f.from, "2026-06-01");
  assert.equal(f.to, "2026-06-30");
});

test("a window from the URL needs both ends, valid, in order, within 92 days", () => {
  assert.deepEqual(windowFromQuery("2026-06-01", "2026-06-30"), {
    from: "2026-06-01",
    to: "2026-06-30",
  });
  // A future end is valid: it is the last day of this month.
  assert.ok(windowFromQuery("2026-10-01", "2026-12-31"));
  assert.equal(windowFromQuery("2026-06-01", null), null);
  assert.equal(windowFromQuery("", "2026-06-30"), null);
  assert.equal(windowFromQuery("2026-02-31", "2026-03-05"), null);
  assert.equal(windowFromQuery("2026-06-30", "2026-06-01"), null);
  assert.equal(windowFromQuery("junk", "2026-06-01"), null);
  // 92 days inclusive is the limit.
  assert.ok(windowFromQuery("2026-06-01", "2026-08-31"));
  assert.equal(windowFromQuery("2026-06-01", "2026-09-01"), null);
});

test("gridProblem blocks a missing, inverted or over-long window", () => {
  assert.equal(gridProblem({ from: "2026-10-01", to: "2026-10-31" }), null);
  assert.ok(gridProblem({ from: "", to: "2026-10-31" }));
  assert.ok(gridProblem({ from: "2026-10-01", to: "" }));
  assert.ok(gridProblem({ from: "2026-10-31", to: "2026-10-01" }));
  assert.ok(gridProblem({ from: "2026-01-01", to: "2026-12-31" }));
  assert.equal(gridProblem({ from: "2026-10-05", to: "2026-10-05" }), null);
});

test("the tab from the URL is used only when this user has it", () => {
  const keys = ["overview", "attendance"];
  assert.equal(initialTabFromQuery("attendance", keys), "attendance");
  assert.equal(initialTabFromQuery("audit", keys), "overview");
  assert.equal(initialTabFromQuery(null, keys), "overview");
  assert.equal(initialTabFromQuery("", keys), "overview");
  assert.equal(initialTabFromQuery("attendance", ["overview"]), "overview");
});

test("the filters build the grid query for an employee", () => {
  const f = { ...defaultGridFilters(NOW), status: "6", working_days_only: "1", sort: "-date" };
  assert.deepEqual(buildEmployeeGridParams(7, f, NOW), {
    employee_id: 7,
    from: "2026-10-01",
    to: "2026-10-31",
    status: 6,
    working_days_only: "1",
    sort: "-date",
  });
});

test("weekday names run Sunday to Saturday", () => {
  assert.equal(WEEKDAY_NAMES.length, 7);
  assert.equal(WEEKDAY_NAMES[0], "الأحد");
  assert.equal(WEEKDAY_NAMES[6], "السبت");
});
