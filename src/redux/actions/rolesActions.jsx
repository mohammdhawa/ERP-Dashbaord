import Swal from "sweetalert2";
import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";

// Roles & RBAC module — /api/auth/roles (full collection, NOT paginated).

export const fetchRolesStart = () => ({ type: "FETCH_ROLES_START" });
export const fetchRolesSuccess = (roles) => ({
  type: "FETCH_ROLES_SUCCESS",
  payload: roles,
});
export const fetchRolesFailure = (error) => ({
  type: "FETCH_ROLES_FAILURE",
  payload: error,
});

export const saveRoleStart = () => ({ type: "SAVE_ROLE_START" });
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

export const fetchRoles = () => async (dispatch) => {
  dispatch(fetchRolesStart());
  try {
    const response = await api.get("/auth/roles");
    dispatch(fetchRolesSuccess(response.data.data));
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(fetchRolesFailure(parsed.message));
    toastNotify(parsed.message, "error");
  }
};

export const createRole = (roleData) => async (dispatch) => {
  dispatch(saveRoleStart());
  try {
    const response = await api.post("/auth/roles", roleData);
    dispatch(createRoleSuccess(response.data.data));
    toastNotify(response.data.message, "success");
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveRoleFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

// ⚠️ Sending `permissions` REPLACES the role's whole permission set (sync);
// an empty array strips every permission. The role form warns before that.
// Omit the key entirely to leave permissions untouched.
export const updateRole = (roleId, roleData) => async (dispatch) => {
  dispatch(saveRoleStart());
  try {
    const response = await api.put(`/auth/roles/${roleId}`, roleData);
    dispatch(updateRoleSuccess(response.data.data));
    toastNotify(response.data.message, "success");
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveRoleFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const deleteRole = (roleId) => async (dispatch) => {
  const confirm = await Swal.fire({
    title: "هل أنت متأكد من حذف هذا الدور؟",
    text: "سيفقد جميع المستخدمين المرتبطين به صلاحياته!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "حذف",
    cancelButtonText: "إلغاء",
    reverseButtons: true,
    customClass: {
      confirmButton: "btn btn-danger me-2",
      cancelButton: "btn btn-light me-2",
    },
    buttonsStyling: false,
  });
  if (!confirm.isConfirmed) return;

  try {
    const response = await api.delete(`/auth/roles/${roleId}`);
    dispatch(deleteRoleSuccess(roleId));
    toastNotify(response.data.message, "success");
  } catch (error) {
    // 422 covers the protected seeded admin role ("لا يمكن حذف دور المدير").
    toastNotify(parseApiError(error).message, "error");
  }
};

// Role grants live on dedicated endpoints (single source of truth for RBAC
// changes) — NOT on the user create/update payloads.
export const assignRole = (userId, roleId) => async (dispatch) => {
  try {
    const response = await api.post("/auth/roles/assign", {
      user_id: userId,
      role_id: roleId,
    });
    toastNotify(response.data.message, "success");
    dispatch({ type: "ROLE_ASSIGNMENT_CHANGED" });
    return response.data;
  } catch (error) {
    const parsed = parseApiError(error);
    toastNotify(parsed.message, "error");
    return Promise.reject(parsed);
  }
};

export const unassignRole = (userId, roleId) => async (dispatch) => {
  try {
    const response = await api.post("/auth/roles/unassign", {
      user_id: userId,
      role_id: roleId,
    });
    toastNotify(response.data.message, "success");
    dispatch({ type: "ROLE_ASSIGNMENT_CHANGED" });
    return response.data;
  } catch (error) {
    const parsed = parseApiError(error);
    toastNotify(parsed.message, "error");
    return Promise.reject(parsed);
  }
};
