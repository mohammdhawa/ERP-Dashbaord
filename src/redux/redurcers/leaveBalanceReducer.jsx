const initialState = {
  items: [],
  meta: null,
  // { year, default_days } — the response's own siblings of `meta`.
  extra: null,
  fetchLoading: false,
  error: null,
  listRequestId: 0,
  // The view (the request's params) whose response the rows/meta/error above
  // belong to. Set only by the latest request's response, so a screen comparing
  // it with its own view knows whether the store holds ITS data.
  loadedKey: null,
};

const leaveBalancesReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_BALANCES_START":
      return {
        ...state,
        fetchLoading: true,
        error: null,
        listRequestId: action.payload.requestId,
      };
    case "FETCH_BALANCES_SUCCESS":
      // Drop a response that raced a newer filter/page request.
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
        extra: action.payload.extra,
        error: null,
        loadedKey: action.payload.viewKey,
      };
    case "FETCH_BALANCES_FAILURE":
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        error: action.payload.error,
        loadedKey: action.payload.viewKey,
      };
    // Another account's rows must not flash on the next sign-in.
    case "LOGOUT_SUCCESS":
      return initialState;
    default:
      return state;
  }
};

export default leaveBalancesReducer;
