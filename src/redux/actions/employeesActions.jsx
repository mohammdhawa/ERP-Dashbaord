import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify, confirmDestructive } from "../../utils";

// HR Employees module — /api/hr/employees (paginated list + sibling `meta`).
//
// FILTERING IS SERVER-SIDE. Only the documented params are ever sent:
// status, department_id, job_title_id, activity_type, search, sort.
// An unknown `sort` or an invalid filter is a 422, never a silent fallback, so
// undefined/empty values are stripped rather than sent as "" or null.

// Sort keys the server accepts, each optionally prefixed with `-` for
// descending. `full_name` is NOT here: it is a computed accessor with no
// column to sort on, and sending it is a 422.
export const EMPLOYEE_SORT_KEYS = Object.freeze([
  "employee_number",
  "first_name",
  "last_name",
  "hire_date",
  "created_at",
]);

export const isValidEmployeeSort = (sort) => {
  if (!sort) return false;
  return EMPLOYEE_SORT_KEYS.includes(
    sort.startsWith("-") ? sort.slice(1) : sort
  );
};

// Drops empty values so a cleared filter disappears from the query string
// instead of arriving as "" — which the server rejects rather than ignores.
const buildListParams = (page, perPage, filters = {}) => {
  const params = { page, per_page: perPage };
  const { status, department_id, job_title_id, activity_type, search, sort } =
    filters;

  if (status !== "" && status != null) params.status = Number(status);
  if (department_id !== "" && department_id != null)
    params.department_id = Number(department_id);
  if (job_title_id !== "" && job_title_id != null)
    params.job_title_id = Number(job_title_id);
  if (activity_type !== "" && activity_type != null)
    params.activity_type = Number(activity_type);
  const trimmedSearch = String(search ?? "").trim();
  if (trimmedSearch !== "") params.search = trimmedSearch;
  // Never send a sort we cannot vouch for — an unknown one is a 422.
  if (isValidEmployeeSort(sort)) params.sort = sort;

  return params;
};

export const fetchEmployeesStart = (requestId) => ({
  type: "FETCH_EMPLOYEES_START",
  payload: requestId,
});
export const fetchEmployeesSuccess = (payload) => ({
  type: "FETCH_EMPLOYEES_SUCCESS",
  payload, // { items, meta, requestId }
});
export const fetchEmployeesFailure = (payload) => ({
  type: "FETCH_EMPLOYEES_FAILURE",
  payload, // { error, requestId }
});

export const saveEmployeeStart = () => ({ type: "SAVE_EMPLOYEE_START" });
export const saveEmployeeSuccess = () => ({ type: "SAVE_EMPLOYEE_SUCCESS" });
export const saveEmployeeFailure = (error) => ({
  type: "SAVE_EMPLOYEE_FAILURE",
  payload: error,
});

export const fetchEmployeeStart = () => ({ type: "FETCH_EMPLOYEE_START" });
export const fetchEmployeeSuccess = (employee) => ({
  type: "FETCH_EMPLOYEE_SUCCESS",
  payload: employee,
});
export const fetchEmployeeFailure = (error) => ({
  type: "FETCH_EMPLOYEE_FAILURE",
  payload: error,
});
export const clearEmployee = () => ({ type: "CLEAR_EMPLOYEE" });

// Monotonic request id: a slow page-1 response that lands after a fast page-2
// response must not overwrite it. The reducer keeps only the newest.
let listRequestSeq = 0;

export const fetchEmployees =
  (page = 1, perPage = 10, filters = {}) =>
  async (dispatch) => {
    listRequestSeq += 1;
    const requestId = listRequestSeq;
    dispatch(fetchEmployeesStart(requestId));
    try {
      const response = await api.get("/hr/employees", {
        params: buildListParams(page, perPage, filters),
      });
      dispatch(
        fetchEmployeesSuccess({
          items: response.data.data,
          meta: response.data.meta,
          requestId,
        })
      );
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(fetchEmployeesFailure({ error: parsed.message, requestId }));
      // 403 is rendered in place as a permission-denied panel; a toast on top
      // of it would just repeat the same sentence.
      if (parsed.status !== 403) toastNotify(parsed.message, "error");
    }
  };

export const fetchEmployee = (id) => async (dispatch) => {
  dispatch(fetchEmployeeStart());
  try {
    const response = await api.get(`/hr/employees/${id}`);
    dispatch(fetchEmployeeSuccess(response.data.data));
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(fetchEmployeeFailure(parsed));
    return Promise.reject(parsed);
  }
};

export const createEmployee =
  (data, currentPage, perPage = 10, filters = {}) =>
  async (dispatch) => {
    dispatch(saveEmployeeStart());
    try {
      const response = await api.post("/hr/employees", data);
      dispatch(saveEmployeeSuccess());
      toastNotify(response.data.message, "success");
      dispatch(fetchEmployees(currentPage, perPage, filters));
      return response.data.data;
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(saveEmployeeFailure(parsed.message));
      return Promise.reject(parsed);
    }
  };

export const updateEmployee =
  (id, data, currentPage, perPage = 10, filters = {}) =>
  async (dispatch) => {
    dispatch(saveEmployeeStart());
    try {
      const response = await api.put(`/hr/employees/${id}`, data);
      dispatch(saveEmployeeSuccess());
      toastNotify(response.data.message, "success");
      dispatch(fetchEmployees(currentPage, perPage, filters));
      return response.data.data;
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(saveEmployeeFailure(parsed.message));
      return Promise.reject(parsed);
    }
  };

// Used by the profile screen, which has no list page to refresh.
export const updateEmployeeRecord = (id, data) => async (dispatch) => {
  dispatch(saveEmployeeStart());
  try {
    const response = await api.put(`/hr/employees/${id}`, data);
    dispatch(saveEmployeeSuccess());
    toastNotify(response.data.message, "success");
    dispatch(fetchEmployeeSuccess(response.data.data));
    return response.data.data;
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(saveEmployeeFailure(parsed.message));
    return Promise.reject(parsed);
  }
};

export const deleteEmployee =
  (id, currentPage, itemsOnPage, perPage = 10, filters = {}, name) =>
  async (dispatch) => {
    const confirmed = await confirmDestructive({
      action: "حذف الموظف",
      // The employee's own name. Without it the dialog asked about "هذا
      // الموظف" — unverifiable next to a table of forty similar rows.
      subject: name,
      text: "سيُزال الموظف من القوائم ولا يمكنك التراجع عن هذا الإجراء من الواجهة.",
    });
    if (!confirmed) return;

    try {
      const response = await api.delete(`/hr/employees/${id}`);
      toastNotify(response.data.message, "success");
      // Deleting the last row of the last page would land on an empty page —
      // step back one page in that case.
      const nextPage =
        itemsOnPage === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      dispatch(fetchEmployees(nextPage, perPage, filters));
    } catch (error) {
      toastNotify(parseApiError(error).message, "error");
    }
  };
