import test from "node:test";
import assert from "node:assert/strict";
import { isPastDate } from "./schedulingDates.js";

test("past is judged on the Damascus date, not the browser's", () => {
  const lateUtc = new Date("2026-11-14T21:30:00Z"); // already the 15th in Damascus
  assert.equal(isPastDate("2026-11-14", lateUtc), true);
  assert.equal(isPastDate("2026-11-15", lateUtc), false);
  assert.equal(isPastDate("2026-11-14", new Date("2026-11-14T09:00:00Z")), false);
});
