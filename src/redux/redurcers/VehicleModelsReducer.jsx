const initialState = {
  vehicleModels: [],
  loading: false,
  fetchVehicleModelsLoading: false,
  error: null,
};

const vehicleModelsReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_VEHICLE_MODELS_START":
      return { ...state, fetchVehicleModelsLoading: true, error: null };
    case "FETCH_VEHICLE_MODELS_SUCCESS":
      return {
        ...state,
        fetchVehicleModelsLoading: false,
        vehicleModels: action.payload,
      };
    case "FETCH_VEHICLE_MODELS_FAILURE":
      return {
        ...state,
        fetchVehicleModelsLoading: false,
        error: action.payload,
      };
    case "DELETE_VEHICLE_MODEL_START":
      return { ...state, loading: true };
    case "DELETE_VEHICLE_MODEL_SUCCESS":
      return {
        ...state,
        loading: false,
        vehicleModels: state.vehicleModels.filter(
          (model) => model.id !== action.payload
        ),
      };
    case "DELETE_VEHICLE_MODEL_FAILURE":
      return { ...state, loading: false, error: action.payload };
    case "CREATE_VEHICLE_MODEL_START":
      return { ...state, loading: true };
    case "CREATE_VEHICLE_MODEL_SUCCESS":
      return {
        ...state,
        loading: false,
        vehicleModels: [...state.vehicleModels, action.payload],
      };
    case "CREATE_VEHICLE_MODEL_FAILURE":
      return { ...state, loading: false, error: action.payload };
    case "EDIT_VEHICLE_MODEL_START":
      return { ...state, loading: true, error: null };
    case "EDIT_VEHICLE_MODEL_SUCCESS":
      return {
        ...state,
        loading: false,
        vehicleModels: state.vehicleModels.map((model) =>
          model.id === action.payload.id ? action.payload : model
        ),
      };
    case "EDIT_VEHICLE_MODEL_FAILURE":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default vehicleModelsReducer;
