import test from "node:test";
import assert from "node:assert/strict";
import {
  SCOPE_COMPANY,
  SCOPE_MANAGED,
  SCOPE_UNIT,
  assignReachIsCompany,
  buildGrantBody,
  buildRevokeAllBody,
  describeGrantScope,
  grantAdvisories,
  grantInertPermissions,
  managesAnyUnit,
  revokeGrantBody,
} from "./grantScope.js";

// ── Assign / revoke-one body ────────────────────────────────────────────────

test("a company grant names its scope and carries no unit key", () => {
  assert.deepEqual(
    buildGrantBody({ userId: 5, roleId: 2, scopeType: SCOPE_COMPANY }),
    { user_id: 5, role_id: 2, scope_type: 1 }
  );
});

test("a missing scope defaults to company, the pre-scope meaning", () => {
  assert.deepEqual(buildGrantBody({ userId: "5", roleId: "2" }), {
    user_id: 5,
    role_id: 2,
    scope_type: 1,
  });
});

test("a unit grant carries the unit id", () => {
  assert.deepEqual(
    buildGrantBody({ userId: 5, roleId: 2, scopeType: SCOPE_UNIT, departmentId: "12" }),
    { user_id: 5, role_id: 2, scope_type: 2, scope_department_id: 12 }
  );
});

test("a unit grant without a unit is not a body at all", () => {
  // The server would 422 it; the card disables its button instead.
  assert.equal(buildGrantBody({ userId: 5, roleId: 2, scopeType: SCOPE_UNIT }), null);
});

test("a managed grant never sends scope_department_id — not even null", () => {
  // The server's rule is `missing`: an explicit null beside a non-unit scope
  // is refused, so a leftover unit from switching scopes must not leak in.
  const body = buildGrantBody({
    userId: 5,
    roleId: 2,
    scopeType: SCOPE_MANAGED,
    departmentId: 12,
  });
  assert.deepEqual(body, { user_id: 5, role_id: 2, scope_type: 3 });
  assert.equal(Object.hasOwn(body, "scope_department_id"), false);
});

test("no user or no role is not a body", () => {
  assert.equal(buildGrantBody({ roleId: 2 }), null);
  assert.equal(buildGrantBody({ userId: 5 }), null);
});

// ── Revoke ──────────────────────────────────────────────────────────────────

test("revoke-all sends no scope keys, which revokes every grant of the role", () => {
  assert.deepEqual(buildRevokeAllBody({ userId: 5, roleId: 2 }), {
    user_id: 5,
    role_id: 2,
  });
});

test("revoking one server grant rebuilds its exact scope, role resolved by name", () => {
  const roles = [
    { id: 2, name: "supervisor" },
    { id: 3, name: "clerk" },
  ];
  const grant = {
    id: 7,
    role: "supervisor",
    scope_type: 2,
    scope_label: "وحدة محددة",
    department: { id: 12, name: "قسم الصيانة" },
  };

  assert.deepEqual(revokeGrantBody(5, grant, roles), {
    user_id: 5,
    role_id: 2,
    scope_type: 2,
    scope_department_id: 12,
  });
});

test("a grant whose role is not in the list cannot be revoked by id", () => {
  assert.equal(
    revokeGrantBody(5, { role: "gone", scope_type: 1, department: null }, []),
    null
  );
});

// ── Display ─────────────────────────────────────────────────────────────────

test("a unit grant is described by its unit; the others by the server's label", () => {
  assert.equal(
    describeGrantScope({ scope_type: 2, scope_label: "وحدة محددة", department: { id: 12, name: "قسم الصيانة" } }),
    "قسم الصيانة"
  );
  assert.equal(
    describeGrantScope({ scope_type: 3, scope_label: "الوحدات التي أديرها", department: null }),
    "الوحدات التي أديرها"
  );
  assert.equal(
    describeGrantScope({ scope_type: 1, scope_label: "الشركة كاملة", department: null }),
    "الشركة كاملة"
  );
});

test("a grant with no scope_label still names its scope", () => {
  // The picker's label covers a response that lacks the server's.
  assert.equal(describeGrantScope({ scope_type: 1, department: null }), "الشركة كاملة");
  assert.equal(
    describeGrantScope({ scope_type: 3, department: null }),
    "الوحدات التي أديرها"
  );
});

test("a unit grant whose unit was deleted is still named and revocable by its raw id", () => {
  const roles = [{ id: 2, name: "supervisor" }];
  const orphan = {
    id: 9,
    role: "supervisor",
    scope_type: 2,
    scope_department_id: 12,
    department: null,
  };
  assert.equal(describeGrantScope(orphan), "وحدة #12 (غير متاحة)");
  assert.deepEqual(revokeGrantBody(5, orphan, roles), {
    user_id: 5,
    role_id: 2,
    scope_type: 2,
    scope_department_id: 12,
  });
});

test("a unit grant with no unit id at all cannot be revoked on its own", () => {
  const roles = [{ id: 2, name: "supervisor" }];
  const grant = { id: 9, role: "supervisor", scope_type: 2, department: null };
  assert.equal(revokeGrantBody(5, grant, roles), null);
  assert.equal(describeGrantScope(grant), "وحدة غير متاحة");
});

// ── What the assign card says before sending ────────────────────────────────

const superAdmin = { name: "super_admin", is_system: true, permissions: [] };
const clerk = { name: "clerk", permissions: ["hr.employees.view", "departments.update"] };
const deptEditor = { name: "dept-editor", permissions: ["departments.update"] };
const roleAdmin = { name: "role-admin", permissions: ["auth.roles.view", "auth.roles.assign"] };

test("super_admin over a unit is blocked by name, though it carries no permissions", () => {
  // Found in review: the inert check reads permissions, super_admin has none,
  // so it passed silently to a guaranteed 422.
  for (const scope of [SCOPE_UNIT, SCOPE_MANAGED]) {
    const advice = grantAdvisories(superAdmin, scope);
    assert.equal(advice.blocked, "دور مدير النظام لا يُمنح إلا على نطاق «الشركة كاملة».");
  }
  assert.equal(grantAdvisories(superAdmin, SCOPE_COMPANY).blocked, null);
});

test("inert permissions are reported, never blocking — the cache may be stale", () => {
  const partly = grantAdvisories(clerk, SCOPE_UNIT);
  assert.deepEqual(partly.inert, ["departments.update"]);
  assert.equal(partly.whollyInert, false);
  assert.equal(partly.blocked, null);

  const wholly = grantAdvisories(deptEditor, SCOPE_MANAGED);
  assert.equal(wholly.whollyInert, true);
  assert.equal(wholly.blocked, null);
});

test("nothing is inert company-wide, and no role means no advice", () => {
  assert.deepEqual(grantAdvisories(deptEditor, SCOPE_COMPANY).inert, []);
  assert.deepEqual(grantAdvisories(null, SCOPE_UNIT), {
    blocked: null,
    inert: [],
    whollyInert: false,
    grantsAssign: false,
  });
});

test("auth.roles.assign over a unit is flagged (GAP-16), and only over a unit", () => {
  assert.equal(grantAdvisories(roleAdmin, SCOPE_UNIT).grantsAssign, true);
  assert.equal(grantAdvisories(roleAdmin, SCOPE_COMPANY).grantsAssign, false);
  assert.equal(grantAdvisories(clerk, SCOPE_UNIT).grantsAssign, false);
});

// ── Existing grants that do less than their role says ───────────────────────

test("an existing scoped grant names the permissions it carries in vain", () => {
  const roles = [clerk, deptEditor];
  assert.deepEqual(
    grantInertPermissions({ role: "clerk", scope_type: SCOPE_UNIT }, roles),
    ["departments.update"]
  );
  assert.deepEqual(
    grantInertPermissions({ role: "clerk", scope_type: SCOPE_COMPANY }, roles),
    []
  );
  // A role missing from the list says nothing rather than guessing.
  assert.deepEqual(
    grantInertPermissions({ role: "gone", scope_type: SCOPE_UNIT }, roles),
    []
  );
});

test("a role with no permissions is not wholly inert — the server exempts it", () => {
  const empty = { name: "empty", permissions: [] };
  assert.equal(grantAdvisories(empty, SCOPE_UNIT).whollyInert, false);
});

// ── «الوحدات التي أديرها» to someone who manages nothing ─────────────────────

test("the caller's assign reach is company-wide only through a company grant", () => {
  const roles = [roleAdmin, clerk];
  const caller = (grants) => ({ id: 1, grants });

  assert.equal(
    assignReachIsCompany(caller([{ role: roleAdmin.name, scope_type: SCOPE_COMPANY }]), roles),
    true
  );
  assert.equal(
    assignReachIsCompany(caller([{ role: roleAdmin.name, scope_type: SCOPE_UNIT }]), roles),
    false
  );
  // A company grant of a role without assign reaches nothing to assign with.
  assert.equal(
    assignReachIsCompany(caller([{ role: "clerk", scope_type: SCOPE_COMPANY }]), roles),
    false
  );
  // super_admin carries no permission rows; its bypass reaches everything.
  assert.equal(
    assignReachIsCompany(caller([{ role: "super_admin", scope_type: SCOPE_COMPANY }]), roles),
    true
  );
  // Cannot tell: no directory row, or a company grant of an unknown role.
  assert.equal(assignReachIsCompany(null, roles), null);
  assert.equal(
    assignReachIsCompany(caller([{ role: "gone", scope_type: SCOPE_COMPANY }]), roles),
    null
  );
});

test("an employee manages a unit only through a live manager record", () => {
  const departments = [
    { id: 1, manager_id: 7, manager: { id: 7 } },
    { id: 2, manager_id: 9, manager: null }, // manager soft-deleted
    { id: 3, manager_id: null, manager: null },
  ];
  assert.equal(managesAnyUnit(7, departments), true);
  assert.equal(managesAnyUnit("7", departments), true);
  assert.equal(managesAnyUnit(9, departments), false);
  assert.equal(managesAnyUnit(8, departments), false);
  assert.equal(managesAnyUnit(null, departments), false);
});
