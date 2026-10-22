import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { buildBalancesParams } from "./leaveParams";

// الأرصدة — HR's leave balances list, GET /leave/balances (API doc §16.2).

export const fetchBalancesStart = (payload) => ({
  type: "FETCH_BALANCES_START",
  payload, // { requestId }
});
export const fetchBalancesSuccess = (payload) => ({
  type: "FETCH_BALANCES_SUCCESS",
  payload, // { items, meta, extra, requestId, viewKey }
});
export const fetchBalancesFailure = (payload) => ({
  type: "FETCH_BALANCES_FAILURE",
  payload, // { error, requestId, viewKey }
});

// The view a request is for, derived from the very params that go on the wire:
// the screen computes the same key from its own state, so "the store holds MY
// response" is a string comparison and never a guess about which filter last
// changed.
export const balancesViewKey = (page, perPage, filters) =>
  JSON.stringify(buildBalancesParams(page, perPage, filters));

// Module-level, like warningsActions: filter edits and page clicks overlap, and
// the reducer keeps only the response whose id is still the latest.
let requestSeq = 0;

export const fetchBalances =
  (page = 1, perPage = 15, filters = {}) =>
  async (dispatch) => {
    requestSeq += 1;
    const requestId = requestSeq;
    const params = buildBalancesParams(page, perPage, filters);
    const viewKey = JSON.stringify(params);
    dispatch(fetchBalancesStart({ requestId }));
    try {
      const response = await api.get("/leave/balances", { params });
      const body = response.data;
      dispatch(
        fetchBalancesSuccess({
          items: body.data,
          meta: body.meta,
          // `year` and `default_days` sit BESIDE `meta`, not inside it.
          extra: { year: body.year, default_days: body.default_days },
          requestId,
          viewKey,
        })
      );
    } catch (error) {
      const parsed = parseApiError(error);
      dispatch(
        fetchBalancesFailure({ error: parsed.message, requestId, viewKey })
      );
    }
  };
