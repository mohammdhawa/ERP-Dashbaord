import test from "node:test";
import assert from "node:assert/strict";
import { destinationOf, resolveDestination } from "./notificationDestinations.js";

const n = (type, reference = null) => ({ id: 1, title: "x", type, reference });

test("a referenced employee opens their profile, not the list", () => {
  assert.equal(destinationOf(n("anything", { type: "employee", id: 7 })), "hr/employees/7");
});

test("the other referenced records open their screens", () => {
  assert.equal(destinationOf(n(null, { type: "department", id: 3 })), "departments");
  assert.equal(destinationOf(n(null, { type: "user", id: 3 })), "users");
  assert.equal(destinationOf(n(null, { type: "role", id: 3 })), "roles");
});

test("no destination means null — the caller shows the full text instead", () => {
  assert.equal(destinationOf(n("announcement")), null);
  assert.equal(destinationOf(n("leave.approved", { type: "something_unknown", id: 1 })), null);
  assert.equal(destinationOf(null), null);
});

test("the type wins over the reference: same record, different screen per recipient", () => {
  const byType = {
    "approval.step_pending": ({ reference }) => `approvals/${reference.id}`,
  };
  const byReference = { leave_request: (id) => `leave-requests/${id}` };
  const leave = { type: "leave_request", id: 42 };

  assert.equal(resolveDestination(n("approval.step_pending", leave), { byType, byReference }), "approvals/42");
  assert.equal(resolveDestination(n("leave.approved", leave), { byType, byReference }), "leave-requests/42");
});

test("a type whose screen cannot be built for this row falls back to its reference", () => {
  const byType = { "approval.step_pending": () => null };
  const byReference = { employee: (id) => `hr/employees/${id}` };

  assert.equal(
    resolveDestination(n("approval.step_pending", { type: "employee", id: 5 }), { byType, byReference }),
    "hr/employees/5"
  );
});

test("reference types match case-insensitively, as the old lookup did", () => {
  assert.equal(destinationOf(n(null, { type: "Employee", id: 2 })), "hr/employees/2");
});

const leave = { type: "leave_request", id: 9 };

test("an approval step on a leave request opens that request", () => {
  assert.equal(destinationOf(n("approval.step_pending", leave)), "leave/requests/9");
  assert.equal(destinationOf(n("approval.step_assigned", leave)), "leave/requests/9");
});

test("an approval step on any other request has no screen yet, so the full text", () => {
  const document = { type: "document", id: 3 };

  assert.equal(destinationOf(n("approval.step_pending", document)), null);
  assert.equal(destinationOf(n("approval.step_assigned", document)), null);
});

test("the requester's leave notifications open their own request", () => {
  assert.equal(destinationOf(n("leave.submitted", leave)), "leave/requests/9");
  assert.equal(destinationOf(n("leave.approved", leave)), "leave/requests/9");
  assert.equal(destinationOf(n("leave.rejected", leave)), "leave/requests/9");
  assert.equal(destinationOf(n("leave.cancelled", leave)), "leave/requests/9");
});

test("excuse, return-to-work and attendance types keep the full text", () => {
  assert.equal(destinationOf(n("leave.excuse_filed", leave)), null);
  assert.equal(destinationOf(n("leave.excuse_cancelled", leave)), null);
  assert.equal(destinationOf(n("leave.returned_to_work", leave)), null);
  assert.equal(destinationOf(n("attendance.record_rejected", { type: "attendance_record", id: 4 })), null);
  assert.equal(destinationOf(n("attendance.checkout_reminder")), null);
});

test("a leave type without a leave reference has nowhere to go", () => {
  assert.equal(destinationOf(n("leave.approved")), null);
  assert.equal(destinationOf(n("leave.approved", { type: "leave_request", id: null })), null);
});
