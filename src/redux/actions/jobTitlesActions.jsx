import Swal from "sweetalert2";
import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";

// دليل المسميات الوظيفية — job-title catalogue (API doc §8.2).
//
// ONE shared, company-wide catalogue. There is NO department_id: محاسب is a
// single row with a single job description whichever divisions employ
// accountants. "Which divisions use this title?" is answered by filtering
// employees on job_title_id, not by a column here.

export const JOB_TITLE_SORT_KEYS = Object.freeze([
  "name",
  "-name",
  "created_at",
  "-created_at",
]);

// Boolean filters go over the wire as 1/0. Anything else is a 422, never a
// silent fallback — a filter that is quietly ignored returns a correct-looking
// page of the wrong rows.
// Accepts the shapes a caller can realistically hold: a boolean, the numeric
// 1/0 a URL seed or a code-built preset produces, and the "1"/"0" strings the
// filter selects emit. Matching only `true` and "1" meant boolParam(1) returned
// 0 — asking for described titles and being handed undescribed ones, which is
// exactly the quietly-wrong page this function exists to prevent.
const boolParam = (value) =>
  value === true || value === 1 || value === "1" ? 1 : 0;

const buildListParams = (page, perPage, filters = {}) => {
  const params = { page, per_page: perPage };
  const { search, is_described, is_active, sort } = filters;

  const trimmed = String(search ?? "").trim();
  if (trimmed !== "") params.search = trimmed;
  if (is_described !== "" && is_described != null)
    params.is_described = boolParam(is_described);
  if (is_active !== "" && is_active != null)
    params.is_active = boolParam(is_active);
  if (sort && JOB_TITLE_SORT_KEYS.includes(sort)) params.sort = sort;

  return params;
};

export const fetchJobTitlesStart = (requestId) => ({
  type: "FETCH_JOB_TITLES_START",
  payload: requestId,
});
export const fetchJobTitlesSuccess = (payload) => ({
  type: "FETCH_JOB_TITLES_SUCCESS",
  payload,
});
export const fetchJobTitlesFailure = (payload) => ({
  type: "FETCH_JOB_TITLES_FAILURE",
  payload,
});
export const setUndescribedCount = (count) => ({
  type: "SET_UNDESCRIBED_COUNT",
  payload: count,
});

export const saveJobTitleStart = () => ({ type: "SAVE_JOB_TITLE_START" });
export const saveJobTitleSuccess = () => ({ type: "SAVE_JOB_TITLE_SUCCESS" });
export const saveJobTitleFailure = (error) => ({
  type: "SAVE_JOB_TITLE_FAILURE",
  payload: error,
});

let requestSeq = 0;

export const fetchJobTitles =
  (page = 1, perPage = 10, filters = {}) =>
  async (dispatch) => {
    requestSeq += 1;
    const requestId = requestSeq;
    dispatch(fetchJobTitlesStart(requestId));
    try {
      const response = await api.get("/hr/job-titles", {
        params: buildListParams(page, perPage, filters),
      });
      dispatch(
        fetchJobTitlesSuccess({
          items: response.data.data,
          meta: response.data.meta,
          requestId,
        })
      );
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(fetchJobTitlesFailure({ error: parsed.message, requestId }));
      if (parsed.status !== 403) toastNotify(parsed.message, "error");
    }
  };

// Worklist size for قسم التحليل والتوصيف. Asks for one row and reads
// `meta.total`, so the count costs a single small response rather than a walk
// of every undescribed title.
export const fetchUndescribedCount = () => async (dispatch) => {
  try {
    const response = await api.get("/hr/job-titles", {
      params: { is_described: 0, per_page: 1, page: 1 },
    });
    dispatch(setUndescribedCount(response.data.meta?.total ?? null));
  } catch {
    // A failed count must not break the list it decorates.
    dispatch(setUndescribedCount(null));
  }
};

export const createJobTitle =
  (data, page = 1, perPage = 10, filters = {}) =>
  async (dispatch) => {
    dispatch(saveJobTitleStart());
    try {
      const response = await api.post("/hr/job-titles", data);
      dispatch(saveJobTitleSuccess());
      toastNotify(response.data.message, "success");
      dispatch(fetchJobTitles(page, perPage, filters));
      dispatch(fetchUndescribedCount());
      return response.data.data;
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(saveJobTitleFailure(parsed.message));
      return Promise.reject(parsed);
    }
  };

export const updateJobTitle =
  (id, data, page = 1, perPage = 10, filters = {}) =>
  async (dispatch) => {
    dispatch(saveJobTitleStart());
    try {
      const response = await api.put(`/hr/job-titles/${id}`, data);
      dispatch(saveJobTitleSuccess());
      toastNotify(response.data.message, "success");
      dispatch(fetchJobTitles(page, perPage, filters));
      dispatch(fetchUndescribedCount());
      return response.data.data;
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(saveJobTitleFailure(parsed.message));
      return Promise.reject(parsed);
    }
  };

/**
 * Soft delete.
 *
 * ⚠️ 409 CONFLICT when the title is held by any employee or by any historical
 * posting — and it carries a `message` with NO `errors` object. It is rendered
 * verbatim as a global error and NOT softened into "try again later": a title
 * a payslip was computed against cannot be removed, and telling the user
 * otherwise sends them back to retry something that will never succeed.
 *
 * @returns {Promise<{ok: boolean, conflict?: string}>}
 */
export const deleteJobTitle =
  (id, page, itemsOnPage, perPage = 10, filters = {}) =>
  async (dispatch) => {
    const confirm = await Swal.fire({
      title: "هل أنت متأكد من حذف هذا المسمى الوظيفي؟",
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
    if (!confirm.isConfirmed) return { ok: false };

    try {
      const response = await api.delete(`/hr/job-titles/${id}`);
      toastNotify(response.data.message, "success");
      const nextPage = itemsOnPage === 1 && page > 1 ? page - 1 : page;
      dispatch(fetchJobTitles(nextPage, perPage, filters));
      dispatch(fetchUndescribedCount());
      return { ok: true };
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed.status === 409) {
        // Shown as a persistent panel by the caller, not a toast that vanishes
        // before it has been read.
        return { ok: false, conflict: parsed.message };
      }
      toastNotify(parsed.message, "error");
      return { ok: false };
    }
  };
