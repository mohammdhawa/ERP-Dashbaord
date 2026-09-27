import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_PERMISSION_NAMES,
  HONOURED_FROM_SCOPED_GRANT,
  companyOnlyPermissions,
  permissionLabel,
} from "./permissionsCatalog.js";

test("auth.roles.assign is in the catalogue with the server's label", () => {
  // Split out of auth.roles.update on 2026-09-26 (GAP-15). Without the row the
  // role matrix could not grant it, and the assign card would be unreachable.
  assert.ok(ALL_PERMISSION_NAMES.includes("auth.roles.assign"));
  assert.equal(permissionLabel("auth.roles.assign"), "إسناد الأدوار للمستخدمين");
  assert.equal(ALL_PERMISSION_NAMES.length, 31);
});

test("every permission a scoped grant confers is a real permission", () => {
  // A typo here would make the warning claim a working permission is inert.
  assert.deepEqual(
    HONOURED_FROM_SCOPED_GRANT.filter((name) => !ALL_PERMISSION_NAMES.includes(name)),
    []
  );
});

test("the company-only set matches the server's, written out in full", () => {
  // Mirrors PermissionReachTest on the backend. If the two lists stop
  // agreeing, the assign card's warning is wrong — never the access, which the
  // server decides and /auth/me reports.
  const companyOnly = companyOnlyPermissions(ALL_PERMISSION_NAMES).sort();
  assert.deepEqual(companyOnly, [
    "auth.audit.view",
    "auth.audit.viewValues",
    "auth.roles.create",
    "auth.roles.delete",
    "auth.roles.update",
    "auth.users.create",
    "auth.users.delete",
    "auth.users.update",
    "auth.users.view",
    "departments.create",
    "departments.delete",
    "departments.update",
    "hr.job_titles.create",
    "hr.job_titles.delete",
    "hr.job_titles.update",
  ]);
});

test("a role's inert permissions are the company-only ones it carries", () => {
  assert.deepEqual(
    companyOnlyPermissions(["hr.employees.view", "departments.update", "auth.roles.view"]),
    ["departments.update"]
  );
  assert.deepEqual(companyOnlyPermissions([]), []);
  assert.deepEqual(companyOnlyPermissions(), []);
});
