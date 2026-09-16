import api from "../api";
import { parseApiError, fetchAllPages } from "../../utils/apiHelpers";
import { toastNotify, confirmDestructive } from "../../utils";

// Users admin module — /api/auth/users.
//
// ⚠️ THIS ENDPOINT IS NOW PAGINATED. It used to return the full collection with
// no `meta`, and this module stored that array wholesale. Since the API change
// it returns 15 rows by default, so the old code silently showed only the first
// page and reported it as the whole list — with 242 employees arriving in Batch
// 4, that is most of the directory quietly missing. It now follows the same
// server-pagination shape as departments: { items, meta } plus a page argument.

export const fetchUsersStart = (requestId) => ({
  type: "FETCH_USERS_START",
  payload: requestId,
});
export const fetchUsersSuccess = (payload) => ({
  type: "FETCH_USERS_SUCCESS",
  payload, // { items, meta }
});
export const fetchUsersFailure = (payload) => ({
  type: "FETCH_USERS_FAILURE",
  payload, // { error, requestId }
});

export const fetchAllUsersStart = () => ({ type: "FETCH_ALL_USERS_START" });
export const fetchAllUsersSuccess = (users) => ({
  type: "FETCH_ALL_USERS_SUCCESS",
  payload: users,
});
export const fetchAllUsersFailure = (error) => ({
  type: "FETCH_ALL_USERS_FAILURE",
  payload: error,
});
// Marks the cached directory stale after a mutation, so the next search walks
// the pages again instead of matching against rows that no longer exist.
export const invalidateUsersDirectory = () => ({
  type: "INVALIDATE_USERS_DIRECTORY",
});

export const saveUserStart = () => ({ type: "SAVE_USER_START" });
export const saveUserDone = () => ({ type: "SAVE_USER_DONE" });
export const saveUserFailure = (error) => ({
  type: "SAVE_USER_FAILURE",
  payload: error,
});

// Monotonic request id so a slow response for an abandoned page cannot
// overwrite the rows already on screen.
let usersRequestSeq = 0;

export const fetchUsers = (page = 1, perPage) => async (dispatch) => {
  usersRequestSeq += 1;
  const requestId = usersRequestSeq;
  dispatch(fetchUsersStart(requestId));
  try {
    // `per_page` is honoured by the API (default 15, clamped 1-100). Omitting
    // it lets the server default apply rather than hardcoding a size here.
    const params = perPage ? { page, per_page: perPage } : { page };
    const response = await api.get("/auth/users", { params });
    dispatch(
      fetchUsersSuccess({
        items: response.data.data,
        meta: response.data.meta,
        requestId,
      })
    );
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(fetchUsersFailure({ error: parsed.message, requestId }));
    toastNotify(parsed.message, "error");
  }
};

// Create/update reject with the parsed error so the modal can map the 422
// `errors` bag onto its fields.
// `perPage` is threaded through every mutation on purpose. Re-fetching without
// it drops back to the server default of 15, so a user who had chosen 50 or 100
// rows silently loses that choice the moment they create, edit or delete one.
export const createUser =
  (userData, currentPage = 1, perPage) => async (dispatch) => {
  dispatch(saveUserStart());
  try {
    const response = await api.post("/auth/users", userData);
    dispatch(saveUserDone());
    toastNotify(response.data.message, "success");
    // Re-fetch rather than splicing into the local array: the row's position is
    // decided by the server's ordering, not by when we happened to create it.
    dispatch(fetchUsers(currentPage, perPage));
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveUserFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const updateUser =
  (userId, userData, currentPage = 1, perPage) => async (dispatch) => {
  dispatch(saveUserStart());
  try {
    const response = await api.put(`/auth/users/${userId}`, userData);
    dispatch(saveUserDone());
    toastNotify(response.data.message, "success");
    dispatch(fetchUsers(currentPage, perPage));
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveUserFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const deleteUser =
  (userId, currentPage = 1, itemsOnPage, perPage, name) =>
  async (dispatch) => {
  const confirmed = await confirmDestructive({
    action: "حذف المستخدم",
    // The caller passes the linked employee's name, falling back to the email.
    // An account with neither is unnamed rather than labelled with its id.
    subject: name,
    text: "لن تتمكن من التراجع عن هذا الإجراء!",
  });
  if (!confirmed) return;

  try {
    const response = await api.delete(`/auth/users/${userId}`);
    toastNotify(response.data.message, "success");
    dispatch(invalidateUsersDirectory());
    // Deleting the last row of the last page would land on an empty page —
    // step back one, the same repair the departments/employees lists do.
    const nextPage =
      itemsOnPage === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
    dispatch(fetchUsers(nextPage, perPage));
  } catch (error) {
    // 422 here includes the self-deletion business rule
    // ("لا يمكنك حذف حسابك الخاص.") — show the server message directly.
    toastNotify(parseApiError(error).message, "error");
  }
};

// Every user, flattened across pages.
//
// Two consumers: the role-assignment picker (a picker that stops at page 1
// cannot grant a role to user #200 and gives no hint that it is truncated) and
// the directory SEARCH on the users list.
//
// ⚠️ THE SEARCH USE IS A STAND-IN, NOT THE DESTINATION. `/api/auth/users`
// accepts `page` and `per_page` and nothing else — no `search`, unlike
// `/hr/employees` and `/hr/job-titles`, which both document one. Until it has
// one, searching the directory means holding the directory, and this walks it
// in ceil(total/100) requests. That is fine at the 242 accounts this system is
// sized for and is NOT fine at several thousand: when `auth/users.index` grows
// an allow-listed `?search=`, move the users list onto it and this call goes
// back to serving the picker alone.
export const fetchAllUsers = () => async (dispatch) => {
  dispatch(fetchAllUsersStart());
  try {
    dispatch(fetchAllUsersSuccess(await fetchAllPages(api, "/auth/users")));
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(fetchAllUsersFailure(parsed.message));
    toastNotify(parsed.message, "error");
  }
};
