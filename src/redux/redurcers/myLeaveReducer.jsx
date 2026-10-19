const initialState = {
  items: [],
  meta: null,
  fetchLoading: false,
  error: null,
  // HTTP status of the failed read; the screen treats 403 as final.
  errorStatus: null,
  listRequestId: 0,
  // The view (request params) the data above belongs to; see leaveBalanceReducer.
  loadedKey: null,
};

const myLeaveReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_MY_LEAVE_START":
      return {
        ...state,
        fetchLoading: true,
        error: null,
        errorStatus: null,
        listRequestId: action.payload.requestId,
      };
    case "FETCH_MY_LEAVE_SUCCESS":
      // Drop a response that raced a newer filter/page request.
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
        error: null,
        errorStatus: null,
        loadedKey: action.payload.viewKey,
      };
    case "FETCH_MY_LEAVE_FAILURE":
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        error: action.payload.error,
        errorStatus: action.payload.status,
        loadedKey: action.payload.viewKey,
      };
    // Another account's rows must not flash on the next sign-in.
    case "LOGOUT_SUCCESS":
      return initialState;
    default:
      return state;
  }
};

export default myLeaveReducer;
