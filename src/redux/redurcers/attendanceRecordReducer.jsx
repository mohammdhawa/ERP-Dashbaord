const initialState = {
  items: [],
  meta: null,
  fetchLoading: false,
  error: null,
  listRequestId: 0,
  // The view (request params) the data above belongs to; see leaveBalanceReducer.
  loadedKey: null,
};

const attendanceRecordReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_ATTENDANCE_RECORDS_START":
      return {
        ...state,
        fetchLoading: true,
        error: null,
        listRequestId: action.payload.requestId,
      };
    case "FETCH_ATTENDANCE_RECORDS_SUCCESS":
      // Drop a response that raced a newer filter/page request.
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
        error: null,
        loadedKey: action.payload.viewKey,
      };
    case "FETCH_ATTENDANCE_RECORDS_FAILURE":
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        error: action.payload.error,
        loadedKey: action.payload.viewKey,
      };
    // Another account's attendance must not flash on the next sign-in; the id
    // reset also makes any in-flight answer stale.
    case "LOGOUT_SUCCESS":
      return initialState;
    default:
      return state;
  }
};

export default attendanceRecordReducer;
