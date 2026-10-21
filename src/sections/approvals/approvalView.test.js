import test from "node:test";
import assert from "node:assert/strict";
import {
  cancellationView,
  leaveActions,
  leaveStatusText,
  skipNote,
  reassignableSteps,
  refreshAfterRefusal,
  stagesOf,
  subjectPath,
} from "./approvalView.js";

const NONE = {
  act: false,
  reassign: false,
  withdraw: false,
  returnToWork: false,
  undoExcuse: false,
};
const ALL_PERMS = ["leave.requests.returnToWork", "leave.excuses.delete"];

test("subjectPath maps a leave request, and nothing else", () => {
  assert.equal(subjectPath({ type: "leave_request", id: 9 }), "leave/requests/9");
  assert.equal(subjectPath({ type: "document", id: 9 }), null);
  assert.equal(subjectPath(null), null);
});

test("stagesOf groups by step_order ascending; parallel steps share a stage", () => {
  const stages = stagesOf([
    { id: "a", step_order: 2 },
    { id: "b", step_order: 1 },
    { id: "c", step_order: 2 },
  ]);
  assert.equal(stages.length, 2);
  assert.deepEqual(
    stages.map((s) => s.order),
    [1, 2]
  );
  assert.equal(stages[0].steps.length, 1);
  assert.deepEqual(
    stages[1].steps.map((s) => s.id),
    ["a", "c"]
  );
});

test("reassignableSteps: pending steps only, and only when can_reassign", () => {
  const steps = [
    { id: 1, status: 1 },
    { id: 2, status: 2 },
    { id: 3, status: 1 },
  ];
  assert.deepEqual(
    reassignableSteps({ can_reassign: true, steps }).map((s) => s.id),
    [1, 3]
  );
  assert.deepEqual(reassignableSteps({ can_reassign: false, steps }), []);
  assert.deepEqual(reassignableSteps(null), []);
});

test("a pending request the viewer can act on offers act only", () => {
  const leave = { status: 1, origin: 1, approval: { can_act: true, steps: [] } };
  assert.deepEqual(leaveActions(leave, []), { ...NONE, act: true });
});

test("an approved excuse offers undoExcuse only with leave.excuses.delete", () => {
  const leave = { status: 2, origin: 2, approval: null };
  assert.deepEqual(leaveActions(leave, ["leave.excuses.delete"]), {
    ...NONE,
    undoExcuse: true,
  });
  assert.deepEqual(leaveActions(leave, []), NONE);
});

test("an approved request offers returnToWork only with its permission", () => {
  const leave = { status: 2, origin: 1, approval: { can_act: false, steps: [] } };
  assert.deepEqual(leaveActions(leave, ["leave.requests.returnToWork"]), {
    ...NONE,
    returnToWork: true,
  });
  assert.deepEqual(leaveActions(leave, []), NONE);
});

test("withdraw and reassign follow the approval flags", () => {
  const leave = {
    status: 1,
    origin: 1,
    approval: {
      can_act: false,
      can_withdraw: true,
      can_reassign: true,
      steps: [{ id: 1, status: 1 }],
    },
  };
  assert.deepEqual(leaveActions(leave, []), { ...NONE, withdraw: true, reassign: true });
});

test("a cancelled leave offers nothing, even with every permission", () => {
  const leave = { status: 4, origin: 1, approval: null };
  assert.deepEqual(leaveActions(leave, ALL_PERMS), NONE);
  assert.deepEqual(leaveActions({ ...leave, origin: 2 }, ALL_PERMS), NONE);
});

test("refreshAfterRefusal: 403/404/422 re-read, anything else does not", () => {
  assert.equal(refreshAfterRefusal(422), true);
  assert.equal(refreshAfterRefusal(403), true);
  assert.equal(refreshAfterRefusal(404), true);
  assert.equal(refreshAfterRefusal(0), false);
  assert.equal(refreshAfterRefusal(500), false);
});

test("skipNote explains only the top-of-tree skip", () => {
  assert.match(skipNote({ skip_reason: 5 }), /رأس الهيكل/);
  for (const reason of [1, 2, 3, 4, null]) {
    assert.equal(skipNote({ skip_reason: reason }), null);
  }
  assert.equal(skipNote(null), null);
});

test("cancellationView: a withdrawal reads «مسحوب», HR's cancellation does not", () => {
  const withdrawn = cancellationView({
    status: 4,
    status_label: "ملغاة",
    approval: { status: 4, status_label: "مسحوب" },
  });
  assert.deepEqual(withdrawn, {
    withdrawn: true,
    badge: "مسحوب",
    atLabel: "سُحب في",
    byLabel: "سحبه",
  });
  // An excuse undone (no approval) or a leave cancelled by a return to work
  // (its approval approved) is HR's act.
  for (const approval of [null, { status: 2, status_label: "موافق عليه" }]) {
    const view = cancellationView({ status: 4, status_label: "ملغاة", approval });
    assert.equal(view.withdrawn, false);
    assert.equal(view.badge, "ملغاة");
    assert.equal(view.byLabel, "أُلغيت بواسطة");
  }
  assert.equal(cancellationView({ status: 2, approval: null }), null);
  assert.equal(cancellationView(null), null);
});

test("leaveStatusText: the lists name a withdrawal «مسحوب»", () => {
  assert.equal(
    leaveStatusText({
      status: 4,
      status_label: "ملغاة",
      approval: { status: 4, status_label: "مسحوب" },
    }),
    "مسحوب"
  );
  assert.equal(
    leaveStatusText({ status: 4, status_label: "ملغاة", approval: null }),
    "ملغاة"
  );
  assert.equal(
    leaveStatusText({ status: 2, status_label: "معتمدة", approval: null }),
    "معتمدة"
  );
});
