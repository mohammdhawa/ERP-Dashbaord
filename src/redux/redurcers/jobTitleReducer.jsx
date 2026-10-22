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
  // Count of titles still awaiting a job description (?is_described=0), read
  // from `meta.total` of a dedicated count request. It is the worklist size for
  // قسم التحليل والتوصيف, shown on the preset filter.
  undescribedCount: null,
};

const jobTitlesReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_JOB_TITLES_START":
      return {
        ...state,
        fetchLoading: true,
        error: null,
        listRequestId: action.payload,
      };
    case "FETCH_JOB_TITLES_SUCCESS":
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
        error: null,
      };
    case "FETCH_JOB_TITLES_FAILURE":
      if (action.payload.requestId !== state.listRequestId) return state;
      return { ...state, fetchLoading: false, error: action.payload.error };

    case "SET_UNDESCRIBED_COUNT":
      return { ...state, undescribedCount: action.payload };

    case "SAVE_JOB_TITLE_START":
      return { ...state, saving: true, saveError: null };
    case "SAVE_JOB_TITLE_SUCCESS":
      return { ...state, saving: false, saveError: null };
    case "SAVE_JOB_TITLE_FAILURE":
      return { ...state, saving: false, saveError: action.payload };

    default:
      return state;
  }
};

export default jobTitlesReducer;
