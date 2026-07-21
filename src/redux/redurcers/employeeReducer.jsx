const initialState = {
  items: [],
  meta: null,
  fetchLoading: false,
  saving: false,
  error: null,
};

const employeesReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_EMPLOYEES_START":
      return { ...state, fetchLoading: true, error: null };
    case "FETCH_EMPLOYEES_SUCCESS":
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
      };
    case "FETCH_EMPLOYEES_FAILURE":
      return { ...state, fetchLoading: false, error: action.payload };

    case "SAVE_EMPLOYEE_START":
      return { ...state, saving: true, error: null };
    case "SAVE_EMPLOYEE_SUCCESS":
      return { ...state, saving: false };
    case "SAVE_EMPLOYEE_FAILURE":
      return { ...state, saving: false, error: action.payload };

    default:
      return state;
  }
};

export default employeesReducer;
