import test from "node:test";
import assert from "node:assert/strict";
import {
  SCOPE_COMPANY,
  SCOPE_MANAGED,
  SCOPE_UNIT,
  buildGrantBody,
  buildRevokeAllBody,
  describeGrantScope,
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
