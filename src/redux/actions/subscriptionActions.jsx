import api from "../api";

// Fetch Subscriptions
export const fetchSubscriptionsStart = () => ({
  type: "FETCH_SUBSCRIPTIONS_START",
});

export const fetchSubscriptionsSuccess = (responseData) => ({
  type: "FETCH_SUBSCRIPTIONS_SUCCESS",
  payload: responseData,
});

export const fetchSubscriptionsFailure = (error) => ({
  type: "FETCH_SUBSCRIPTIONS_FAILURE",
  payload: error,
});

export const fetchSubscriptions =
  (
    page = 1,
    perPage = 10,
    userQuery = "",
    _startDate = "", // unused, for backward compatibility
    _endDate = "", // unused, for backward compatibility
    packageType = "",
    userEmail = "",
    expiryDateFrom = "",
    expiryDateTo = "",
    isActive = ""
  ) =>
  async (dispatch) => {
    dispatch(fetchSubscriptionsStart());
    try {
      // Build query params dynamically
      const params = [`per_page=${perPage}`, `page=${page}`];
      if (userQuery) params.push(`user_query=${encodeURIComponent(userQuery)}`);
      if (packageType)
        params.push(`package_type=${encodeURIComponent(packageType)}`);
      if (userEmail) params.push(`user_email=${encodeURIComponent(userEmail)}`);
      if (expiryDateFrom) params.push(`expiry_date_from=${expiryDateFrom}`);
      if (expiryDateTo) params.push(`expiry_date_to=${expiryDateTo}`);
      if (isActive !== "") params.push(`is_active=${isActive}`);
      const queryString = params.join("&");
      const response = await api.get(`/subscriptions?${queryString}`);

      dispatch(fetchSubscriptionsSuccess(response.data));
    } catch (error) {
      dispatch(
        fetchSubscriptionsFailure(
          error.response?.data?.message || error.message
        )
      );
    }
  };
