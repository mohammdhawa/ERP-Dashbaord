import {
  FETCH_CUSTOMER_MESSAGES_START,
  FETCH_CUSTOMER_MESSAGES_SUCCESS,
  FETCH_CUSTOMER_MESSAGES_FAILURE,
  FETCH_CUSTOMER_MESSAGE_DETAILS_START,
  FETCH_CUSTOMER_MESSAGE_DETAILS_SUCCESS,
  FETCH_CUSTOMER_MESSAGE_DETAILS_FAILURE,
} from "../types.jsx";

const initialState = {
  data: [],
  loading: false,
  error: null,
  totalPages: 0,
  totalCount: 0,
  messageDetails: null,
  messageDetailsLoading: false,
  messageDetailsError: null,
};

const customerMessagesReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_CUSTOMER_MESSAGES_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case FETCH_CUSTOMER_MESSAGES_SUCCESS:
      return {
        ...state,
        loading: false,
        data: action.payload.data,
        totalPages: action.payload.totalPages,
        totalCount: action.payload.totalCount,
        error: null,
      };
    case FETCH_CUSTOMER_MESSAGES_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case FETCH_CUSTOMER_MESSAGE_DETAILS_START:
      return {
        ...state,
        messageDetailsLoading: true,
        messageDetailsError: null,
      };
    case FETCH_CUSTOMER_MESSAGE_DETAILS_SUCCESS:
      return {
        ...state,
        messageDetailsLoading: false,
        messageDetails: action.payload,
        messageDetailsError: null,
      };
    case FETCH_CUSTOMER_MESSAGE_DETAILS_FAILURE:
      return {
        ...state,
        messageDetailsLoading: false,
        messageDetailsError: action.payload,
      };
    default:
      return state;
  }
};

export default customerMessagesReducer; 