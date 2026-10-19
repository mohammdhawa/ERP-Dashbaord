import test from "node:test";
import assert from "node:assert/strict";
import {
  dateProblem,
  defaultRecordFilters,
  filtersFromSearch,
  pageFromSearch,
  toQueryFilters,
  todayInDamascus,
} from "./recordFilters.js";
import { buildRecordsParams } from "../../redux/actions/attendanceParams.js";

const NOW = new Date("2026-10-19T12:00:00Z");
const from = (qs, now = NOW) => {
  const p = new URLSearchParams(qs);
  return filtersFromSearch((k) => p.get(k), defaultRecordFilters(now));
};

test("today is read on the server clock (Damascus), not the browser one", () => {
  // 22:30 UTC on the 19th is already the 20th in Damascus (UTC+3).
  assert.equal(todayInDamascus(new Date("2026-10-19T22:30:00Z")), "2026-10-20");
  assert.equal(todayInDamascus(NOW), "2026-10-19");
});

test("defaults: day mode, today", () => {
  const f = defaultRecordFilters(NOW);
  assert.equal(f.mode, "day");
  assert.equal(f.date, "2026-10-19");
  assert.equal(f.month, "10");
  assert.equal(f.year, "2026");
  assert.equal(dateProblem(f), null);
});

test("day mode asks for the date only, even with a stale range", () => {
  const f = { ...defaultRecordFilters(NOW), from: "2026-01-01", to: "2026-02-01" };
  const p = buildRecordsParams(1, 15, toQueryFilters(f), NOW);
  assert.equal(p.date, "2026-10-19");
  assert.equal(p.from, undefined);
  assert.equal(p.month, undefined);
});

test("range and month modes send only their own fields", () => {
  const base = defaultRecordFilters(NOW);
  const range = buildRecordsParams(
    1,
    15,
    toQueryFilters({ ...base, mode: "range", from: "2026-05-01", to: "2026-05-09" }),
    NOW
  );
  assert.equal(range.from, "2026-05-01");
  assert.equal(range.date, undefined);
  assert.equal(range.month, undefined);
  const month = buildRecordsParams(1, 15, toQueryFilters({ ...base, mode: "month" }), NOW);
  assert.equal(month.month, 10);
  assert.equal(month.year, 2026);
  assert.equal(month.date, undefined);
});

test("a half range, an inverted range and an empty day are problems", () => {
  const base = { ...defaultRecordFilters(NOW), mode: "range" };
  assert.match(dateProblem({ ...base, from: "2026-05-01" }), /حدّد/);
  assert.ok(dateProblem({ ...base, from: "2026-05-09", to: "2026-05-01" }));
  assert.equal(dateProblem({ ...base, from: "2026-05-01", to: "2026-05-01" }), null);
  assert.ok(dateProblem({ ...defaultRecordFilters(NOW), date: "" }));
});

test("month mode needs a real month and a year in 2000-2100", () => {
  const base = { ...defaultRecordFilters(NOW), mode: "month" };
  assert.equal(dateProblem(base), null);
  assert.ok(dateProblem({ ...base, month: "13" }));
  assert.ok(dateProblem({ ...base, year: "20" }));
  assert.ok(dateProblem({ ...base, year: "2101" }));
  assert.equal(dateProblem({ ...base, year: "2000" }), null);
});

test("the rejection reason filters only while rejected=1 is chosen", () => {
  const base = { ...defaultRecordFilters(NOW), rejection_reason: "2" };
  assert.equal(buildRecordsParams(1, 15, toQueryFilters(base), NOW).rejection_reason, undefined);
  const rejected = { ...base, rejected: "1" };
  assert.equal(buildRecordsParams(1, 15, toQueryFilters(rejected), NOW).rejection_reason, 2);
});

test("URL: an unknown mode or junk values fall back to the defaults", () => {
  const f = from(
    "mode=week&date=2026-02-31&type=9&rejected=yes&month=13&year=1999&sort=bogus&employee_id=abc"
  );
  assert.deepEqual(f, defaultRecordFilters(NOW));
});

test("URL: valid values are kept; search is cut to 100", () => {
  const f = from(
    `mode=range&from=2026-05-01&to=2026-05-09&type=2&missing_checkout=1&rejected=0&sort=-recorded_at&employee_id=7&department_id=3&search=${"ب".repeat(150)}`
  );
  assert.equal(f.mode, "range");
  assert.equal(f.from, "2026-05-01");
  assert.equal(f.type, "2");
  assert.equal(f.missing_checkout, "1");
  assert.equal(f.rejected, "0");
  assert.equal(f.sort, "-recorded_at");
  assert.equal(f.employee_id, "7");
  assert.equal(f.search.length, 100);
});

test("URL: a range with one end stays, and shows its message", () => {
  const f = from("mode=range&from=2026-05-01");
  assert.equal(f.mode, "range");
  assert.ok(dateProblem(f));
});

test("page from the URL is a positive integer", () => {
  assert.equal(pageFromSearch("3"), 3);
  assert.equal(pageFromSearch("0"), 1);
  assert.equal(pageFromSearch("-2"), 1);
  assert.equal(pageFromSearch("abc"), 1);
  assert.equal(pageFromSearch(null), 1);
});

test("a typed department id that the server would refuse is not sent", () => {
  const base = defaultRecordFilters(NOW);
  for (const bad of ["0", "-3", "1.5", "1e2", "007", "123456789012"]) {
    const p = buildRecordsParams(
      1,
      15,
      toQueryFilters({ ...base, department_id: bad, employee_id: bad }),
      NOW
    );
    assert.equal(p.department_id, undefined, bad);
    assert.equal(p.employee_id, undefined, bad);
  }
  const ok = buildRecordsParams(
    1,
    15,
    toQueryFilters({ ...base, department_id: "12", employee_id: "7" }),
    NOW
  );
  assert.equal(ok.department_id, "12");
  assert.equal(ok.employee_id, "7");
});

test("URL: employee_id=0, department_id=0 and over-long ids are dropped", () => {
  const f = from("employee_id=0&department_id=0");
  assert.equal(f.employee_id, "");
  assert.equal(f.department_id, "");
  assert.equal(from("employee_id=007&department_id=123456789012").employee_id, "");
  assert.equal(from("department_id=12").department_id, "12");
});
