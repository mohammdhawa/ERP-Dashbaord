import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { buildInboxParams } from "./approvalsParams";

// صندوق الموافقات — the approver's inbox, GET /me/approvals (API doc §15.2).

export const fetchInboxStart = (payload) => ({
  type: "FETCH_INBOX_START",
  payload, // { requestId, viewKey }
});
export const fetchInboxSuccess = (payload) => ({
  type: "FETCH_INBOX_SUCCESS",
  payload, // { items, meta, requestId, viewKey }
});
export const fetchInboxFailure = (payload) => ({
  type: "FETCH_INBOX_FAILURE",
  payload, // { error, requestId, viewKey }
});

// Module-level, like warningsActions: tab switches and page clicks overlap, and
// the reducer keeps only the response whose id is still the latest.
let requestSeq = 0;

export const fetchInbox =
  (tab, page = 1, perPage = 15) =>
  async (dispatch) => {
    requestSeq += 1;
    const requestId = requestSeq;
    // Which view (tab:page) this request is for. The reducer stores it with the
    // response that lands, so the screen can tell whose rows are in the store.
    const viewKey = `${tab}:${page}`;
    dispatch(fetchInboxStart({ requestId, viewKey }));
    try {
      const response = await api.get("/me/approvals", {
        params: buildInboxParams(tab, page, perPage),
      });
      dispatch(
        fetchInboxSuccess({
          items: response.data.data,
          meta: response.data.meta,
          requestId,
          viewKey,
        })
      );
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(fetchInboxFailure({ error: parsed.message, requestId, viewKey }));
    }
  };
