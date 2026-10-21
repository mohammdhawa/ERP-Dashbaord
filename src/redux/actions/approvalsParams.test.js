import test from "node:test";
import assert from "node:assert/strict";
import {
  APPROVAL_STATUSES,
  INBOX_SORT_KEYS,
  INBOX_TABS,
  LIST_SORT_KEYS,
  buildApprovalListParams,
  buildInboxParams,
} from "./approvalsParams.js";

test("the inbox has exactly two tabs", () => {
  assert.deepEqual(INBOX_TABS, ["pending", "decided"]);
});

test("pending sends the page alone — never a status", () => {
  // Any status other than `decided` is a 422 (API doc §15.2), so the pending
  // tab is the absence of the parameter, not `status=pending`.
  assert.deepEqual(buildInboxParams("pending", 1, 15), {
    page: 1,
    per_page: 15,
  });
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

test("the sort vocabularies are the server's", () => {
  assert.deepEqual([...INBOX_SORT_KEYS], ["submitted_at", "employee_name"]);
  assert.deepEqual(
    [...LIST_SORT_KEYS],
    ["submitted_at", "decided_at", "employee_name"]
  );
  assert.deepEqual([...APPROVAL_STATUSES], ["1", "2", "3", "4"]);
});

test("the inbox carries every filter of §15.2", () => {
  assert.deepEqual(
    buildInboxParams("decided", 1, 15, {
      search: "  أحمد ",
      department_id: "3",
      leave_type_ids: "2,5",
      date_from: "2026-06-01",
      date_to: "2026-06-30",
      submitted_from: "2026-05-01",
      submitted_to: "2026-05-31",
      sort: "-employee_name",
    }),
    {
      page: 1,
      per_page: 15,
      status: "decided",
      search: "أحمد",
      department_id: "3",
      leave_type_ids: "2,5",
      date_from: "2026-06-01",
      date_to: "2026-06-30",
      submitted_from: "2026-05-01",
      submitted_to: "2026-05-31",
      sort: "-employee_name",
    }
  );
});

test("a value the server would refuse is dropped, not sent", () => {
  assert.deepEqual(
    buildInboxParams("pending", 1, 15, {
      search: "   ",
      department_id: "007",
      leave_type_ids: "0,x,4",
      date_from: "2026-02-31",
      submitted_to: "2026-1-5",
      // decided_at is the HR list's sort, not the inbox's.
      sort: "decided_at",
    }),
    { page: 1, per_page: 15, leave_type_ids: "4" }
  );
});

test("one end of a range is sent on its own (the server reads it as open)", () => {
  assert.deepEqual(
    buildInboxParams("pending", 1, 15, { date_to: "2026-06-21" }),
    {
      page: 1,
      per_page: 15,
      date_to: "2026-06-21",
    }
  );
});

test("the search is capped at the server's 100", () => {
  const params = buildInboxParams("pending", 1, 15, {
    search: "x".repeat(150),
  });
  assert.equal(params.search.length, 100);
});

test("the HR list is every status by default", () => {
  assert.deepEqual(buildApprovalListParams(1, 15), { page: 1, per_page: 15 });
  assert.deepEqual(buildApprovalListParams(1, 15, { statuses: "" }), {
    page: 1,
    per_page: 15,
  });
});

test("the HR list narrows by status and sorts by decision date", () => {
  assert.deepEqual(
    buildApprovalListParams(2, 25, {
      statuses: "1,4,9",
      department_id: "7",
      sort: "-decided_at",
    }),
    {
      page: 2,
      per_page: 25,
      statuses: "1,4",
      department_id: "7",
      sort: "-decided_at",
    }
  );
  assert.deepEqual(buildApprovalListParams(1, 15, { statuses: ["2", "3"] }), {
    page: 1,
    per_page: 15,
    statuses: "2,3",
  });
});
