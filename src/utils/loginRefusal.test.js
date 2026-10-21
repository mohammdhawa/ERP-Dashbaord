import test from "node:test";
import assert from "node:assert/strict";
import { SUSPENDED_MESSAGE, loginRefusalView } from "./loginRefusal.js";

test("a suspended employee is told so, not that the account is disabled", () => {
  const view = loginRefusalView(SUSPENDED_MESSAGE);
  assert.equal(view.suspended, true);
  assert.equal(view.title, "الموظف موقوف عن العمل");
});

test("a disabled account keeps its own view", () => {
  for (const message of ["تم تعطيل هذا الحساب.", null, undefined]) {
    const view = loginRefusalView(message);
    assert.equal(view.suspended, false);
    assert.equal(view.title, "تم تعطيل هذا الحساب");
  }
});
