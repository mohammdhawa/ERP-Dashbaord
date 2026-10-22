// Where a notification opens — WHERE ITS RECIPIENT ACTS ON IT (project owner,
// 2026-10-14; backend API doc §6 "What a tap opens").
//
// Chosen by the notification's `type` FIRST and its `reference` SECOND — a
// lookup by reference alone cannot tell a request's notifications apart from
// those about an employee, which is what this replaced. For a leave request the
// approver's `approval.step_pending` and the requester's `leave.approved` both
// open the one leave request screen (project owner's decision): it shows the
// request's current state and carries the approve / reject buttons, gated per
// viewer.
//
// The server sends `type` + `reference`, never a URL — the Flutter app maps
// the same pair to its own screens.
//
// null = nowhere to go: the caller shows the notification's full text
// (NotificationDetailModal) instead. That is also what a type gets until its
// screen exists, so an entry is added HERE when its screen lands, not before —
// a route to a screen that does not exist yet is a 404 with extra steps.
//
// PURE, like auditEvents.js: paths are BASE_URL-relative, and
// referenceRoutes.js adds the base. That keeps this testable under `node --test`.

// Approval steps and the requester's leave notices all open the leave request
// screen (leave/requests/:id). Only a leave_request reference qualifies: a step
// on any other request has no screen yet, so it falls through to null.
//
// Left out on purpose, so they keep the full text: leave.excuse_* and
// leave.returned_to_work, and attendance.* — the contract's "Dashboard opens"
// column says "the full text" for all of them (their screens are the app's).
const toLeaveRequest = ({ reference }) =>
  reference?.type === "leave_request" && reference.id ? `leave/requests/${reference.id}` : null;

// type -> ({ reference }) => path | null. See API_DOCUMENTATION.md §6 "What a tap opens".
const BY_TYPE = Object.freeze({
  "approval.step_pending": toLeaveRequest,
  "approval.step_assigned": toLeaveRequest,
  "leave.submitted": toLeaveRequest,
  "leave.approved": toLeaveRequest,
  "leave.rejected": toLeaveRequest,
  "leave.cancelled": toLeaveRequest,
});

// reference.type (the server's morph alias) -> (id) => path.
const BY_REFERENCE = Object.freeze({
  // The profile, not the list: the notification names one person. Same
  // `hr.employees.view` gate as the list (Routingdata), so the link opens
  // nothing the list would not.
  employee: (id) => (id ? `hr/employees/${id}` : "hr/employees"),
  department: () => "departments",
  user: () => "users",
  role: () => "roles",
});

/**
 * The resolution itself, with the tables passed in — so the precedence rule
 * is testable before any type has a screen.
 *
 * @returns {string|null} a BASE_URL-relative path, or null
 */
export const resolveDestination = (notification, { byType, byReference }) => {
  if (!notification) return null;

  const fromType = byType[notification.type]?.(notification) ?? null;
  if (fromType) return fromType;

  const reference = notification.reference;
  const fromReference = byReference[String(reference?.type || "").toLowerCase()];

  return fromReference ? fromReference(reference.id) : null;
};

export const destinationOf = (notification) =>
  resolveDestination(notification, { byType: BY_TYPE, byReference: BY_REFERENCE });
