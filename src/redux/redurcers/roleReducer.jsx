const initialState = {
  // One PAGE of roles, for the table.
  items: [],
  // Server pagination metadata for `items`.
  meta: null,
  // EVERY role, flattened across pages — used only by the assign/unassign
  // picker, which is wrong if it silently stops at the first page. Kept
  // separate from `items` on purpose: mixing "the page I am viewing" with
  // "everything that exists" is how a table starts rendering 200 rows.
  allItems: [],
  fetchLoading: false,
  saving: false,
  error: null,
  // Newest in-flight list request. A response older than this raced a
  // newer page/size change and is dropped, so a slow page-1 reply cannot
  // overwrite the page-2 rows already on screen.
  listRequestId: 0,
};

const rolesReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_ROLES_START":
      return {
        ...state,
        fetchLoading: true,
        error: null,
        listRequestId: action.payload,
      };
    case "FETCH_ROLES_SUCCESS":
      if (action.payload.requestId !== state.listRequestId) return state;
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
      };
    case "FETCH_ROLES_FAILURE":
      if (action.payload.requestId !== state.listRequestId) return state;
      return { ...state, fetchLoading: false, error: action.payload.error };

    case "FETCH_ALL_ROLES_SUCCESS":
      return { ...state, allItems: action.payload };

    // Mutations re-fetch rather than patching a local array — with server
    // pagination the row's position is the server's decision.
    case "SAVE_ROLE_START":
      return { ...state, saving: true, error: null };
    case "SAVE_ROLE_DONE":
      return { ...state, saving: false };
    case "SAVE_ROLE_FAILURE":
      return { ...state, saving: false, error: action.payload };

    default:
      return state;
  }
};

export default rolesReducer;
