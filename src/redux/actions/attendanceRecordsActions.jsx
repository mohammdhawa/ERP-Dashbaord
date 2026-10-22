import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { buildRecordsParams } from "./attendanceParams";

// سجلات الحضور — GET /attendance/records (API doc §13.1). Same shape as the
// leave register's slice: request ids so a slow answer to an older filter is
// never shown, and a viewKey built from the very params that go on the wire so
// the screen can tell "the store holds MY response" from "it holds a stale one".

export const fetchRecordsStart = (payload) => ({
  type: "FETCH_ATTENDANCE_RECORDS_START",
  payload, // { requestId }
});
export const fetchRecordsSuccess = (payload) => ({
  type: "FETCH_ATTENDANCE_RECORDS_SUCCESS",
  payload, // { items, meta, requestId, viewKey }
});
export const fetchRecordsFailure = (payload) => ({
  type: "FETCH_ATTENDANCE_RECORDS_FAILURE",
  payload, // { error, requestId, viewKey }
});

export const recordsViewKey = (page, perPage, filters) =>
  JSON.stringify(buildRecordsParams(page, perPage, filters));

let requestSeq = 0;

export const fetchAttendanceRecords =
  (page = 1, perPage = 15, filters = {}) =>
  async (dispatch) => {
    requestSeq += 1;
    const requestId = requestSeq;
    const params = buildRecordsParams(page, perPage, filters);
    const viewKey = JSON.stringify(params);
    dispatch(fetchRecordsStart({ requestId }));
    try {
      const response = await api.get("/attendance/records", { params });
      const body = response.data;
      dispatch(
        fetchRecordsSuccess({
          items: body.data,
          meta: body.meta,
          requestId,
          viewKey,
        })
      );
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(
        fetchRecordsFailure({ error: parsed.message, requestId, viewKey })
      );
    }
  };
