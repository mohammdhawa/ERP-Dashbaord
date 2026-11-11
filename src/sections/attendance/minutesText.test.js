import test from "node:test";
import assert from "node:assert/strict";
import { formatMinutes } from "./minutesText.js";

test("nothing to show for zero or a missing value", () => {
  assert.equal(formatMinutes(0), "");
  assert.equal(formatMinutes(null), "");
  assert.equal(formatMinutes(undefined), "");
});

test("under an hour reads in minutes", () => {
  assert.equal(formatMinutes(16), "16 د");
});

test("whole hours drop the minutes", () => {
  assert.equal(formatMinutes(60), "1 س");
});

test("hours and minutes read together", () => {
  assert.equal(formatMinutes(65), "1 س 5 د");
  assert.equal(formatMinutes(130), "2 س 10 د");
});
