const initialState = {
  vehicleBrands: [],
  loading: false,
  fetchVehicleBrandsLoading: false,
  error: null,
};

const vehicleBrandsReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_VEHICLE_BRANDS_START":
      return { ...state, fetchVehicleBrandsLoading: true, error: null };

    case "FETCH_VEHICLE_BRANDS_SUCCESS":
      return {
        ...state,
        fetchVehicleBrandsLoading: false,
        vehicleBrands: action.payload,
      };

    case "FETCH_VEHICLE_BRANDS_FAILURE":
      return {
        ...state,
        fetchVehicleBrandsLoading: false,
        error: action.payload,
      };

    case "DELETE_VEHICLE_BRAND_START":
      return { ...state, loading: true };

    case "DELETE_VEHICLE_BRAND_SUCCESS":
      return {
        ...state,
        loading: false,
        vehicleBrands: state.vehicleBrands.filter(
          (brand) => brand.id !== action.payload
        ),
      };

    case "DELETE_VEHICLE_BRAND_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "CREATE_VEHICLE_BRAND_START":
      return { ...state, loading: true };

    case "CREATE_VEHICLE_BRAND_SUCCESS":
      return {
        ...state,
        loading: false,
        vehicleBrands: [...state.vehicleBrands, action.payload],
      };

    case "CREATE_VEHICLE_BRAND_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "EDIT_VEHICLE_BRAND_START":
      return { ...state, loading: true, error: null };

    case "EDIT_VEHICLE_BRAND_SUCCESS":
      return {
        ...state,
        loading: false,
        vehicleBrands: state.vehicleBrands.map((brand) =>
          brand.id === action.payload.id ? action.payload : brand
        ),
      };

    case "EDIT_VEHICLE_BRAND_FAILURE":
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default vehicleBrandsReducer;
