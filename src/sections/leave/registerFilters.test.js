import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultRegisterFilters,
  registerFiltersFromSearch,
  toQueryFilters,
  windowProblem,
} from "./registerFilters.js";
import { buildRegisterParams } from "../../redux/actions/leaveParams.js";

const NOW = new Date(2026, 9, 19); // 19 Oct 2026

test("defaults: this month, approved only", () => {
  const f = defaultRegisterFilters(NOW);
  assert.equal(f.mode, "month");
  assert.equal(f.month, "10");
  assert.equal(f.year, "2026");
  assert.equal(f.statuses, "2");
});

test("month mode asks for month+year even with a stale range typed", () => {
  const f = { ...defaultRegisterFilters(NOW), from: "2026-01-01", to: "2026-02-01" };
  const p = buildRegisterParams(1, 15, toQueryFilters(f), NOW);
  assert.equal(p.month, 10);
  assert.equal(p.year, 2026);
  assert.equal(p.from, undefined);
});

test("range mode sends only from/to, year mode only the year", () => {
  const base = defaultRegisterFilters(NOW);
  const range = buildRegisterParams(
    1,
    15,
    toQueryFilters({ ...base, mode: "range", from: "2026-05-28", to: "2026-06-03" }),
    NOW
  );
  assert.equal(range.from, "2026-05-28");
  assert.equal(range.month, undefined);
  const year = buildRegisterParams(1, 15, toQueryFilters({ ...base, mode: "year" }), NOW);
  assert.equal(year.year, 2026);
  assert.equal(year.month, undefined);
});

test("a half-typed range is a problem, not a silent fallback", () => {
  const f = { ...defaultRegisterFilters(NOW), mode: "range", from: "2026-05-01" };
  assert.match(windowProblem(f), /حدّد/);
});

test("inverted range is a problem", () => {
  const f = { ...defaultRegisterFilters(NOW), mode: "range", from: "2026-06-03", to: "2026-05-28" };
  assert.ok(windowProblem(f));
});

test("366 days inclusive is allowed, 367 is not", () => {
  const base = { ...defaultRegisterFilters(NOW), mode: "range" };
  // 2026-01-01 .. 2027-01-01 is 366 days inclusive.
  assert.equal(windowProblem({ ...base, from: "2026-01-01", to: "2027-01-01" }), null);
  assert.match(
    windowProblem({ ...base, from: "2026-01-01", to: "2027-01-02" }),
    /الحد الأقصى/
  );
});

test("a single day and a valid month/year have no problem; a bad year does", () => {
  const base = defaultRegisterFilters(NOW);
  assert.equal(windowProblem({ ...base, mode: "range", from: "2026-05-01", to: "2026-05-01" }), null);
  assert.equal(windowProblem(base), null);
  assert.ok(windowProblem({ ...base, year: "20" }));
  assert.ok(windowProblem({ ...base, month: "13" }));
});

// --- what a hand-edited URL may mean ----------------------------------------

const from = (qs) => {
  const sp = new URLSearchParams(qs);
  return registerFiltersFromSearch((k) => sp.get(k), defaultRegisterFilters(NOW));
};

test("URL: valid values are kept", () => {
  const f = from(
    "mode=range&from=2026-05-28&to=2026-06-03&statuses=1,2&leave_type_ids=3,4&is_excuse=1&employee_id=7&department_id=2&search=%D8%A3%D8%AD%D9%85%D8%AF&sort=-start_date&month=6&year=2025"
  );
  assert.equal(f.mode, "range");
  assert.equal(f.from, "2026-05-28");
  assert.equal(f.to, "2026-06-03");
  assert.equal(f.statuses, "1,2");
  assert.equal(f.leave_type_ids, "3,4");
  assert.equal(f.is_excuse, "1");
  assert.equal(f.employee_id, "7");
  assert.equal(f.department_id, "2");
  assert.equal(f.search, "أحمد");
  assert.equal(f.sort, "-start_date");
  assert.equal(f.month, "6");
  assert.equal(f.year, "2025");
});

test("URL: junk falls back to the defaults", () => {
  const d = defaultRegisterFilters(NOW);
  const f = from(
    "mode=week&from=2026-13-45&to=soon&statuses=9,x&leave_type_ids=0,-1&is_excuse=2&employee_id=0&department_id=1.5&sort=salary&month=13&year=20"
  );
  assert.deepEqual(f, d);
});

test("URL: statuses and types keep only their valid members", () => {
  assert.equal(from("statuses=2,9,3").statuses, "2,3");
  assert.equal(from("leave_type_ids=5,abc,6").leave_type_ids, "5,6");
  // Nothing valid left: the default, never an empty or invented filter.
  assert.equal(from("statuses=0,5").statuses, "2");
  assert.equal(from("leave_type_ids=x").leave_type_ids, "");
});

test("URL: the year is 2000..2100 and the search at most 100", () => {
  assert.equal(from("year=1999").year, "2026");
  assert.equal(from("year=2101").year, "2026");
  assert.equal(from("year=2000").year, "2000");
  assert.equal(from(`search=${"x".repeat(150)}`).search.length, 100);
});
