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
  // Newest in-flight list request. A response whose id is older than this is
  // a stale one that raced a newer filter/page change, and is dropped.
  listRequestId: 0,
  // Single employee (profile screen), kept separate from the list.
  current: null,
  currentLoading: false,
  currentError: null,
};

const employeesReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_EMPLOYEES_START":
      return {
        ...state,
        fetchLoading: true,
        error: null,
        listRequestId: action.payload,
      };
    case "FETCH_EMPLOYEES_SUCCESS":
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
        error: null,
      };
    case "FETCH_EMPLOYEES_FAILURE":
      if (action.payload.requestId !== state.listRequestId) return state;
      return { ...state, fetchLoading: false, error: action.payload.error };

    case "SAVE_EMPLOYEE_START":
      return { ...state, saving: true, saveError: null };
    case "SAVE_EMPLOYEE_SUCCESS":
      return { ...state, saving: false, saveError: null };
    case "SAVE_EMPLOYEE_FAILURE":
      return { ...state, saving: false, saveError: action.payload };

    case "FETCH_EMPLOYEE_START":
      return { ...state, currentLoading: true, currentError: null };
    case "FETCH_EMPLOYEE_SUCCESS":
      return { ...state, currentLoading: false, current: action.payload };
    case "FETCH_EMPLOYEE_FAILURE":
      return {
        ...state,
        currentLoading: false,
        currentError: action.payload,
        current: null,
      };
    case "CLEAR_EMPLOYEE":
      return { ...state, current: null, currentError: null };

    default:
      return state;
  }
};

export default employeesReducer;
