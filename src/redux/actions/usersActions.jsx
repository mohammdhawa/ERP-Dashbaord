import Swal from "sweetalert2";
import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";

// Users admin module — /api/auth/users (full collection, NOT paginated).

export const fetchUsersStart = () => ({ type: "FETCH_USERS_START" });
export const fetchUsersSuccess = (users) => ({
  type: "FETCH_USERS_SUCCESS",
  payload: users,
});
export const fetchUsersFailure = (error) => ({
  type: "FETCH_USERS_FAILURE",
  payload: error,
});

export const saveUserStart = () => ({ type: "SAVE_USER_START" });
export const createUserSuccess = (user) => ({
  type: "CREATE_USER_SUCCESS",
  payload: user,
});
export const updateUserSuccess = (user) => ({
  type: "UPDATE_USER_SUCCESS",
  payload: user,
});
export const saveUserFailure = (error) => ({
  type: "SAVE_USER_FAILURE",
  payload: error,
});

export const deleteUserSuccess = (userId) => ({
  type: "DELETE_USER_SUCCESS",
  payload: userId,
});

export const fetchUsers = () => async (dispatch) => {
  dispatch(fetchUsersStart());
  try {
    // Format B list: `data` is the flat array, no `meta` key.
    const response = await api.get("/auth/users");
    dispatch(fetchUsersSuccess(response.data.data));
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(fetchUsersFailure(parsed.message));
    toastNotify(parsed.message, "error");
  }
};

// Create/update reject with the parsed error so the modal can map the 422
// `errors` bag onto its fields.
export const createUser = (userData) => async (dispatch) => {
  dispatch(saveUserStart());
  try {
    const response = await api.post("/auth/users", userData);
    dispatch(createUserSuccess(response.data.data));
    toastNotify(response.data.message, "success");
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveUserFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const updateUser = (userId, userData) => async (dispatch) => {
  dispatch(saveUserStart());
  try {
    const response = await api.put(`/auth/users/${userId}`, userData);
    dispatch(updateUserSuccess(response.data.data));
    toastNotify(response.data.message, "success");
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveUserFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const deleteUser = (userId) => async (dispatch) => {
  const confirm = await Swal.fire({
    title: "هل أنت متأكد من حذف هذا المستخدم؟",
    text: "لن تتمكن من التراجع عن هذا الإجراء!",
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
    const response = await api.delete(`/auth/users/${userId}`);
    dispatch(deleteUserSuccess(userId));
    toastNotify(response.data.message, "success");
  } catch (error) {
    // 422 here includes the self-deletion business rule
    // ("لا يمكنك حذف حسابك الخاص.") — show the server message directly.
    toastNotify(parseApiError(error).message, "error");
  }
};
