import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { buildRegisterParams } from "./leaveParams";

// سجل الإجازات — the register, GET /leave/requests (API doc §16.8).

export const fetchRegisterStart = (payload) => ({
  type: "FETCH_LEAVE_REGISTER_START",
  payload, // { requestId }
});
export const fetchRegisterSuccess = (payload) => ({
  type: "FETCH_LEAVE_REGISTER_SUCCESS",
  payload, // { items, meta, window, summary, requestId, viewKey }
});
export const fetchRegisterFailure = (payload) => ({
  type: "FETCH_LEAVE_REGISTER_FAILURE",
  payload, // { error, requestId, viewKey }
});

// The view a request is for, from the very params that go on the wire (see
// balancesViewKey): the screen derives the same string from its own state, so
// "the store holds MY response" is a comparison, never a guess.
export const registerViewKey = (page, perPage, filters) =>
  JSON.stringify(buildRegisterParams(page, perPage, filters));

let requestSeq = 0;

export const fetchRegister =
  (page = 1, perPage = 15, filters = {}) =>
  async (dispatch) => {
    requestSeq += 1;
    const requestId = requestSeq;
    const params = buildRegisterParams(page, perPage, filters);
    const viewKey = JSON.stringify(params);
    dispatch(fetchRegisterStart({ requestId }));
    try {
      const response = await api.get("/leave/requests", { params });
      const body = response.data;
      dispatch(
        fetchRegisterSuccess({
          items: body.data,
          meta: body.meta,
          // `from`, `to` and `summary` sit BESIDE `meta`; the summary covers
          // the whole filtered set, not this page.
          window: { from: body.from ?? null, to: body.to ?? null },
          summary: body.summary ?? null,
          requestId,
          viewKey,
        })
      );
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(
        fetchRegisterFailure({ error: parsed.message, requestId, viewKey })
      );
    }
  };
