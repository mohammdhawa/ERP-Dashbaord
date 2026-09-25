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

export const SCOPE_COMPANY = 1;
export const SCOPE_UNIT = 2;
export const SCOPE_MANAGED = 3;

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

/** A stable React key for a grant, unique per user. */
export const grantKey = (grant) =>
  grant?.id != null
    ? `grant-${grant.id}`
    : `${grant?.role}-${grant?.scope_type}-${grantUnitId(grant) ?? ""}`;
