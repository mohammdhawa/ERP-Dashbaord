const initialState = {
  items: [],
  meta: null,
  // The window the server answered for ({ from, to }) and the summary over the
  // whole filtered set — both from beside `meta`.
  window: { from: null, to: null },
  summary: null,
  fetchLoading: false,
  error: null,
  listRequestId: 0,
  // The view (request params) the data above belongs to; see leaveBalanceReducer.
  loadedKey: null,
};

const leaveRegisterReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_LEAVE_REGISTER_START":
      return {
        ...state,
        fetchLoading: true,
        error: null,
        listRequestId: action.payload.requestId,
      };
    case "FETCH_LEAVE_REGISTER_SUCCESS":
      // Drop a response that raced a newer filter/page request.
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
        window: action.payload.window,
        summary: action.payload.summary,
        error: null,
        loadedKey: action.payload.viewKey,
      };
    case "FETCH_LEAVE_REGISTER_FAILURE":
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

export default leaveRegisterReducer;
