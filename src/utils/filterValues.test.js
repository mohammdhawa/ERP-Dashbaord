import test from "node:test";
import assert from "node:assert/strict";
import { MAX_SEARCH, capSearch, isPositiveId, isRealDate } from "./filterValues.js";

test("an id filter is a positive integer of at most 9 digits", () => {
  for (const ok of ["1", "7", "123456789", 7]) assert.equal(isPositiveId(ok), true, ok);
  // "007" is rejected rather than normalised to 7.
  for (const bad of ["0", "-3", "1.5", "1e2", "007", "123456789012", "", " 7", "abc", null, undefined]) {
    assert.equal(isPositiveId(bad), false, String(bad));
  }
});

test("search is trimmed and capped at the server's 100", () => {
  assert.equal(MAX_SEARCH, 100);
  assert.equal(capSearch("  أحمد "), "أحمد");
  assert.equal(capSearch("x".repeat(150)).length, 100);
  assert.equal(capSearch(null), "");
});

test("a date filter is a real calendar day", () => {
  for (const ok of ["2026-10-20", "2024-02-29"]) assert.equal(isRealDate(ok), true, ok);
  for (const bad of ["2026-02-31", "2026-13-01", "2026-1-5", "20261020", "", null, undefined]) {
    assert.equal(isRealDate(bad), false, String(bad));
  }
});
