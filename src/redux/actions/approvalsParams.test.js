import test from "node:test";
import assert from "node:assert/strict";
import { INBOX_TABS, buildInboxParams } from "./approvalsParams.js";

test("the inbox has exactly two tabs", () => {
  assert.deepEqual(INBOX_TABS, ["pending", "decided"]);
});

test("pending sends the page alone — never a status", () => {
  // Any status other than `decided` is a 422 (API doc §15.2), so the pending
  // tab is the absence of the parameter, not `status=pending`.
  assert.deepEqual(buildInboxParams("pending", 1, 15), { page: 1, per_page: 15 });
});

test("decided adds status=decided", () => {
  assert.deepEqual(buildInboxParams("decided", 2, 15), {
    page: 2,
    per_page: 15,
    status: "decided",
  });
});

test("an unknown tab falls back to the plain page", () => {
  assert.deepEqual(buildInboxParams("bogus", 1, 15), { page: 1, per_page: 15 });
});
