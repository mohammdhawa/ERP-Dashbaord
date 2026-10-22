// Permission catalogue (API doc §2) — 45 rows: 42 route-level + 3 field-level.
// Format: {module}.{resource}.{action}
//
// Arabic labels come from the backend seeder. No endpoint serves permission
// labels, so this file is the only source of them: keep it in step with the
// seeder rather than inventing wording here.
//
// `fieldLevel: true` marks a permission that gates KEYS INSIDE A PAYLOAD rather
// than a route. No endpoint requires them; they decide whether the server
// includes a field at all (an absent key, never null). They are shown as such
// in the role matrix so an admin granting one knows it widens what is readable
// on a screen they already have, not which screens they can reach.
export const PERMISSIONS_CATALOG = [
  {
    module: "الأقسام",
    key: "departments",
    permissions: [
      { name: "departments.view", label: "عرض الأقسام" },
      { name: "departments.create", label: "إنشاء قسم" },
      { name: "departments.update", label: "تعديل قسم" },
      { name: "departments.delete", label: "حذف قسم" },
    ],
  },
  {
    module: "الموظفين",
    key: "hr.employees",
    permissions: [
      { name: "hr.employees.view", label: "عرض الموظفين" },
      { name: "hr.employees.create", label: "إضافة موظف" },
      { name: "hr.employees.update", label: "تعديل موظف" },
      { name: "hr.employees.delete", label: "حذف موظف" },
    ],
  },
  {
    module: "حقول الموظفين (على مستوى الحقل)",
    key: "hr.employees.fields",
    fieldLevel: true,
    note: "تتحكم بظهور حقول داخل بيانات الموظف، لا بالوصول إلى الشاشات.",
    permissions: [
      {
        name: "hr.employees.viewSalary",
        label: "عرض رواتب الموظفين",
        fieldLevel: true,
      },
      {
        name: "hr.employees.viewIdentity",
        label: "عرض أرقام هوية الموظفين",
        fieldLevel: true,
      },
    ],
  },
  {
    module: "المسميات الوظيفية",
    key: "hr.job_titles",
    permissions: [
      { name: "hr.job_titles.view", label: "عرض المسميات الوظيفية" },
      { name: "hr.job_titles.create", label: "إنشاء مسمى وظيفي" },
      { name: "hr.job_titles.update", label: "تعديل مسمى وظيفي" },
      { name: "hr.job_titles.delete", label: "حذف مسمى وظيفي" },
    ],
  },
  {
    // سجل التعيين is append-only by design: there is no update and no delete
    // permission, because editing a historical posting changes what a payslip
    // was computed against with no trace of the original.
    module: "سجل التعيين",
    key: "hr.assignments",
    permissions: [
      { name: "hr.assignments.view", label: "عرض سجل التعيين" },
      { name: "hr.assignments.create", label: "تسجيل تعيين أو نقل" },
    ],
  },
  {
    module: "الإنذارات",
    key: "hr.warnings",
    permissions: [
      { name: "hr.warnings.view", label: "عرض الإنذارات" },
      { name: "hr.warnings.create", label: "إصدار إنذار" },
      { name: "hr.warnings.update", label: "تعديل إنذار" },
      { name: "hr.warnings.delete", label: "حذف إنذار" },
    ],
  },
  {
    module: "الحضور والانصراف",
    key: "attendance.records",
    permissions: [
      { name: "attendance.records.view", label: "عرض سجلات الحضور" },
      { name: "attendance.records.correct", label: "تصحيح انصراف منسي" },
      { name: "attendance.records.reject", label: "رفض سجل حضور" },
    ],
  },
  {
    // The approve and reject buttons need no permission: the step's owner acts
    // on their own step in the approval chain. These two are for seeing chains
    // and moving a step to someone else.
    module: "الاعتمادات",
    key: "approvals",
    note: "الموافقة والرفض لا يحتاجان صلاحية: يقرّر صاحب الخطوة في مسار الاعتماد.",
    permissions: [
      { name: "approvals.view", label: "عرض مسارات الاعتماد" },
      { name: "approvals.reassign", label: "إعادة إسناد خطوة اعتماد" },
    ],
  },
  {
    module: "الإجازات",
    key: "leave",
    permissions: [
      { name: "leave.types.create", label: "إضافة نوع إجازة" },
      { name: "leave.types.update", label: "تعديل نوع إجازة" },
      { name: "leave.types.delete", label: "حذف نوع إجازة" },
      { name: "leave.balances.view", label: "عرض أرصدة الإجازات" },
      { name: "leave.balances.update", label: "تعديل أرصدة الإجازات" },
      { name: "leave.requests.view", label: "عرض طلبات الإجازات" },
      { name: "leave.excuses.create", label: "تسجيل عذر غياب" },
      { name: "leave.excuses.delete", label: "التراجع عن عذر غياب" },
      { name: "leave.requests.returnToWork", label: "تسجيل العودة إلى العمل" },
    ],
  },
  {
    module: "المستخدمين",
    key: "auth.users",
    permissions: [
      { name: "auth.users.view", label: "عرض المستخدمين" },
      { name: "auth.users.create", label: "إنشاء مستخدم" },
      { name: "auth.users.update", label: "تعديل مستخدم" },
      { name: "auth.users.delete", label: "حذف مستخدم" },
    ],
  },
  {
    module: "الأدوار والصلاحيات",
    key: "auth.roles",
    permissions: [
      { name: "auth.roles.view", label: "عرض الأدوار" },
      { name: "auth.roles.create", label: "إنشاء دور" },
      { name: "auth.roles.update", label: "تعديل دور" },
      { name: "auth.roles.delete", label: "حذف دور" },
      // Split out of auth.roles.update on 2026-09-26 (GAP-15): granting a role
      // to a user is bounded by the assigner's own reach and may be scoped;
      // editing what a role carries is company-wide and may not.
      { name: "auth.roles.assign", label: "إسناد الأدوار للمستخدمين" },
    ],
  },
  {
    // سجل التدقيق is APPEND-ONLY, like سجل التعيين above but more strictly: the
    // rows are written by middleware and model observers, never by a user. There
    // is no create, no update and no delete permission because there is no
    // endpoint any of them could authorise — and inventing one here would put a
    // checkbox in the role matrix promising a power that does not exist.
    module: "سجل التدقيق",
    key: "auth.audit",
    permissions: [{ name: "auth.audit.view", label: "عرض سجل التدقيق" }],
  },
  {
    // A SEPARATE group rather than a row inside سجل التدقيق, so the role matrix
    // renders the "على مستوى الحقل" badge and the note it already renders for
    // hr.employees.viewSalary / viewIdentity — same convention, no change to the
    // roles screen. Reaching the audit log and reading the before/after values
    // of every edit in it are two different grants: the first answers "who
    // touched this record", the second replays the data itself, salaries and
    // identity numbers included.
    // ⚠️ NOT SUFFICIENT ON ITS OWN since 2026-09-20 (API doc §9.2). The values
    // of a row ABOUT A RECORD also need that module's view permission — an
    // audit row is a copy of someone else's record — so granting this alone
    // widens login and api_request rows and nothing else. The note says so,
    // because an admin ticking this box otherwise expects more than it gives.
    module: "تفاصيل سجل التدقيق (على مستوى الحقل)",
    key: "auth.audit.fields",
    fieldLevel: true,
    note: "تتحكم بظهور القيم السابقة والجديدة داخل سجل التدقيق، لا بالوصول إلى الشاشة. لعرض قيم سجل يخص موظفاً أو قسماً أو مستخدماً، يلزم أيضاً امتلاك صلاحية عرض تلك الوحدة.",
    permissions: [
      {
        name: "auth.audit.viewValues",
        label: "عرض تفاصيل التغييرات",
        fieldLevel: true,
      },
    ],
  },
];

export const ALL_PERMISSION_NAMES = PERMISSIONS_CATALOG.flatMap((group) =>
  group.permissions.map((p) => p.name)
);

// The permission the assign/unassign endpoints require. Split out of
// auth.roles.update on 2026-09-26 (GAP-15). One constant because three places
// must agree on it: the gate on the assign card, the `canAssign` flag beside it,
// and the refresh of the roles picker — a mismatch shows a card that cannot
// load its picker, or loads a picker nothing shows.
export const ASSIGN_ROLES_PERMISSION = "auth.roles.assign";

// WHAT A SCOPED GRANT CONFERS (GAP-15, API doc §5.4). A grant over a unit or
// «الوحدات التي أديرها» confers only these; every other permission in its role
// counts only from a company-wide grant, and is simply not held over a unit.
//
// ⚠️ A MIRROR of the server's PermissionReach, kept for ONE purpose: warning an
// admin who is about to assign a role over a unit that some of what it carries
// will do nothing there. It is never the check — the server's /auth/me already
// lists only the effective permissions, and that is what the UI gates on. If
// this list drifts, the warning is wrong; access is not.
export const HONOURED_FROM_SCOPED_GRANT = Object.freeze([
  // Row-scoped: the server filters and refuses rows by the grant's scope.
  "hr.employees.view",
  "hr.employees.create",
  "hr.employees.update",
  "hr.employees.delete",
  "hr.employees.viewSalary",
  "hr.employees.viewIdentity",
  "hr.assignments.view",
  "hr.assignments.create",
  "hr.warnings.view",
  "hr.warnings.create",
  "hr.warnings.update",
  "hr.warnings.delete",
  "auth.roles.assign",
  // Row-scoped too (PermissionReach::ROW_SCOPED): the server filters and refuses
  // rows by the grant's scope. leave.types.* is not row-scoped, so it is absent.
  "attendance.records.view",
  "attendance.records.correct",
  "attendance.records.reject",
  "approvals.view",
  "approvals.reassign",
  "leave.balances.view",
  "leave.balances.update",
  "leave.requests.view",
  "leave.excuses.create",
  "leave.excuses.delete",
  "leave.requests.returnToWork",
  // Company catalogues, readable from any grant so a scoped user's pickers work.
  "departments.view",
  "hr.job_titles.view",
  "auth.roles.view",
]);

/** The permissions in `names` that a grant narrower than the company does NOT confer. */
export const companyOnlyPermissions = (names = []) =>
  names.filter((name) => !HONOURED_FROM_SCOPED_GRANT.includes(name));

export const permissionLabel = (name) => {
  for (const group of PERMISSIONS_CATALOG) {
    const found = group.permissions.find((p) => p.name === name);
    if (found) return found.label;
  }
  return name;
};

// Single permission-check convention for the whole UI. `required` is a stable
// machine name (string) or a list of them; access is granted when the user
// holds ANY of them. Empty/undefined = auth-only (no RBAC permission needed).
// `held` is the flattened permission array from auth state.
export const hasPermission = (held, required) => {
  if (required == null) return true;
  const list = Array.isArray(required) ? required : [required];
  if (list.length === 0) return true;
  return list.some((perm) => held?.includes(perm));
};
