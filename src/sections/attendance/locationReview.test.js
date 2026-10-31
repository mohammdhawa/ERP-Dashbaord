import test from "node:test";
import assert from "node:assert/strict";
import {
  reviewBadge, reviewReasonLabel, canApproveLocation,
  selectedApprovalPayload, matchingApprovalPayload, bulkApprovalSummary,
} from "./locationReview.js";

test("location review labels and reasons come from the server vocabulary", () => {
  assert.equal(reviewBadge(null).label, "لم يُقيّم");
  assert.equal(reviewBadge({ status: "for_review" }).label, "للمراجعة");
  assert.equal(reviewBadge({ status: "in_process" }).label, "قيد المعالجة");
  assert.equal(reviewBadge({ status: "approved" }).label, "معتمد");
  for (const reason of ["no_site", "inactive_site", "mock_location", "fix_time_invalid", "boundary_changed", "low_accuracy", "boundary_uncertain", "outside", "inside"]) {
    assert.ok(reviewReasonLabel(reason), reason);
  }
  assert.equal(reviewReasonLabel("unknown"), "unknown");
});

test("approval controls require permission, an assessed record and no refusal", () => {
  const permissions = ["attendance.records.approveLocation"];
  assert.equal(canApproveLocation({ location_review: { status: "for_review" } }, permissions), true);
  assert.equal(canApproveLocation({ location_review: { status: "in_process" } }, permissions), true);
  assert.equal(canApproveLocation({ location_review: { status: "approved" } }, permissions), false);
  assert.equal(canApproveLocation({ location_review: null }, permissions), false);
  assert.equal(canApproveLocation({ is_rejected: true, location_review: { status: "for_review" } }, permissions), false);
  assert.equal(canApproveLocation({ location_review: { status: "in_process" } }, []), false);
});

test("bulk payloads separate selected ids from matching in-process records", () => {
  assert.deepEqual(selectedApprovalPayload([3, 4, 3], " note "), { record_ids: [3, 4], note: "note" });
  assert.deepEqual(matchingApprovalPayload({ open_location_review: "1", location_review_status: "approved", rejected: "1", date: "2026-10-31", employee_id: "7", sort: "id" }, ""), {
    matching: { date: "2026-10-31", employee_id: "7", location_review_status: "in_process" },
  });
  assert.equal(bulkApprovalSummary({ approved: [3, 4], skipped: [{ id: 5, reason: "out_of_scope" }], remaining: 6 }).approved, 2);
  assert.equal(bulkApprovalSummary({ approved: [3], skipped: [{ id: 5, reason: "rejected" }], remaining: 6 }).remaining, 6);
});
