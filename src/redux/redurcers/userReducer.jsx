const initialState = {
  items: [],
  // Server pagination metadata: current_page, last_page, per_page, total,
  // from/to (null on an empty page). Null until the first fetch resolves.
  //
  // `/api/auth/users` used to return the whole collection with no `meta`, and
  // this reducer kept it in a `users` array that the page filtered and paged
  // client-side. It is paginated now, so the page and its size are the server's
  // answer, not ours — mirrors departmentReducer exactly.
  meta: null,
  // EVERY user, flattened across pages — the role-assignment picker, and the
  // directory search on the users list (which cannot be a server filter until
  // `auth/users.index` grows a `?search=`; see fetchAllUsers).
  allItems: [],
  allLoading: false,
  allError: null,
  // False until a walk has completed, and reset to false by any mutation, so a
  // search never matches against rows the server has since changed.
  allLoaded: false,
  fetchLoading: false,
  saving: false,
  error: null,
  // Newest in-flight list request. A response older than this raced a
  // newer page/size change and is dropped, so a slow page-1 reply cannot
  // overwrite the page-2 rows already on screen.
  listRequestId: 0,
};

const usersReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_USERS_START":
      return {
        ...state,
        fetchLoading: true,
        error: null,
        listRequestId: action.payload,
      };
    case "FETCH_USERS_SUCCESS":
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
      };
    case "FETCH_ALL_USERS_START":
      return { ...state, allLoading: true, allError: null };
    case "FETCH_ALL_USERS_SUCCESS":
      return {
        ...state,
        allItems: action.payload,
        allLoading: false,
        allLoaded: true,
        allError: null,
      };
    case "FETCH_ALL_USERS_FAILURE":
      return { ...state, allLoading: false, allError: action.payload };
    case "INVALIDATE_USERS_DIRECTORY":
      return { ...state, allLoaded: false };
    case "FETCH_USERS_FAILURE":
      if (action.payload.requestId !== state.listRequestId) return state;
      return { ...state, fetchLoading: false, error: action.payload.error };

    // Mutations no longer patch the local array — the action re-fetches the
    // current page, so the server decides ordering and the meta counters stay
    // truthful. Splicing a created row onto page 1 would put it where the
    // server would not have.
    case "SAVE_USER_START":
      return { ...state, saving: true, error: null };
    // A successful create/update changes what a directory search should match,
    // so the cached walk is marked stale rather than left to go quietly wrong.
    case "SAVE_USER_DONE":
      return { ...state, saving: false, allLoaded: false };
    case "SAVE_USER_FAILURE":
      return { ...state, saving: false, error: action.payload };

    default:
      return state;
  }
};

export default usersReducer;
