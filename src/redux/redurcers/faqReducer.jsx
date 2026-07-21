const initialState = {
  faqs: [],
  loading: false,
  fetchFaqLoading: false,
  error: null,
};

const faqReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_FAQS_START":
      return { ...state, fetchFaqLoading: true, error: null };

    case "FETCH_FAQS_SUCCESS":
      return { ...state, fetchFaqLoading: false, faqs: action.payload };

    case "FETCH_FAQS_FAILURE":
      return { ...state, fetchFaqLoading: false, error: action.payload };

    case "DELETE_FAQ_START":
      return { ...state, loading: true };

    case "DELETE_FAQ_SUCCESS":
      return {
        ...state,
        loading: false,
        faqs: state.faqs.filter((faq) => faq.id !== action.payload),
      };

    case "DELETE_FAQ_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "CREATE_FAQ_START":
      return { ...state, loading: true };

    case "CREATE_FAQ_SUCCESS":
      return {
        ...state,
        loading: false,
        faqs: [...state.faqs, action.payload],
      };

    case "CREATE_FAQ_FAILURE":
      return { ...state, loading: false, error: action.payload };

    case "EDIT_FAQ_START":
      return { ...state, loading: true, error: null };

    case "EDIT_FAQ_SUCCESS":
      return {
        ...state,
        loading: false,
        faqs: state.faqs.map((faq) =>
          faq.id === action.payload.id ? action.payload : faq
        ),
      };

    case "EDIT_FAQ_FAILURE":
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default faqReducer;
