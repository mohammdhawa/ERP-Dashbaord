const initialState = {
  items: [],
  // Server pagination metadata (15/page): current_page, last_page, per_page,
  // total, from/to (null on an empty page).
  meta: null,
  fetchLoading: false,
  saving: false,
  error: null,
};

const departmentsReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_DEPARTMENTS_START":
      return { ...state, fetchLoading: true, error: null };
    case "FETCH_DEPARTMENTS_SUCCESS":
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
      };
    case "FETCH_DEPARTMENTS_FAILURE":
      return { ...state, fetchLoading: false, error: action.payload };

    case "SAVE_DEPARTMENT_START":
      return { ...state, saving: true, error: null };
    case "SAVE_DEPARTMENT_SUCCESS":
      return { ...state, saving: false };
    case "SAVE_DEPARTMENT_FAILURE":
      return { ...state, saving: false, error: action.payload };

    default:
      return state;
  }
};

export default departmentsReducer;
