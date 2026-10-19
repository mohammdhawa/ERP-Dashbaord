import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { buildMyLeaveParams } from "./leaveParams";

// طلباتي — the caller's own requests, GET /me/leave-requests (API doc §16.3).

export const fetchMyLeaveStart = (payload) => ({
  type: "FETCH_MY_LEAVE_START",
  payload, // { requestId }
});
export const fetchMyLeaveSuccess = (payload) => ({
  type: "FETCH_MY_LEAVE_SUCCESS",
  payload, // { items, meta, requestId, viewKey }
});
export const fetchMyLeaveFailure = (payload) => ({
  type: "FETCH_MY_LEAVE_FAILURE",
  payload, // { error, status, requestId, viewKey }
});

// Same idiom as registerViewKey: the screen derives the key from its own state
// and compares it with the store's `loadedKey`.
export const myLeaveViewKey = (page, perPage, filters) =>
  JSON.stringify(buildMyLeaveParams(page, perPage, filters));

let requestSeq = 0;

export const fetchMyLeave =
  (page = 1, perPage = 15, filters = {}) =>
  async (dispatch) => {
    requestSeq += 1;
    const requestId = requestSeq;
    const params = buildMyLeaveParams(page, perPage, filters);
    const viewKey = JSON.stringify(params);
    dispatch(fetchMyLeaveStart({ requestId }));
    try {
      const response = await api.get("/me/leave-requests", { params });
      const body = response.data;
      dispatch(
        fetchMyLeaveSuccess({ items: body.data, meta: body.meta, requestId, viewKey })
      );
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(
        fetchMyLeaveFailure({
          error: parsed.message,
          // 403 = the account has no employee: final, the screen offers no retry.
          status: parsed.status ?? null,
          requestId,
          viewKey,
        })
      );
    }
  };
