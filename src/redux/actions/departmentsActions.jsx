import Swal from "sweetalert2";
import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";

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

export const saveDepartmentStart = () => ({ type: "SAVE_DEPARTMENT_START" });
export const saveDepartmentSuccess = () => ({ type: "SAVE_DEPARTMENT_SUCCESS" });
export const saveDepartmentFailure = (error) => ({
  type: "SAVE_DEPARTMENT_FAILURE",
  payload: error,
});

export const fetchDepartments = (page = 1) => async (dispatch) => {
  dispatch(fetchDepartmentsStart());
  try {
    const response = await api.get("/departments", { params: { page } });
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

// After create/update/delete the page is re-fetched instead of patched locally,
// so item ordering and the `meta` counters stay consistent with the server.
export const createDepartment = (data, currentPage) => async (dispatch) => {
  dispatch(saveDepartmentStart());
  try {
    const response = await api.post("/departments", data);
    dispatch(saveDepartmentSuccess());
    toastNotify(response.data.message, "success");
    dispatch(fetchDepartments(currentPage));
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveDepartmentFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const updateDepartment = (id, data, currentPage) => async (dispatch) => {
  dispatch(saveDepartmentStart());
  try {
    const response = await api.put(`/departments/${id}`, data);
    dispatch(saveDepartmentSuccess());
    toastNotify(response.data.message, "success");
    dispatch(fetchDepartments(currentPage));
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveDepartmentFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const deleteDepartment = (id, currentPage, itemsOnPage) => async (dispatch) => {
  const confirm = await Swal.fire({
    title: "هل أنت متأكد من حذف هذه الوحدة التنظيمية؟",
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
    const response = await api.delete(`/departments/${id}`);
    toastNotify(response.data.message, "success");
    // Deleting the last row of the last page would land on an empty page —
    // step back one page in that case.
    const nextPage =
      itemsOnPage === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
    dispatch(fetchDepartments(nextPage));
  } catch (error) {
    toastNotify(parseApiError(error).message, "error");
  }
};
