// What the approval / leave-request screens show and which actions they offer.
// Pure on purpose (no api import, which touches import.meta) so node --test
// can load it.
import { hasPermission } from "../../data/permissionsCatalog.js";

// Server enum values (API_DOCUMENTATION §15.1 / §16.3).
const STEP_PENDING = 1;
const LEAVE_APPROVED = 2;
const ORIGIN_REQUEST = 1;
const ORIGIN_EXCUSE = 2;

// Where an approval's subject lives, BASE_URL-relative. Only leave requests are
// reachable from this dashboard; any other subject type has no screen to open.
export const subjectPath = (subject) =>
  subject?.type === "leave_request" ? `leave/requests/${subject.id}` : null;

// Steps grouped by step_order, ascending. Steps that share an order run in
// parallel, so they belong to one stage.
export const stagesOf = (steps) => {
  const byOrder = new Map();
  for (const step of steps ?? []) {
    if (!byOrder.has(step.step_order)) byOrder.set(step.step_order, []);
    byOrder.get(step.step_order).push(step);
  }
  return [...byOrder.entries()]
    .sort(([a], [b]) => a - b)
    .map(([order, group]) => ({ order, steps: group }));
};

// Only a pending step can change hands, and only when the server says this
// viewer may reassign at all (can_reassign is the gate, not a permission).
export const reassignableSteps = (approval) =>
  approval?.can_reassign
    ? (approval.steps ?? []).filter((step) => step.status === STEP_PENDING)
    : [];

// Approval buttons read only the server's can_* flags. returnToWork and
// undoExcuse are not approval actions: they act on an already-approved leave
// and are gated by permission, split by origin (request vs HR excuse). A
// cancelled/rejected leave offers nothing.
export const leaveActions = (leave, permissions) => {
  const approval = leave?.approval;
  const approved = leave?.status === LEAVE_APPROVED;
  return {
    act: Boolean(approval?.can_act),
    reassign: reassignableSteps(approval).length > 0,
    withdraw: Boolean(approval?.can_withdraw),
    returnToWork:
      approved &&
      leave.origin === ORIGIN_REQUEST &&
      hasPermission(permissions, "leave.requests.returnToWork"),
    undoExcuse:
      approved &&
      leave.origin === ORIGIN_EXCUSE &&
      hasPermission(permissions, "leave.excuses.delete"),
  };
};

// The record moved under the user (not allowed any more / gone / state
// changed): show the server's message, then re-read so the screen stops
// offering what no longer works.
export const refreshAfterRefusal = (status) =>
  status === 403 || status === 404 || status === 422;
