const initialState = {
  packages: [],
  loading: false,
  fetchLoading: false,
  error: null,
};

const packageReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_PACKAGES_START":
      return { ...state, fetchLoading: true, error: null };

    case "FETCH_PACKAGES_SUCCESS":
      return { ...state, fetchLoading: false, packages: action.payload };

    case "FETCH_PACKAGES_FAILURE":
      return { ...state, fetchLoading: false, error: action.payload };

    case "DELETE_PACKAGE_START":
    case "CREATE_PACKAGE_START":
    case "EDIT_PACKAGE_START":
      return { ...state, loading: true, error: null };

    case "DELETE_PACKAGE_SUCCESS":
      return {
        ...state,
        loading: false,
        packages: state.packages.filter((pkg) => pkg.id !== action.payload),
      };

    case "CREATE_PACKAGE_SUCCESS":
      return {
        ...state,
        loading: false,
        packages: [...state.packages, action.payload],
      };

    case "EDIT_PACKAGE_SUCCESS":
      return {
        ...state,
        loading: false,
        packages: state.packages.map((pkg) =>
          pkg.id === action.payload.id ? action.payload : pkg
        ),
      };

    case "DELETE_PACKAGE_FAILURE":
    case "CREATE_PACKAGE_FAILURE":
    case "EDIT_PACKAGE_FAILURE":
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default packageReducer;
