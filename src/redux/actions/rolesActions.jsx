import api from "../api";
import { parseApiError, fetchAllPages } from "../../utils/apiHelpers";
import { toastNotify, confirmDestructive } from "../../utils";
import { refreshCurrentUser } from "./authActions";

// Roles & RBAC module — /api/auth/roles.
//
// ⚠️ THIS ENDPOINT IS NOW PAGINATED (it returned the full collection before),
// so there are two distinct reads and they are not interchangeable:
//   fetchRoles(page)  — one page + meta, for the roles TABLE.
//   fetchAllRoles()   — every page flattened, for the assignment DROPDOWN,
//                       which is useless if it silently stops at 15 roles.

export const fetchRolesStart = (requestId) => ({
  type: "FETCH_ROLES_START",
  payload: requestId,
});
export const fetchRolesSuccess = (payload) => ({
  type: "FETCH_ROLES_SUCCESS",
  payload, // { items, meta }
});
export const fetchAllRolesSuccess = (roles) => ({
  type: "FETCH_ALL_ROLES_SUCCESS",
  payload: roles,
});
export const fetchRolesFailure = (payload) => ({
  type: "FETCH_ROLES_FAILURE",
  payload, // { error, requestId }
});

export const saveRoleStart = () => ({ type: "SAVE_ROLE_START" });
export const saveRoleDone = () => ({ type: "SAVE_ROLE_DONE" });
export const createRoleSuccess = (role) => ({
  type: "CREATE_ROLE_SUCCESS",
  payload: role,
});
export const updateRoleSuccess = (role) => ({
  type: "UPDATE_ROLE_SUCCESS",
  payload: role,
});
export const saveRoleFailure = (error) => ({
  type: "SAVE_ROLE_FAILURE",
  payload: error,
});
export const deleteRoleSuccess = (roleId) => ({
  type: "DELETE_ROLE_SUCCESS",
  payload: roleId,
});

// Monotonic request id so a slow response for an abandoned page cannot
// overwrite the rows already on screen.
let rolesRequestSeq = 0;

export const fetchRoles = (page = 1, perPage) => async (dispatch) => {
  rolesRequestSeq += 1;
  const requestId = rolesRequestSeq;
  dispatch(fetchRolesStart(requestId));
  try {
    const params = perPage ? { page, per_page: perPage } : { page };
    const response = await api.get("/auth/roles", { params });
    dispatch(
      fetchRolesSuccess({
        items: response.data.data,
        meta: response.data.meta,
        requestId,
      })
    );
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(fetchRolesFailure({ error: parsed.message, requestId }));
    toastNotify(parsed.message, "error");
  }
};

// Every role, for the assign/unassign picker. Roles are a small bounded set, so
// walking the pages is cheap; a table must never do this.
export const fetchAllRoles = () => async (dispatch) => {
  try {
    dispatch(fetchAllRolesSuccess(await fetchAllPages(api, "/auth/roles")));
  } catch (error) {
    toastNotify(parseApiError(error).message, "error");
  }
};

// perPage is threaded through mutations so a chosen page size survives them.
export const createRole =
  (roleData, currentPage = 1, perPage) => async (dispatch, getState) => {
  dispatch(saveRoleStart());
  try {
    const response = await api.post("/auth/roles", roleData);
    dispatch(saveRoleDone());
    dispatch(fetchRoles(currentPage, perPage));
    dispatch(refreshAssignmentRoles(getState));
    toastNotify(response.data.message, "success");
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveRoleFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

/**
 * Refreshes the flattened all-roles list ONLY when something consumes it.
 *
 * `allItems` exists for the assign/unassign picker, which Roles.jsx renders
 * behind `auth.roles.update`. An admin holding only auth.roles.create never
 * sees that card, so firing fetchAllRoles() after every mutation walked up to
 * 20 pages to populate a slice nothing reads — two extra round trips per save,
 * discarded on arrival. The same permission that gates the card gates the load.
 */
const refreshAssignmentRoles = (getState) => (dispatch) => {
  const permissions = getState()?.auth?.permissions || [];
  if (permissions.includes("auth.roles.update")) dispatch(fetchAllRoles());
};

/**
 * Re-pulls /auth/me when the changed role is one the CURRENT user holds.
 *
 * Permissions are cached in auth state at login and every gate in the UI reads
 * that cache, so editing a role the signed-in admin holds otherwise leaves them
 * looking at a stale menu: newly granted screens stay hidden and revoked
 * buttons stay clickable until a manual reload.
 *
 * ⚠️ RESOLVED BY ID, VIA THE NAME THE ROLE HAD BEFORE THE WRITE.
 * `auth.user.roles` is an array of role NAMES captured at login. Comparing it
 * against the name the server echoes back is wrong the moment an edit RENAMES
 * the role: the response says "supervisor" while the cache still says
 * "manager", the membership test fails, and the one case most likely to change
 * the admin's own access silently skips its refresh. The role's id is stable
 * across a rename, so the id is resolved to its pre-write name here.
 *
 * Scoped to the user's own roles on purpose — a role they do not hold cannot
 * change their permissions, and an unconditional /auth/me on every role edit
 * would be a request that answers nothing.
 */
const holdsRole = (state, roleName) => {
  if (!roleName) return false;
  return (state?.auth?.user?.roles || []).includes(roleName);
};

// The name as it stands BEFORE the write, looked up by the stable id.
const roleNameBeforeWrite = (state, roleId) =>
  (state?.roles?.items || []).find((r) => r.id === roleId)?.name;

// What to CALL the role when speaking to the user: the Arabic label if the role
// has one, else the machine name. Resolved from the same loaded page as above,
// so the delete confirmation can name the role without the caller passing it
// down — the table row is already in state, addressed by the id we were given.
const roleDisplayName = (state, roleId) => {
  const role = (state?.roles?.items || []).find((r) => r.id === roleId);
  return role?.label || role?.name;
};

const refreshOwnPermissionsIfAffected = (getState, roleName) => (dispatch) => {
  if (holdsRole(getState(), roleName)) dispatch(refreshCurrentUser());
};

// ⚠️ Sending `permissions` REPLACES the role's whole permission set (sync);
// an empty array strips every permission. The role form warns before that.
// Omit the key entirely to leave permissions untouched.
export const updateRole =
  (roleId, roleData, currentPage = 1, perPage) => async (dispatch, getState) => {
  // Captured before the write: an edit may rename the role, and the cached
  // membership list still refers to it by its old name.
  const nameBeforeWrite = roleNameBeforeWrite(getState(), roleId);
  dispatch(saveRoleStart());
  try {
    const response = await api.put(`/auth/roles/${roleId}`, roleData);
    dispatch(saveRoleDone());
    dispatch(fetchRoles(currentPage, perPage));
    dispatch(refreshAssignmentRoles(getState));
    // Match on the PRE-write name (falling back to the echoed one for a role
    // that was not in the loaded page), so a rename still refreshes.
    dispatch(
      refreshOwnPermissionsIfAffected(
        getState,
        nameBeforeWrite || response.data.data?.name
      )
    );
    toastNotify(response.data.message, "success");
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveRoleFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const deleteRole =
  (roleId, currentPage = 1, itemsOnPage, perPage) =>
  async (dispatch, getState) => {
  // Captured BEFORE the delete: afterwards the row is gone from state and there
  // is no way to tell whether it was one of the current user's roles.
  const deletedRoleName = roleNameBeforeWrite(getState(), roleId);

  const confirmed = await confirmDestructive({
    action: "حذف الدور",
    subject: roleDisplayName(getState(), roleId),
    text: "سيفقد جميع المستخدمين المرتبطين به صلاحياته!",
  });
  if (!confirmed) return;

  try {
    const response = await api.delete(`/auth/roles/${roleId}`);
    // Deleting the last row of the last page would land on an empty page.
    const nextPage =
      itemsOnPage === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
    dispatch(fetchRoles(nextPage, perPage));
    dispatch(refreshAssignmentRoles(getState));
    // Losing a role strips its permissions from everyone who held it, the
    // signed-in admin included — their cached gates are now wrong.
    dispatch(refreshOwnPermissionsIfAffected(getState, deletedRoleName));
    toastNotify(response.data.message, "success");
  } catch (error) {
    // 409 protects system roles (is_system): "لا يمكن تعديل أو حذف دور نظام."
    // Surface the server's Arabic conflict/validation message verbatim.
    toastNotify(parseApiError(error).message, "error");
  }
};

// Role grants live on dedicated endpoints (single source of truth for RBAC
// changes) — NOT on the user create/update payloads.
//
// ⚙️ Both take a prepared BODY since 2026-09-24 (GAP-3): a grant is a role plus
// a scope, and the scope keys follow rules the builders in
// sections/rbac/grantScope.js own (`scope_department_id` only for a unit, and
// no scope at all on /unassign to revoke every grant of the role). The
// response's `data` is the user, now carrying `grants` — it is patched straight
// into the users slice, so the grants list is current the moment the request
// resolves instead of after a walk of the whole directory.
const roleAssignmentChanged = (user) => ({
  type: "ROLE_ASSIGNMENT_CHANGED",
  payload: user,
});

export const assignRole = (body) => async (dispatch) => {
  try {
    const response = await api.post("/auth/roles/assign", body);
    toastNotify(response.data.message, "success");
    dispatch(roleAssignmentChanged(response.data.data));
    return response.data;
  } catch (error) {
    const parsed = parseApiError(error);
    toastNotify(parsed.message, "error");
    return Promise.reject(parsed);
  }
};

export const unassignRole = (body) => async (dispatch) => {
  try {
    const response = await api.post("/auth/roles/unassign", body);
    toastNotify(response.data.message, "success");
    dispatch(roleAssignmentChanged(response.data.data));
    return response.data;
  } catch (error) {
    const parsed = parseApiError(error);
    toastNotify(parsed.message, "error");
    return Promise.reject(parsed);
  }
};
