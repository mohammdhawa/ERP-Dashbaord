import test from "node:test";
import assert from "node:assert/strict";
import { refusedCheckInsLine } from "./rejectionText.js";

test("a day refused once says nothing more", () => {
  assert.equal(refusedCheckInsLine({ refused_check_ins: 1 }), null);
});

test("a day refused several times says how many", () => {
  assert.equal(
    refusedCheckInsLine({ refused_check_ins: 3 }),
    "عدد التسجيلات المرفوضة في هذا اليوم: 3"
  );
});

test("no rejection, or a server without the count, says nothing", () => {
  assert.equal(refusedCheckInsLine(null), null);
  assert.equal(refusedCheckInsLine({}), null);
});
