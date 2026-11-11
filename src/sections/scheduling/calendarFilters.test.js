import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarFiltersFromSearch,
  defaultCalendarFilters,
  presetWindow,
  toCalendarParams,
  windowDates,
} from "./calendarFilters.js";

const NOW = new Date("2026-11-14T21:30:00Z");
const from = (qs) => {
  const p = new URLSearchParams(qs);
  return calendarFiltersFromSearch((k) => p.get(k), defaultCalendarFilters(NOW));
};

test("the default window is 14 days from today in Damascus", () => {
  const f = defaultCalendarFilters(NOW);
  assert.equal(f.from, "2026-11-15");
  assert.equal(f.to, "2026-11-28");
  assert.deepEqual([f.department_id, f.employee_id, f.search], ["", "", ""]);
});

test("presets: Saturday-to-Friday week and the calendar month", () => {
  const wed = new Date("2026-11-18T09:00:00Z");
  assert.deepEqual(presetWindow("week", wed), { from: "2026-11-14", to: "2026-11-20" });
  assert.deepEqual(presetWindow("month", wed), { from: "2026-11-01", to: "2026-11-30" });
});

test("a valid URL is read back", () => {
  const f = from("from=2026-11-01&to=2026-11-10&department_id=3&employee_id=7&search=ali");
  assert.deepEqual(f, {
    from: "2026-11-01",
    to: "2026-11-10",
    department_id: "3",
    employee_id: "7",
    search: "ali",
  });
});

test("a bad window falls back to both default dates", () => {
  for (const qs of [
    "from=2026-01-01&to=2026-04-04",
    "from=2026-01-01&to=2026-04-03",
    "from=2026-11-10&to=2026-11-01",
    "from=2026-02-30&to=2026-03-05",
    "from=2026-11-01",
  ]) {
    const f = from(qs);
    assert.equal(f.from, "2026-11-15", qs);
    assert.equal(f.to, "2026-11-28", qs);
  }
});

test("92 days is accepted, 93 is not", () => {
  const ok = from("from=2026-01-01&to=2026-04-02");
  assert.deepEqual([ok.from, ok.to], ["2026-01-01", "2026-04-02"]);
  const bad = from("from=2026-01-01&to=2026-04-03");
  assert.deepEqual([bad.from, bad.to], ["2026-11-15", "2026-11-28"]);
});

test("bad ids are dropped and search is cut to 100", () => {
  assert.equal(from("department_id=0").department_id, "");
  assert.equal(from(`search=${"x".repeat(150)}`).search.length, 100);
});

test("toCalendarParams omits empty values", () => {
  const params = toCalendarParams({ ...defaultCalendarFilters(NOW), search: "" }, 2);
  assert.equal("search" in params, false);
  assert.equal("department_id" in params, false);
  assert.equal(params.per_page, 25);
  assert.equal(params.page, 2);
  const full = toCalendarParams({ ...defaultCalendarFilters(NOW), department_id: "4", search: "a" }, 1);
  assert.equal(full.department_id, "4");
  assert.equal(full.search, "a");
});

test("windowDates is inclusive across a month end", () => {
  assert.deepEqual(windowDates("2026-11-29", "2026-12-02"), [
    "2026-11-29",
    "2026-11-30",
    "2026-12-01",
    "2026-12-02",
  ]);
});
