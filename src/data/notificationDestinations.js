// Where a notification opens — WHERE ITS RECIPIENT ACTS ON IT (project owner,
// 2026-10-14; backend API doc §6 "What a tap opens").
//
// Chosen by the notification's `type` FIRST and its `reference` SECOND. The
// same leave request is two different screens for two different people: the
// approver's `approval.step_pending` opens the approval screen, the
// requester's `leave.approved` opens their own request. A lookup by reference
// alone cannot tell them apart, which is what this replaced.
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

// type -> ({ reference }) => path | null. Empty until the screens land:
//   "approval.step_pending" -> the approval screen   (work order §4.6)
//   "leave.*"               -> the leave request      (work order §4.7)
const BY_TYPE = Object.freeze({});

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
