// What the approval / leave-request screens show and which actions they offer.
// Pure on purpose (no api import, which touches import.meta) so node --test
// can load it.
import { hasPermission } from "../../data/permissionsCatalog.js";

// Server enum values (API_DOCUMENTATION §15.1 / §16.3).
const STEP_PENDING = 1;
const LEAVE_APPROVED = 2;
const LEAVE_CANCELLED = 4;
const APPROVAL_CANCELLED = 4;
// SkipReason::TopOfTree (2026-10-20, parity audit C-1).
const SKIP_TOP_OF_TREE = 5;
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

// A step skipped because the requester heads the tree (المدير العام's own
// request): nobody stands above them, so the direct-manager step is skipped
// and the rest of the route decides (§15.7). The server's label says why; this
// says what follows, which the label alone does not.
export const skipNote = (step) =>
  step?.skip_reason === SKIP_TOP_OF_TREE
    ? "مقدّم الطلب على رأس الهيكل التنظيمي، فتقرّر المراحل التالية وحدها."
    : null;

// How a cancelled leave's cancellation reads (§16.3, 2026-10-20, parity audit
// C-5). The requester's own withdrawal is a cancelled APPROVAL — status 4,
// «مسحوب» — and now carries cancelled_at / cancelled_by like HR's
// cancellations (an excuse undone, a leave cancelled by a return to work on its
// first day), which have no approval or an approved one. `badge` is the
// header's status text: the approval's own label for a withdrawal.
export const cancellationView = (leave) => {
  if (leave?.status !== LEAVE_CANCELLED) return null;
  const withdrawn = leave.approval?.status === APPROVAL_CANCELLED;
  return withdrawn
    ? {
        withdrawn: true,
        badge: leave.approval.status_label || leave.status_label,
        atLabel: "سُحب في",
        byLabel: "سحبه",
      }
    : {
        withdrawn: false,
        badge: leave.status_label,
        atLabel: "أُلغيت في",
        byLabel: "أُلغيت بواسطة",
      };
};

// A leave's status as the lists show it: «مسحوب» for the requester's
// withdrawal, the leave's own label otherwise (owner, 2026-10-21: the lists
// tell a withdrawal from HR's cancellation, as the request screen does).
export const leaveStatusText = (leave) =>
  cancellationView(leave)?.badge ?? leave?.status_label;

// A day count with Arabic number agreement, as the employee app words it.
const daysText = (n) => {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  if (n >= 3 && n <= 10) return `${n} أيام`;
  return `${n} يوماً`;
};

// The requester's job and unit from the leave's approver_view (API doc §16.4):
// "<job> · <unit>", whichever of them there is. The server sends the view only
// to someone on the chain, so anyone else gets null and the line stays out.
export const requesterRoleLine = (view) => {
  const parts = [view?.job_title?.name, view?.department?.name].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
};

// The requester's balance around this leave, from the same view: what is left
// after it, or by how much it passes the balance. after_request is not clamped
// (pending requests reserve nothing), so it can go below zero. null when the
// leave does not deduct, once it is decided, or for a reader off the chain.
export const approverBalanceView = (view) => {
  const balance = view?.balance;
  if (!balance) return null;
  const remaining = daysText(balance.remaining_days);
  const after = balance.after_request;
  return after < 0
    ? { text: `${remaining} ← يتجاوز الرصيد بـ ${daysText(-after)}`, over: true }
    : { text: `${remaining} ← يتبقى ${after}`, over: false };
};
