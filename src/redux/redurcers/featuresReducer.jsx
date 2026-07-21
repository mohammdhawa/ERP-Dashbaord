const initialState = {
  features: [],
  loading: false,
  fetchFeaturesLoading: false,
  error: null,
};

const featuresReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_FEATURES_START":
      return { ...state, fetchFeaturesLoading: true, error: null };

    case "FETCH_FEATURES_SUCCESS":
      return {
        ...state,
        fetchFeaturesLoading: false,
        features: action.payload,
      };

    case "FETCH_FEATURES_FAILURE":
      return { ...state, fetchFeaturesLoading: false, error: action.payload };

    case "DELETE_FEATURE_START":
      return { ...state, loading: true };

    case "DELETE_FEATURE_SUCCESS":
      return {
        ...state,
        loading: false,
        features: state.features.filter(
          (feature) => feature.id !== action.payload
        ),
      };

    case "DELETE_FEATURE_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "DELETE_FEATURES_BY_GROUP":
      return {
        ...state,
        features: state.features.filter(
          (feature) => feature.feature_group_id !== action.payload
        ),
      };

    case "CREATE_FEATURE_START":
      return { ...state, loading: true };

    case "CREATE_FEATURE_SUCCESS":
      return {
        ...state,
        loading: false,
        features: [...state.features, action.payload],
      };
    case "CREATE_FEATURES_SUCCESS_AFTER_GROUP_CREATE":
      return {
        ...state,
        loading: false,
        features: [...state.features, ...action.payload],
      };
    case "CREATE_FEATURE_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "EDIT_FEATURE_START":
      return { ...state, loading: true, error: null };

    case "EDIT_FEATURE_SUCCESS":
      return {
        ...state,
        loading: false,
        features: state.features.map((feature) =>
          feature.id === action.payload.id ? action.payload : feature
        ),
      };

    case "EDIT_FEATURE_FAILURE":
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default featuresReducer;
