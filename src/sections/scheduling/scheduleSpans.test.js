import test from "node:test";
import assert from "node:assert/strict";
import {
  boundsOfMonth,
  canDeleteSpan,
  canEndSpan,
  monthOf,
  shiftMonth,
} from "./scheduleSpans.js";

// 2026-11-10 12:00 UTC is 2026-11-10 in Damascus.
const NOW = new Date("2026-11-10T12:00:00Z");

test("a started, unended span can be ended or shortened", () => {
  assert.equal(canEndSpan({ from_date: "2026-10-01", to_date: null }, NOW), true);
  assert.equal(canEndSpan({ from_date: "2026-10-01", to_date: "2026-11-20" }, NOW), true);
  assert.equal(canEndSpan({ from_date: "2026-10-01", to_date: "2026-11-10" }, NOW), true);
  assert.equal(canEndSpan({ from_date: "2026-11-10", to_date: null }, NOW), true);
});

test("an ended or not-yet-started span cannot be ended", () => {
  assert.equal(canEndSpan({ from_date: "2026-10-01", to_date: "2026-11-09" }, NOW), false);
  assert.equal(canEndSpan({ from_date: "2026-11-11", to_date: null }, NOW), false);
});

test("ending is judged on the Damascus day", () => {
  // 22:30 UTC on the 10th is already the 11th in Damascus.
  const late = new Date("2026-11-10T22:30:00Z");
  assert.equal(canEndSpan({ from_date: "2026-10-01", to_date: "2026-11-10" }, late), false);
  assert.equal(canEndSpan({ from_date: "2026-11-11", to_date: null }, late), true);
});

test("only a span starting after today (Damascus) can be deleted", () => {
  assert.equal(canDeleteSpan({ from_date: "2026-11-11" }, NOW), true);
  assert.equal(canDeleteSpan({ from_date: "2026-11-10" }, NOW), false);
  assert.equal(canDeleteSpan({ from_date: "2026-10-01" }, NOW), false);
  // 22:30 UTC on the 10th is already the 11th in Damascus.
  const late = new Date("2026-11-10T22:30:00Z");
  assert.equal(canDeleteSpan({ from_date: "2026-11-11" }, late), false);
});

test("month bounds and stepping", () => {
  assert.deepEqual(boundsOfMonth("2026-02"), { from: "2026-02-01", to: "2026-02-28" });
  assert.deepEqual(boundsOfMonth("2026-11"), { from: "2026-11-01", to: "2026-11-30" });
  assert.equal(boundsOfMonth("2026-13"), null);
  assert.equal(boundsOfMonth(""), null);
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(monthOf("2026-11-10"), "2026-11");
});
