import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";

// سجل التعيين — posting history (API doc §8.3).
//
// ⚠️ APPEND-ONLY. There is no update and no delete endpoint, and no permission
// that could reach one: a posting recorded wrongly is corrected by recording
// the correction, the way a ledger is. Editing last year's posting would change
// what a payslip was computed against with no trace of the original. This file
// deliberately exports no updateAssignment / deleteAssignment.

export const fetchAssignmentsStart = (requestId) => ({
  type: "FETCH_ASSIGNMENTS_START",
  payload: requestId,
});
export const fetchAssignmentsSuccess = (payload) => ({
  type: "FETCH_ASSIGNMENTS_SUCCESS",
  payload, // { items, meta, requestId }
});
export const fetchAssignmentsFailure = (payload) => ({
  type: "FETCH_ASSIGNMENTS_FAILURE",
  payload, // { error, requestId }
});

export const saveAssignmentStart = () => ({ type: "SAVE_ASSIGNMENT_START" });
export const saveAssignmentSuccess = () => ({
  type: "SAVE_ASSIGNMENT_SUCCESS",
});
export const saveAssignmentFailure = (error) => ({
  type: "SAVE_ASSIGNMENT_FAILURE",
  payload: error,
});

let requestSeq = 0;

export const fetchAssignments =
  (employeeId, page = 1, perPage = 10) =>
  async (dispatch) => {
    requestSeq += 1;
    const requestId = requestSeq;
    dispatch(fetchAssignmentsStart(requestId));
    try {
      const response = await api.get(`/hr/employees/${employeeId}/assignments`, {
        params: { page, per_page: perPage },
      });
      dispatch(
        fetchAssignmentsSuccess({
          items: response.data.data,
          meta: response.data.meta,
          requestId,
        })
      );
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(fetchAssignmentsFailure({ error: parsed.message, requestId }));
    }
  };

/**
 * Records a posting.
 *
 * ⚠️ OMITTING a field carries the CURRENT value forward; an explicit `null`
 * CLEARS it. Those are different instructions and the caller must have already
 * decided which it means — this action passes the body through untouched and
 * never fills in a "helpful" default, because a promotion that restated the
 * department would be indistinguishable from one that moved the person.
 */
export const createAssignment =
  (employeeId, data, page = 1, perPage = 10) =>
  async (dispatch) => {
    dispatch(saveAssignmentStart());
    try {
      const response = await api.post(
        `/hr/employees/${employeeId}/assignments`,
        data
      );
      dispatch(saveAssignmentSuccess());
      toastNotify(response.data.message, "success");
      // The posting also mutates the employee's own department / job title /
      // grade, so the record is refetched by the screen after this resolves.
      await dispatch(fetchAssignments(employeeId, page, perPage));
      return response.data.data;
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(saveAssignmentFailure(parsed.message));
      return Promise.reject(parsed);
    }
  };
