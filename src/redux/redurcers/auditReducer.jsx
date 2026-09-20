// سجل التدقيق state. Read-only by construction: there is no `saving`, no
// `saveError` and no mutation case, because the resource has no write endpoint.
//
// The list and the detail are kept in two independent blocks — errors included.
// A failed detail fetch must leave `items` untouched: the user opened a row out
// of a table they are still reading, and replacing that table with the panel's
// error message loses their place and their filters' result.
const initialState = {
  items: [],
  meta: null,
  fetchLoading: false,
  // LIST error, rendered by DataTableServer in place of the rows. `errorStatus`
  // is kept beside it so a 403 can drop the retry button: retrying a permission
  // failure just produces the same 403.
  error: null,
  errorStatus: null,
  listRequestId: 0,

  // DETAIL — GET /auth/audit-logs/{id}. `detail` is the full row, including
  // old_values / new_values when the caller holds auth.audit.viewValues.
  detail: null,
  detailLoading: false,
  detailError: null,
  detailErrorStatus: null,
  detailRequestId: 0,
};

const auditReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_AUDIT_LOGS_START":
      return {
        ...state,
        fetchLoading: true,
        error: null,
        errorStatus: null,
        listRequestId: action.payload,
      };
    // Stale-response guard: a response whose id is not the one in flight is
    // discarded outright. On this screen the filters change fast, and page 1
    // arriving after page 2 would show the wrong rows under the right filters.
    case "FETCH_AUDIT_LOGS_SUCCESS":
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
        error: null,
        errorStatus: null,
      };
    case "FETCH_AUDIT_LOGS_FAILURE":
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        error: action.payload.error,
        errorStatus: action.payload.status ?? null,
      };

    case "FETCH_AUDIT_LOG_START":
      return {
        ...state,
        detailLoading: true,
        detailError: null,
        detailErrorStatus: null,
        // The previous row is dropped as the next one is requested, so the
        // panel cannot show row #91's values under row #104's header while the
        // request is in flight.
        detail: null,
        detailRequestId: action.payload,
      };
    case "FETCH_AUDIT_LOG_SUCCESS":
      if (action.payload.requestId !== state.detailRequestId) return state;
      return {
        ...state,
        detailLoading: false,
        detail: action.payload.detail,
        detailError: null,
        detailErrorStatus: null,
      };
    case "FETCH_AUDIT_LOG_FAILURE":
      if (action.payload.requestId !== state.detailRequestId) return state;
      return {
        ...state,
        detailLoading: false,
        detailError: action.payload.error,
        detailErrorStatus: action.payload.status ?? null,
      };
    case "CLEAR_AUDIT_LOG_DETAIL":
      return {
        ...state,
        detail: null,
        detailLoading: false,
        detailError: null,
        detailErrorStatus: null,
      };

    default:
      return state;
  }
};

export default auditReducer;
