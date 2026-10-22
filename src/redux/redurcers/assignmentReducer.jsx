const initialState = {
  items: [],
  meta: null,
  fetchLoading: false,
  saving: false,
  // LIST error only — rendered by DataTableServer in place of the rows.
  error: null,
  // SAVE error, kept separate on purpose: a rejected create/update is a
  // fact about the modal, not about the table behind it. Writing it to
  // `error` replaced every row with the failure panel while the user was
  // still looking at the form.
  saveError: null,
  listRequestId: 0,
};

const assignmentsReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_ASSIGNMENTS_START":
      return {
        ...state,
        fetchLoading: true,
        error: null,
        listRequestId: action.payload,
      };
    case "FETCH_ASSIGNMENTS_SUCCESS":
      // Drop a response that raced a newer request for another employee/page.
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
        error: null,
      };
    case "FETCH_ASSIGNMENTS_FAILURE":
      if (action.payload.requestId !== state.listRequestId) return state;
      return { ...state, fetchLoading: false, error: action.payload.error };

    case "SAVE_ASSIGNMENT_START":
      return { ...state, saving: true, saveError: null };
    case "SAVE_ASSIGNMENT_SUCCESS":
      return { ...state, saving: false, saveError: null };
    case "SAVE_ASSIGNMENT_FAILURE":
      return { ...state, saving: false, saveError: action.payload };

    default:
      return state;
  }
};

export default assignmentsReducer;
