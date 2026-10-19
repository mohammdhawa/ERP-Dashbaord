import test from "node:test";
import assert from "node:assert/strict";
import { MAX_SEARCH, capSearch, isPositiveId } from "./filterValues.js";

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
