import Swal from "sweetalert2";
import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";

// HR Employees module — /api/hr/employees (Format A: paginated, 15/page).

export const fetchEmployeesStart = () => ({ type: "FETCH_EMPLOYEES_START" });
export const fetchEmployeesSuccess = (payload) => ({
  type: "FETCH_EMPLOYEES_SUCCESS",
  payload, // { items, meta }
});
export const fetchEmployeesFailure = (error) => ({
  type: "FETCH_EMPLOYEES_FAILURE",
  payload: error,
});

export const saveEmployeeStart = () => ({ type: "SAVE_EMPLOYEE_START" });
export const saveEmployeeSuccess = () => ({ type: "SAVE_EMPLOYEE_SUCCESS" });
export const saveEmployeeFailure = (error) => ({
  type: "SAVE_EMPLOYEE_FAILURE",
  payload: error,
});

export const fetchEmployees = (page = 1) => async (dispatch) => {
  dispatch(fetchEmployeesStart());
  try {
    const response = await api.get("/hr/employees", { params: { page } });
    dispatch(
      fetchEmployeesSuccess({
        items: response.data.data,
        meta: response.data.meta,
      })
    );
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(fetchEmployeesFailure(parsed.message));
    toastNotify(parsed.message, "error");
  }
};

export const createEmployee = (data, currentPage) => async (dispatch) => {
  dispatch(saveEmployeeStart());
  try {
    const response = await api.post("/hr/employees", data);
    dispatch(saveEmployeeSuccess());
    toastNotify(response.data.message, "success");
    dispatch(fetchEmployees(currentPage));
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveEmployeeFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const updateEmployee = (id, data, currentPage) => async (dispatch) => {
  dispatch(saveEmployeeStart());
  try {
    const response = await api.put(`/hr/employees/${id}`, data);
    dispatch(saveEmployeeSuccess());
    toastNotify(response.data.message, "success");
    dispatch(fetchEmployees(currentPage));
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveEmployeeFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const deleteEmployee = (id, currentPage, itemsOnPage) => async (dispatch) => {
  const confirm = await Swal.fire({
    title: "هل أنت متأكد من حذف هذا الموظف؟",
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
    const response = await api.delete(`/hr/employees/${id}`);
    toastNotify(response.data.message, "success");
    const nextPage =
      itemsOnPage === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
    dispatch(fetchEmployees(nextPage));
  } catch (error) {
    toastNotify(parseApiError(error).message, "error");
  }
};
