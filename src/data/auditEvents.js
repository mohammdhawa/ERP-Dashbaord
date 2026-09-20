// سجل التدقيق — the vocabulary the audit log is read through.
//
// Two maps, both with HONEST fallbacks: an event or a target type this file has
// never heard of must look unfamiliar on screen, not look like something else.
// A new backend event rendered under a neighbouring event's label is worse than
// a raw key — it is a wrong answer to "what happened", on the one screen whose
// entire job is answering that.
//
// ⚠️ NOTHING HERE IS A DISPLAY LABEL FOR AN EVENT. The server sends
// `event_label`; EVENT_FALLBACK_LABELS is only for a row that arrives without
// one. Same standing rule as every other screen: render the server's label.
//
// This module is PURE — no `import.meta`, no React — so `auditFormat.test.js`
// can run it under plain `node --test`. That is why AUDITABLE_META stores a
// BASE_URL-relative route and not a finished href: the caller prefixes
// `import.meta.env.BASE_URL`, exactly as data/referenceRoutes.js builds paths.

// Badge treatment. `variant` is a token, not a CSS class, so the class table
// below stays the only place the theme's badge names appear.
//   success · created-ish        info · updated-ish       muted · routine noise
//   danger  · destructive        alert · security signal
const M = (group, variant) => ({ group, variant });

export const EVENT_META = Object.freeze({
  // --- model group: written by the model observers on the audited models ---
  created: M("model", "success"),
  updated: M("model", "info"),
  deleted: M("model", "danger"),

  // --- auth group: written by the auth module itself ---
  user_logged_in: M("auth", "info"),
  user_logged_out: M("auth", "muted"),
  tokens_refreshed: M("auth", "muted"),
  all_tokens_revoked: M("auth", "danger"),
  refresh_token_replay_detected: M("auth", "alert"),
  user_created: M("auth", "success"),
  user_updated: M("auth", "info"),
  user_deleted: M("auth", "danger"),
  role_created: M("auth", "success"),
  role_updated: M("auth", "info"),
  role_deleted: M("auth", "danger"),
  role_assigned: M("auth", "primary"),
  role_unassigned: M("auth", "danger"),

  // --- request group: written by AuditLogMiddleware, once per authenticated
  // request. Muted, and hidden by default on the list — see AuditLogFilters.
  api_request: M("request", "muted"),
});

// The three groups the `event_group` filter accepts, CSV-joined. THE SINGLE
// SOURCE OF THE LIST: AuditLog derives the two group sets the api_request
// switch chooses between from it, and AuditLogFilters groups its event picker
// by it. A second copy is a second thing to forget when the backend adds a
// fourth group.
export const EVENT_GROUPS = Object.freeze(["model", "auth", "request"]);

export const EVENT_GROUP_LABELS = Object.freeze({
  model: "تغييرات السجلات",
  auth: "المصادقة والصلاحيات",
  request: "طلبات الواجهة البرمجية",
});

// FALLBACK ONLY. Used when a row arrives without `event_label`.
export const EVENT_FALLBACK_LABELS = Object.freeze({
  created: "إنشاء",
  updated: "تعديل",
  deleted: "حذف",
  user_logged_in: "تسجيل دخول",
  user_logged_out: "تسجيل خروج",
  tokens_refreshed: "تجديد الجلسة",
  all_tokens_revoked: "إبطال كل الجلسات",
  refresh_token_replay_detected: "إعادة استخدام رمز تجديد",
  user_created: "إنشاء مستخدم",
  user_updated: "تعديل مستخدم",
  user_deleted: "حذف مستخدم",
  role_created: "إنشاء دور",
  role_updated: "تعديل دور",
  role_deleted: "حذف دور",
  role_assigned: "إسناد دور",
  role_unassigned: "سحب دور",
  api_request: "طلب واجهة برمجية",
});

/**
 * What to show in the الحدث badge.
 *
 * The server's `event_label` first, this file's fallback second, and the RAW
 * KEY last. An unrecognised key is deliberately rendered as itself: a backend
 * that starts emitting `employee_terminated` must read as an event this UI has
 * not been taught, not as a blank cell and not as "تعديل".
 */
export const eventLabel = (row) =>
  row?.event_label || EVENT_FALLBACK_LABELS[row?.event] || row?.event || "—";

export const eventVariant = (event) => EVENT_META[event]?.variant || "unknown";

export const eventGroup = (event) => EVENT_META[event]?.group || null;

export const isKnownEvent = (event) =>
  Object.prototype.hasOwnProperty.call(EVENT_META, event);

// Badge classes from the theme. `alert` is deliberately the only SOLID badge in
// the table — see SECURITY_EVENTS below.
const VARIANT_CLASSES = Object.freeze({
  success: "bg-success-transparent",
  info: "bg-info-transparent",
  primary: "bg-primary-transparent",
  danger: "bg-danger-transparent",
  muted: "bg-light text-muted",
  alert: "bg-danger text-fixed-white",
  unknown: "bg-light text-muted border",
});

export const eventBadgeClass = (event) =>
  VARIANT_CLASSES[eventVariant(event)] || VARIANT_CLASSES.unknown;

/**
 * Events that are a SECURITY SIGNAL rather than a record of routine work, with
 * the one-line Arabic explanation shown in the detail panel.
 *
 * `refresh_token_replay_detected` means a rotated single-use refresh token was
 * presented a second time. Either the client has a bug, or the token was
 * captured and is being replayed by someone else — and the server's response is
 * to revoke every token the account holds. Rendering that in the same red as an
 * ordinary delete buries it; it is the one row on this screen that should stop
 * the reader.
 */
export const SECURITY_EVENTS = Object.freeze({
  refresh_token_replay_detected:
    "تم تقديم رمز تجديد مُستهلَك مرة ثانية. إمّا خلل في التطبيق، أو أن الرمز مسروق ويُعاد استخدامه — وقد أُبطلت جميع جلسات هذا الحساب استجابةً لذلك. يستحق التحقق اليدوي.",
});

export const securityNote = (event) => SECURITY_EVENTS[event] || null;

/**
 * AUDITABLE_META — short morph key → { label, route }.
 *
 * THE KEYS ARE THE SERVER'S MORPH-MAP ALIASES, SPELLED EXACTLY AS THE COLUMN
 * STORES THEM. They are the same aliases published as `reference.type` on
 * notifications, so a type has ONE public name across the whole API. Hence
 * `employee_assignment` / `employee_warning` and not the shorter `assignment` /
 * `warning`: a second spelling here would give one type two public names, and
 * every row of that type would miss this map and render as a raw unlinked key.
 *
 * `route` is a BASE_URL-relative path, or null when THERE IS NOWHERE TRUTHFUL
 * TO SEND THE READER. It is null in two different situations and both matter:
 *
 *  - `employee_assignment` / `employee_warning` live inside an employee profile
 *    tab, and an audit row does not carry the employee id — only the
 *    assignment's own id. There is no URL that opens them, so they get no link
 *    rather than a guessed one.
 *  - anything this map has never heard of: an unknown type renders as its raw
 *    key with no link. Never guess a URL from the type name.
 *
 * Only `employee` has a real DETAIL route. The rest land on their LIST screen,
 * which is the honest destination — the record is there, and the reader can see
 * it is a list rather than believing they are looking at the audited row.
 * `permission` has no screen of its own; permissions are managed inside roles.
 */
export const AUDITABLE_META = Object.freeze({
  employee: { label: "موظف", route: (id) => `hr/employees/${id}` },
  department: { label: "وحدة تنظيمية", route: () => "departments" },
  user: { label: "مستخدم", route: () => "users" },
  role: { label: "دور", route: () => "roles" },
  permission: { label: "صلاحية", route: () => "roles" },
  job_title: { label: "مسمى وظيفي", route: () => "hr/job-titles" },
  employee_assignment: { label: "سجل تعيين", route: null },
  employee_warning: { label: "إنذار", route: null },
});

export const AUDITABLE_TYPES = Object.freeze(Object.keys(AUDITABLE_META));

/**
 * @returns {string|null} a BASE_URL-relative path, or null when the type has no
 *   screen to land on. Callers prefix `import.meta.env.BASE_URL`.
 */
export const auditableRoute = (type, id) => {
  const meta = AUDITABLE_META[type];
  if (!meta?.route) return null;
  if (id == null || id === "") return null;
  return meta.route(id);
};

/**
 * The TYPE's display label — "موظف", not the record's own name.
 *
 * The server sends `auditable_label` and it wins, per the standing rule. This
 * file's label is the fallback, and the raw key is the last resort.
 */
export const auditableTypeLabel = (row) =>
  row?.auditable_label ||
  AUDITABLE_META[row?.auditable_type]?.label ||
  row?.auditable_type ||
  "—";

export const isKnownAuditableType = (type) =>
  Object.prototype.hasOwnProperty.call(AUDITABLE_META, type);
