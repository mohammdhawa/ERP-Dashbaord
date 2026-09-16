import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify, confirmDestructive } from "../../utils";

// الإنذارات — warnings (API doc §8.4).
//
// Note the asymmetric paths: create is NESTED under the employee, while update
// and delete address /hr/warnings/{warning} directly — the row's employee is
// fixed by its foreign key and cannot be changed by moving the URL.
//
// `sequence` is COMPUTED by the server from the live rows, not stored: with-
// drawing #2 of 3 renumbers the third to #2. It is displayed, never sent.

export const fetchWarningsStart = (requestId) => ({
  type: "FETCH_WARNINGS_START",
  payload: requestId,
});
export const fetchWarningsSuccess = (payload) => ({
  type: "FETCH_WARNINGS_SUCCESS",
  payload, // { items, meta, requestId }
});
export const fetchWarningsFailure = (payload) => ({
  type: "FETCH_WARNINGS_FAILURE",
  payload, // { error, requestId }
});

export const saveWarningStart = () => ({ type: "SAVE_WARNING_START" });
export const saveWarningSuccess = () => ({ type: "SAVE_WARNING_SUCCESS" });
export const saveWarningFailure = (error) => ({
  type: "SAVE_WARNING_FAILURE",
  payload: error,
});

let requestSeq = 0;

export const fetchWarnings =
  (employeeId, page = 1, perPage = 10) =>
  async (dispatch) => {
    requestSeq += 1;
    const requestId = requestSeq;
    dispatch(fetchWarningsStart(requestId));
    try {
      const response = await api.get(`/hr/employees/${employeeId}/warnings`, {
        params: { page, per_page: perPage },
      });
      dispatch(
        fetchWarningsSuccess({
          items: response.data.data,
          meta: response.data.meta,
          requestId,
        })
      );
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(fetchWarningsFailure({ error: parsed.message, requestId }));
    }
  };

export const createWarning =
  (employeeId, data, page = 1, perPage = 10) =>
  async (dispatch) => {
    dispatch(saveWarningStart());
    try {
      const response = await api.post(
        `/hr/employees/${employeeId}/warnings`,
        data
      );
      dispatch(saveWarningSuccess());
      toastNotify(response.data.message, "success");
      await dispatch(fetchWarnings(employeeId, page, perPage));
      return response.data.data;
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(saveWarningFailure(parsed.message));
      return Promise.reject(parsed);
    }
  };

// NOT nested: the warning is addressed directly.
export const updateWarning =
  (warningId, data, employeeId, page = 1, perPage = 10) =>
  async (dispatch) => {
    dispatch(saveWarningStart());
    try {
      const response = await api.put(`/hr/warnings/${warningId}`, data);
      dispatch(saveWarningSuccess());
      toastNotify(response.data.message, "success");
      await dispatch(fetchWarnings(employeeId, page, perPage));
      return response.data.data;
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(saveWarningFailure(parsed.message));
      return Promise.reject(parsed);
    }
  };

// Soft delete. The record survives — a withdrawn warning is not a warning that
// never happened — so the confirmation says WITHDRAW, not erase, and does not
// promise the irreversibility that the other delete dialogs in this app do.
export const deleteWarning =
  (warningId, employeeId, page, itemsOnPage, perPage = 10, label) =>
  async (dispatch) => {
    const confirmed = await confirmDestructive({
      action: "سحب الإنذار",
      // The warning's own type, plus its letter number when it has one — a
      // withdrawal is nearly always chosen from several rows that differ only
      // by date.
      subject: label,
      text: "يُسحب الإنذار من سجل الموظف ويُعاد ترقيم الإنذارات التالية له. السجل نفسه يبقى محفوظاً.",
      confirmButtonText: "سحب الإنذار",
    });
    if (!confirmed) return;

    try {
      const response = await api.delete(`/hr/warnings/${warningId}`);
      toastNotify(response.data.message, "success");
      const nextPage =
        itemsOnPage === 1 && page > 1 ? page - 1 : page;
      dispatch(fetchWarnings(employeeId, nextPage, perPage));
    } catch (error) {
      toastNotify(parseApiError(error).message, "error");
    }
  };
