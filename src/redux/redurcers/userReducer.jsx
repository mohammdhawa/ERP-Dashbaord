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
  // EVERY user, flattened across pages — for the role-assignment picker only.
  allItems: [],
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
    case "FETCH_ALL_USERS_SUCCESS":
      return { ...state, allItems: action.payload };
    case "FETCH_USERS_FAILURE":
      if (action.payload.requestId !== state.listRequestId) return state;
      return { ...state, fetchLoading: false, error: action.payload.error };

    // Mutations no longer patch the local array — the action re-fetches the
    // current page, so the server decides ordering and the meta counters stay
    // truthful. Splicing a created row onto page 1 would put it where the
    // server would not have.
    case "SAVE_USER_START":
      return { ...state, saving: true, error: null };
    case "SAVE_USER_DONE":
      return { ...state, saving: false };
    case "SAVE_USER_FAILURE":
      return { ...state, saving: false, error: action.payload };

    default:
      return state;
  }
};

export default usersReducer;
