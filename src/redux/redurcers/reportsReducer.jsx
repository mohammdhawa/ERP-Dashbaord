const initialState = {
  reports: [],
  loading: false,
  error: null,
  totalPages: 0,
  totalCount: 0,
};

const reportsReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_REPORTS_START":
      return { ...state, loading: true, error: null };

    case "FETCH_REPORTS_SUCCESS":
      return {
        ...state,
        loading: false,
        reports: action.payload.data,
        totalPages: action.payload.last_page,
        totalCount: action.payload.total,
      };

    case "FETCH_REPORTS_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "DELETE_REPORT_START":
      return { ...state, loading: true };

    case "DELETE_REPORT_SUCCESS":
      return {
        ...state,
        loading: false,
        reports: state.reports.filter((report) => report.id !== action.payload),
      };

    case "DELETE_REPORT_FAILURE":
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default reportsReducer; 