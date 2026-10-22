import test from "node:test";
import assert from "node:assert/strict";
import {
  balancesFiltersFromSearch,
  defaultBalanceFilters,
} from "./balancesFilters.js";

const NOW = new Date(2026, 9, 19);
const from = (qs) => {
  const sp = new URLSearchParams(qs);
  return balancesFiltersFromSearch((k) => sp.get(k), defaultBalanceFilters(NOW));
};

test("defaults: this year, nothing else", () => {
  assert.deepEqual(defaultBalanceFilters(NOW), {
    year: "2026",
    employee_id: "",
    department_id: "",
    search: "",
    sort: "",
  });
});

test("URL: valid values are kept", () => {
  const f = from("year=2025&employee_id=7&department_id=2&search=ali&sort=-employee_number");
  assert.deepEqual(f, {
    year: "2025",
    employee_id: "7",
    department_id: "2",
    search: "ali",
    sort: "-employee_number",
  });
});

test("URL: junk falls back to the defaults", () => {
  const f = from("year=20&employee_id=0&department_id=1.5&sort=salary");
  assert.deepEqual(f, defaultBalanceFilters(NOW));
  assert.equal(from("year=2101").year, "2026");
  assert.equal(from("sort=-id").sort, "");
});

test("URL: the search is at most 100 characters", () => {
  assert.equal(from(`search=${"x".repeat(150)}`).search.length, 100);
});
