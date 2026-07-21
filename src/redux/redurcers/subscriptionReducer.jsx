const initialState = {
  subscriptions: [],
  currentPage: 1,
  perPage: 10,
  total: 0,
  totalPages: 0,
  fetchSubscriptionsLoading: false,
  error: null,
};

const subscriptionReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_SUBSCRIPTIONS_START":
      return { ...state, fetchSubscriptionsLoading: true, error: null };

    case "FETCH_SUBSCRIPTIONS_SUCCESS":
      const data = action.payload?.data || {};
      return {
        ...state,
        fetchSubscriptionsLoading: false,
        subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : [],
        currentPage: data.current_page || 1,
        perPage: data.per_page || 10,
        total: data.total || 0,
        totalPages: data.total_page || 0,
      };

    case "FETCH_SUBSCRIPTIONS_FAILURE":
      return { ...state, fetchSubscriptionsLoading: false, error: action.payload };

    default:
      return state;
  }
};

export default subscriptionReducer; 