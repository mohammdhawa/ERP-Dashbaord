const initialState = {
  permissions: [], 
  loading: false,
  fetchPermsLoading:false,
  error: null,
};

const permissionsReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_PERMISSIONS_START":
      return { ...state, fetchPermsLoading: true, error: null };

    case "FETCH_PERMISSIONS_SUCCESS":
      return {
        ...state,
        fetchPermsLoading: false,
        permissions: action.payload,
      };

    case "FETCH_PERMISSIONS_FAILURE":
      return { ...state, fetchPermsLoading: false, error: action.payload };

    default:
      return state;
  }
};

export default permissionsReducer;
