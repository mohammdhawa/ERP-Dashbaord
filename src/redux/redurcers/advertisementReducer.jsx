const initialState = {
  advertisements: [],
  currentPage: 1,
  perPage: 10,
  total: 0,
  totalPages: 0,
  fetchAdsLoading: false,
  error: null,
};

const advertisementReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_ADVERTISEMENTS_START":
      return { ...state, fetchAdsLoading: true, error: null };

    case "FETCH_ADVERTISEMENTS_SUCCESS":
      return {
        ...state,
        fetchAdsLoading: false,
        advertisements: action.payload.advertisements,
        currentPage: action.payload.current_page,
        perPage: action.payload.per_page,
        total: action.payload.total,
        totalPages: action.payload.total_pages,
      };

    case "FETCH_ADVERTISEMENTS_FAILURE":
      return { ...state, fetchAdsLoading: false, error: action.payload };
    case "PROCESS_ADVERTISEMENT_START":
      return { ...state, loading: true, error: null };

    case "PROCESS_ADVERTISEMENT_SUCCESS":
      return {
        ...state,
        loading: false,
        advertisements: state.advertisements.map((advertisement) =>
          advertisement.id === action.payload.id
            ? {
                ...advertisement,
                ads_status: action.payload.ads_status,
                active_status: action.payload.active_status,
                updated_at: action.payload.updated_at,
              }
            : advertisement
        ),
      };

    case "PROCESS_ADVERTISEMENT_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "DELETE_ADVERTISEMENT_START":
      return { ...state, loading: true };

    case "DELETE_ADVERTISEMENT_SUCCESS":
      return {
        ...state,
        loading: false,
        advertisements: state.advertisements.filter(
          (advertisement) => advertisement.id !== action.payload
        ),
      };

    case "DELETE_ADVERTISEMENT_FAILURE":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default advertisementReducer;
