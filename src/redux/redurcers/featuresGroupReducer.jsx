const initialState = {
  featureGroups: [],
  loading: false,
  fetchFeatureGroupsLoading: false,
  error: null,
};

const featureGroupsReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_FEATURE_GROUPS_START":
      return { ...state, fetchFeatureGroupsLoading: true, error: null };

    case "FETCH_FEATURE_GROUPS_SUCCESS":
      return {
        ...state,
        fetchFeatureGroupsLoading: false,
        featureGroups: action.payload,
      };

    case "FETCH_FEATURE_GROUPS_FAILURE":
      return {
        ...state,
        fetchFeatureGroupsLoading: false,
        error: action.payload,
      };
    case "EDIT_FEATURE_GROUP_START":
      return { ...state, loading: true };

    case "EDIT_FEATURE_GROUP_SUCCESS":
      return {
        ...state,
        loading: false,
        featureGroups: state.featureGroups.map((group) =>
          group.id === action.payload.id ? action.payload : group
        ),
      };

    case "EDIT_FEATURE_GROUP_FAILURE":
      return { ...state, loading: false, error: action.payload };
    case "DELETE_FEATURE_GROUP_START":
      return { ...state, loading: true };

    case "DELETE_FEATURE_GROUP_SUCCESS":
      return {
        ...state,
        loading: false,
        featureGroups: state.featureGroups.filter(
          (group) => group.id !== action.payload
        ),
      };

    case "DELETE_FEATURE_GROUP_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "CREATE_FEATURE_GROUP_START":
      return { ...state, loading: true };

    case "CREATE_FEATURE_GROUP_SUCCESS":
      return {
        ...state,
        loading: false,
        featureGroups: [...state.featureGroups, action.payload],
      };

    case "CREATE_FEATURE_GROUP_FAILURE":
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default featureGroupsReducer;
