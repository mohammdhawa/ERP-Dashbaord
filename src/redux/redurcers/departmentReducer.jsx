const initialState = {
  items: [],
  // Server pagination metadata (15/page): current_page, last_page, per_page,
  // total, from/to (null on an empty page).
  meta: null,
  fetchLoading: false,
  saving: false,
  error: null,

  // THE WHOLE TREE, flattened across pages.
  //
  // A page of fifteen units cannot answer "what is this section under?" — the
  // resource carries `parent_id` but no embedded `parent`, and the parent is
  // usually on another page. It also cannot be searched, and it cannot be drawn
  // as a hierarchy. All three need the set, not a window onto it. The set is an
  // org chart — a root, a handful of divisions, their sections and offices — so
  // holding it is cheap and bounded in a way the 242-row employee list is not.
  allItems: [],
  allLoading: false,
  allError: null,
  // Reset by every mutation: a move changes parents and the resolved sector of
  // everything beneath, so a cached tree goes wrong the moment one is saved.
  allLoaded: false,
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

    case "FETCH_ALL_DEPARTMENTS_START":
      return { ...state, allLoading: true, allError: null };
    case "FETCH_ALL_DEPARTMENTS_SUCCESS":
      return {
        ...state,
        allItems: action.payload,
        allLoading: false,
        allLoaded: true,
        allError: null,
      };
    case "FETCH_ALL_DEPARTMENTS_FAILURE":
      return { ...state, allLoading: false, allError: action.payload };
    case "INVALIDATE_DEPARTMENT_TREE":
      return { ...state, allLoaded: false };

    case "SAVE_DEPARTMENT_START":
      return { ...state, saving: true, error: null };
    case "SAVE_DEPARTMENT_SUCCESS":
      return { ...state, saving: false, allLoaded: false };
    case "SAVE_DEPARTMENT_FAILURE":
      return { ...state, saving: false, error: action.payload };

    default:
      return state;
  }
};

export default departmentsReducer;
