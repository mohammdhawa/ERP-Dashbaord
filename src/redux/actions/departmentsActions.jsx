import api from "../api";
import { parseApiError, fetchAllPages } from "../../utils/apiHelpers";
import { toastNotify, confirmDestructive } from "../../utils";

// Departments module — /api/departments (Format A: paginated, 15/page,
// items in `data` + sibling `meta` block).

export const fetchDepartmentsStart = () => ({ type: "FETCH_DEPARTMENTS_START" });
export const fetchDepartmentsSuccess = (payload) => ({
  type: "FETCH_DEPARTMENTS_SUCCESS",
  payload, // { items, meta }
});
export const fetchDepartmentsFailure = (error) => ({
  type: "FETCH_DEPARTMENTS_FAILURE",
  payload: error,
});

export const fetchAllDepartmentsStart = () => ({
  type: "FETCH_ALL_DEPARTMENTS_START",
});
export const fetchAllDepartmentsSuccess = (items) => ({
  type: "FETCH_ALL_DEPARTMENTS_SUCCESS",
  payload: items,
});
export const fetchAllDepartmentsFailure = (error) => ({
  type: "FETCH_ALL_DEPARTMENTS_FAILURE",
  payload: error,
});
export const invalidateDepartmentTree = () => ({
  type: "INVALIDATE_DEPARTMENT_TREE",
});

export const saveDepartmentStart = () => ({ type: "SAVE_DEPARTMENT_START" });
export const saveDepartmentSuccess = () => ({ type: "SAVE_DEPARTMENT_SUCCESS" });
export const saveDepartmentFailure = (error) => ({
  type: "SAVE_DEPARTMENT_FAILURE",
  payload: error,
});

export const fetchDepartments = (page = 1) => async (dispatch) => {
  dispatch(fetchDepartmentsStart());
  try {
    const response = await api.get("/departments", {
      params: { page },
    });
    dispatch(
      fetchDepartmentsSuccess({
        items: response.data.data,
        meta: response.data.meta,
      })
    );
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(fetchDepartmentsFailure(parsed.message));
    toastNotify(parsed.message, "error");
  }
};

// The WHOLE tree, walked page by page.
//
// The list needs it for three things a single page cannot give: the parent
// column (the resource carries `parent_id` but no embedded `parent`, and the
// parent is usually on another page), the search, and the hierarchy view. The
// set is an org chart, not a directory — a root, a few divisions, their
// sections and offices — so `fetchAllPages` at 100/request is one or two calls.
export const fetchAllDepartments = () => async (dispatch) => {
  dispatch(fetchAllDepartmentsStart());
  try {
    dispatch(
      fetchAllDepartmentsSuccess(await fetchAllPages(api, "/departments"))
    );
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(fetchAllDepartmentsFailure(parsed.message));
    toastNotify(parsed.message, "error");
  }
};

// After create/update/delete the page is re-fetched instead of patched locally,
// so item ordering and the `meta` counters stay consistent with the server.
export const createDepartment =
  (data, currentPage) => async (dispatch) => {
  dispatch(saveDepartmentStart());
  try {
    const response = await api.post("/departments", data);
    dispatch(saveDepartmentSuccess());
    toastNotify(response.data.message, "success");
    await dispatch(fetchDepartments(currentPage));
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveDepartmentFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const updateDepartment =
  (id, data, currentPage) => async (dispatch) => {
  dispatch(saveDepartmentStart());
  try {
    const response = await api.patch(`/departments/${id}`, data);
    dispatch(saveDepartmentSuccess());
    toastNotify(response.data.message, "success");
    // Always read the page again. A move can change the resolved sector of the
    // unit and its descendants, and the client must not guess those values.
    await dispatch(fetchDepartments(currentPage));
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveDepartmentFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const deleteDepartment =
  (id, currentPage, itemsOnPage, name) => async (dispatch) => {
  const confirmed = await confirmDestructive({
    action: "حذف الوحدة التنظيمية",
    subject: name,
    text: "لن تتمكن من التراجع عن هذا الإجراء!",
  });
  if (!confirmed) return;

  try {
    const response = await api.delete(`/departments/${id}`);
    toastNotify(response.data.message, "success");
    // The cached tree now names a unit that no longer exists.
    dispatch(invalidateDepartmentTree());
    // Deleting the last row of the last page would land on an empty page —
    // step back one page in that case.
    const nextPage =
      itemsOnPage === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
    dispatch(fetchDepartments(nextPage));
  } catch (error) {
    toastNotify(parseApiError(error).message, "error");
  }
};
