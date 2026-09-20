import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";

// سجل التدقيق — GET /auth/audit-logs and /auth/audit-logs/{id}.
// Both require `auth.audit.view`; the detail payload's `old_values` /
// `new_values` are additionally gated on `auth.audit.viewValues`.
//
// ⚠️ READ-ONLY, AND THAT IS THE WHOLE MODULE. There is no create, update,
// delete or restore thunk here and there must never be one: the table is
// append-only and holds no endpoint that could accept a write.
//
// ⚠️ NEVER fetchAllPages THIS ENDPOINT. That helper exists for bounded picker
// sets (roles, job titles). This table grows by one row per authenticated
// request, forever — walking it would be a request per 100 rows against a
// table with no ceiling.
//
// ⚠️ NO POLLING ANYWHERE IN THIS FILE. AuditLogMiddleware writes a row for
// every authenticated request, so each fetch here appends to the table it is
// reading. Refreshing is an explicit user action, never a timer.

// The query builder lives in its own pure module so `npm test` can exercise it
// under plain Node — this file imports api.js, which reads `import.meta.env`
// and cannot be loaded outside Vite. Re-exported here so callers import from
// the actions module as they do everywhere else.
import { AUDIT_SORT_KEYS, buildListParams } from "./auditParams";

export { AUDIT_SORT_KEYS, buildListParams };

export const fetchAuditLogsStart = (requestId) => ({
  type: "FETCH_AUDIT_LOGS_START",
  payload: requestId,
});
export const fetchAuditLogsSuccess = (payload) => ({
  type: "FETCH_AUDIT_LOGS_SUCCESS",
  payload, // { items, meta, requestId }
});
export const fetchAuditLogsFailure = (payload) => ({
  type: "FETCH_AUDIT_LOGS_FAILURE",
  payload, // { error, status, requestId }
});

export const fetchAuditLogStart = (requestId) => ({
  type: "FETCH_AUDIT_LOG_START",
  payload: requestId,
});
export const fetchAuditLogSuccess = (payload) => ({
  type: "FETCH_AUDIT_LOG_SUCCESS",
  payload, // { detail, requestId }
});
export const fetchAuditLogFailure = (payload) => ({
  type: "FETCH_AUDIT_LOG_FAILURE",
  payload, // { error, status, requestId }
});
export const clearAuditLogDetail = () => ({ type: "CLEAR_AUDIT_LOG_DETAIL" });

// Monotonic request ids, one sequence per endpoint. A slow page-1 response must
// not overwrite a fast page-2 one, and on this screen that is not a rare race:
// the filters are the whole point of the tool and get changed quickly.
let listRequestSeq = 0;
let detailRequestSeq = 0;

export const fetchAuditLogs =
  (page = 1, perPage = 10, filters = {}) =>
  async (dispatch) => {
    listRequestSeq += 1;
    const requestId = listRequestSeq;
    dispatch(fetchAuditLogsStart(requestId));
    try {
      const response = await api.get("/auth/audit-logs", {
        params: buildListParams(page, perPage, filters),
      });
      dispatch(
        fetchAuditLogsSuccess({
          items: response.data.data,
          meta: response.data.meta,
          requestId,
        })
      );
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(
        fetchAuditLogsFailure({
          error: parsed.message,
          status: parsed.status,
          requestId,
        })
      );
      // A 403 is already rendered in place of the rows and is not transient;
      // toasting it as well just doubles the message. Same rule as the other
      // lists.
      if (parsed.status !== 403) toastNotify(parsed.message, "error");
    }
  };

/**
 * One row in full: adds old_values, new_values and user_agent.
 *
 * Its failure is kept in `detailError`, entirely separate from the list's
 * `error`, so a detail request that fails cannot blank the table behind the
 * panel — the rows the user was reading are still the rows on screen.
 */
export const fetchAuditLog = (id) => async (dispatch) => {
  detailRequestSeq += 1;
  const requestId = detailRequestSeq;
  dispatch(fetchAuditLogStart(requestId));
  try {
    const response = await api.get(`/auth/audit-logs/${id}`);
    dispatch(fetchAuditLogSuccess({ detail: response.data.data, requestId }));
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(
      fetchAuditLogFailure({
        error: parsed.message,
        status: parsed.status,
        requestId,
      })
    );
  }
};
