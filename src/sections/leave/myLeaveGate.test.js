import test from "node:test";
import assert from "node:assert/strict";
import { showsMyLeave } from "./myLeaveGate.js";

test("an account linked to an employee shows «طلباتي»", () => {
  assert.equal(showsMyLeave({ name: "نور" }), true);
});

test("an account with no employee link has a null name and hides it", () => {
  assert.equal(showsMyLeave({ name: null }), false);
});

test("a missing or empty user hides it", () => {
  assert.equal(showsMyLeave({}), false);
  assert.equal(showsMyLeave(null), false);
  assert.equal(showsMyLeave(undefined), false);
});

test("a blank name is not an employee", () => {
  assert.equal(showsMyLeave({ name: "" }), false);
  assert.equal(showsMyLeave({ name: "   " }), false);
});
