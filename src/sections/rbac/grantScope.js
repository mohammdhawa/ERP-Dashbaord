// A role GRANT carries a scope since 2026-09-24 (GAP-3, API doc §5.4).
//
// A role says which verbs; the scope says which employees those verbs reach:
//
//   1  الشركة كاملة          every row — what every grant meant before scopes
//                            existed, and what all existing grants became.
//   2  وحدة محددة            a named unit and everything beneath it.
//   3  الوحدات التي أديرها   the subtree of every unit whose manager is the
//                            user's linked employee. Nothing is stored about
//                            WHICH units, so it follows the org tree.
//
// The same role over two units is two grants. The server renders each grant
// as `{ id, role, scope_type, scope_label, department }` on the user object —
// `scope_label` is the server's Arabic and wins wherever a grant is shown; the
// labels below exist only for the PICKER, which has no server list to read.

import {
  ASSIGN_ROLES_PERMISSION,
  companyOnlyPermissions,
} from "../../data/permissionsCatalog.js";

// The server's refusal when anyone but a super admin grants or revokes
// super_admin (GAP-16, API doc §5.4), word for word.
export const SUPER_ADMIN_ONLY_MESSAGE =
  "دور مدير النظام لا يمنحه ولا يسحبه إلا مدير نظام.";

export const SCOPE_COMPANY = 1;
export const SCOPE_UNIT = 2;
export const SCOPE_MANAGED = 3;

// The built-in role whose power is the server's bypass. It carries no
// permission rows, so no rule that reads its permissions can say anything
// about it — which is exactly how a narrowed super_admin used to slip past the
// inert check below. The server refuses it by NAME, and so does this.
export const SUPER_ADMIN_ROLE = "super_admin";

export const SCOPE_OPTIONS = Object.freeze([
  Object.freeze({ value: SCOPE_COMPANY, label: "الشركة كاملة" }),
  Object.freeze({ value: SCOPE_UNIT, label: "وحدة محددة" }),
  Object.freeze({ value: SCOPE_MANAGED, label: "الوحدات التي أديرها" }),
]);

/**
 * The body for POST /auth/roles/assign — and for /unassign when revoking ONE
 * grant.
 *
 * `scope_department_id` is sent ONLY for a unit scope. The server requires the
 * key to be ABSENT for the other two, and refuses even an explicit null there
 * (`missing`, not `prohibited`), so it is never included "just in case".
 *
 * @returns {object|null} null when the input cannot form a valid grant — no
 *   user, no role, or a unit scope with no unit — so a caller disables its
 *   button instead of posting a guaranteed 422.
 */
export const buildGrantBody = ({ userId, roleId, scopeType, departmentId }) => {
  const user = Number(userId);
  const role = Number(roleId);
  const scope = Number(scopeType) || SCOPE_COMPANY;

  if (!user || !role) return null;

  const body = { user_id: user, role_id: role, scope_type: scope };

  if (scope === SCOPE_UNIT) {
    const unit = Number(departmentId);
    if (!unit) return null;
    body.scope_department_id = unit;
  }

  return body;
};

/**
 * The body for POST /auth/roles/unassign that revokes the role over EVERY
 * scope — no scope keys at all, which is the server's (and the pre-GAP-3)
 * meaning of "take this role away".
 */
export const buildRevokeAllBody = ({ userId, roleId }) => {
  const user = Number(userId);
  const role = Number(roleId);
  return user && role ? { user_id: user, role_id: role } : null;
};

/**
 * The unit a unit-scoped grant is over. `department` is the embedded object,
 * which comes back null once the unit is soft-deleted; `scope_department_id`
 * is the raw column, used when the server sends it, so an orphaned grant can
 * still be named — and revoked — on its own.
 */
export const grantUnitId = (grant) =>
  grant?.department?.id ?? grant?.scope_department_id ?? null;

/**
 * The body that revokes exactly this one server grant. The grant names its
 * role by NAME, so the id comes from the roles list; null if the role is not
 * in it (deleted, or the list not loaded), or if it is a unit grant whose unit
 * cannot be identified at all.
 */
export const revokeGrantBody = (userId, grant, roles = []) => {
  const role = roles.find((r) => r.name === grant?.role);
  if (!role) return null;
  return buildGrantBody({
    userId,
    roleId: role.id,
    scopeType: grant.scope_type,
    departmentId: grantUnitId(grant),
  });
};

/**
 * How far a grant reaches, in words, for a chip beside the role name. A
 * company grant says so too: a bare role name would read as "unscoped", which
 * is no longer a thing a grant can be. The server's `scope_label` wins; the
 * picker's own label covers a response that lacks it.
 */
export const describeGrantScope = (grant) => {
  if (!grant) return "";
  const scope = Number(grant.scope_type) || SCOPE_COMPANY;
  if (scope === SCOPE_UNIT) {
    if (grant.department) {
      return grant.department.name || `وحدة #${grant.department.id}`;
    }
    const unitId = grantUnitId(grant);
    return unitId != null ? `وحدة #${unitId} (غير متاحة)` : "وحدة غير متاحة";
  }
  return (
    grant.scope_label ||
    SCOPE_OPTIONS.find((o) => o.value === scope)?.label ||
    `نطاق #${grant.scope_type}`
  );
};

/**
 * Whether the signed-in caller is a super admin, from the /auth/me payload
 * ({ roles }). /auth/me carries no flag of its own; the role name is what the
 * server's bypass rests on.
 */
export const callerIsSuperAdmin = (caller) =>
  Array.isArray(caller?.roles) && caller.roles.includes(SUPER_ADMIN_ROLE);

/**
 * Of `permissions`, the ones the caller holds NOWHERE — so the server will
 * refuse to let them hand these out, take them away, or put them in or out of
 * a role (GAP-16: you can only give what you hold). Empty for a super admin,
 * and empty when the caller is unknown.
 *
 * ⚠️ One-sided on purpose. /auth/me lists the caller's effective permissions
 * WITHOUT their scopes, so a permission it lists may still be held too
 * narrowly for the grant at hand: a non-empty answer is a certain refusal, an
 * empty one is not a promise. The server's 403 names what is missing either way.
 *
 * @param permissions  permission names the action would confer or change
 * @param caller       { roles, permissions } from /auth/me, or null
 */
export const permissionsNotHeld = (permissions, caller) => {
  if (!caller || callerIsSuperAdmin(caller)) return [];
  const held = Array.isArray(caller.permissions) ? caller.permissions : [];
  return (permissions || []).filter((name) => !held.includes(name));
};

/**
 * What the assign card should say about granting `role` over `scopeType`,
 * before anything is sent. The server decides every case below; this only
 * tells the administrator in advance, in their words rather than a 4xx's.
 *
 *   blocked       a message when the server REFUSES this grant whatever the
 *                 data says — super_admin over anything but the company, or
 *                 super_admin at all from a caller who is not one (GAP-16).
 *                 The only case that disables the button: it depends on role
 *                 names, which cannot go stale the way permissions can.
 *   inert         the role's permissions that do NOTHING over this scope
 *                 (GAP-15). Read from the cached roles list, so a warning and
 *                 never a block: another tab may have changed the role.
 *   whollyInert   every one of them is inert — the server 422s this grant.
 *                 Never for a role with NO permissions: the server exempts it
 *                 on purpose (it confers nothing at company scope either, so the
 *                 scope is not what is wrong), and so does this.
 *   notHeld       what the grant would CONFER that the caller holds nowhere
 *                 (GAP-16) — the server 403s granting or revoking it. Inert
 *                 permissions confer nothing, so they are not asked of the
 *                 caller. A warning: see permissionsNotHeld().
 *
 * (Until 2026-09-28 there was a `grantsAssign` flag here too: the server
 * refused auth.roles.assign over a unit while GAP-16 was open. It no longer
 * does — a scoped assigner is bound by `notHeld`'s rule like everyone else.)
 *
 * @param role       the roles-list record ({ name, permissions }) or null
 * @param scopeType  SCOPE_*
 * @param caller     { roles, permissions } from /auth/me, or null if unknown
 */
export const grantAdvisories = (role, scopeType, caller = null) => {
  const none = { blocked: null, inert: [], whollyInert: false, notHeld: [] };
  if (!role) return none;

  const scoped = (Number(scopeType) || SCOPE_COMPANY) !== SCOPE_COMPANY;

  if (role.name === SUPER_ADMIN_ROLE) {
    if (scoped) {
      return {
        ...none,
        blocked: "دور مدير النظام لا يُمنح إلا على نطاق «الشركة كاملة».",
      };
    }
    return caller && !callerIsSuperAdmin(caller)
      ? { ...none, blocked: SUPER_ADMIN_ONLY_MESSAGE }
      : none;
  }

  const permissions = Array.isArray(role.permissions) ? role.permissions : [];
  const inert = scoped ? companyOnlyPermissions(permissions) : [];
  const conferred = permissions.filter((name) => !inert.includes(name));

  return {
    blocked: null,
    inert,
    whollyInert: inert.length > 0 && inert.length === permissions.length,
    notHeld: permissionsNotHeld(conferred, caller),
  };
};

/**
 * The permissions an EXISTING grant carries on paper and does nothing with —
 * for a chip, so a holder's 403s have a visible reason. Empty for a company
 * grant, for a role not in the list, or when every permission works.
 *
 * @param grant  a server grant ({ role, scope_type, ... })
 * @param roles  the roles list ({ name, permissions })
 */
export const grantInertPermissions = (grant, roles = []) => {
  if ((Number(grant?.scope_type) || SCOPE_COMPANY) === SCOPE_COMPANY) return [];
  const role = roles.find((r) => r.name === grant.role);
  if (!role || !Array.isArray(role.permissions)) return [];
  return companyOnlyPermissions(role.permissions);
};

/**
 * Whether the caller's own auth.roles.assign reaches the whole company — the
 * server's `isUnrestricted()` for the assigner. /auth/me carries no grants, so
 * this reads the caller's row in the users directory.
 *
 * @param callerRecord  the caller's users-directory row ({ grants }) or null
 * @param roles         the roles list ({ name, permissions })
 * @returns {boolean|null} null when it cannot be told: no directory row, or a
 *   company grant whose role is not in the list. `false` is only as fresh as
 *   the cached roles list, so a caller words it as likely, not certain.
 */
export const assignReachIsCompany = (callerRecord, roles = []) => {
  const grants = callerRecord?.grants;
  if (!Array.isArray(grants)) return null;

  let unknown = false;
  for (const grant of grants) {
    if ((Number(grant.scope_type) || SCOPE_COMPANY) !== SCOPE_COMPANY) continue;
    // Holds no permission rows; its bypass reaches everything.
    if (grant.role === SUPER_ADMIN_ROLE) return true;
    const role = roles.find((r) => r.name === grant.role);
    if (!role || !Array.isArray(role.permissions)) {
      unknown = true;
      continue;
    }
    if (role.permissions.includes(ASSIGN_ROLES_PERMISSION)) return true;
  }
  return unknown ? null : false;
};

/**
 * Whether this employee manages a unit TODAY — the server's
 * `managedUnitIds() !== []`: a unit whose `manager_id` is theirs and whose
 * manager record is live (`manager` is null once that employee is deleted).
 *
 * @param employeeId   the account's `employee_id`
 * @param departments  the raw /departments rows ({ manager_id, manager })
 */
export const managesAnyUnit = (employeeId, departments = []) =>
  employeeId != null &&
  departments.some(
    (d) => Number(d.manager_id) === Number(employeeId) && d.manager != null
  );

/** A stable React key for a grant, unique per user. */
export const grantKey = (grant) =>
  grant?.id != null
    ? `grant-${grant.id}`
    : `${grant?.role}-${grant?.scope_type}-${grantUnitId(grant) ?? ""}`;
