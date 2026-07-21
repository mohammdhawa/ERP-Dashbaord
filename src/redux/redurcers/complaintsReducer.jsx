import {
  FETCH_COMPLAINTS_START,
  FETCH_COMPLAINTS_SUCCESS,
  FETCH_COMPLAINTS_FAILURE,
} from "../types.jsx";

const initialState = {
  data: [],
  loading: false,
  error: null,
  totalPages: 0,
  totalCount: 0,
};

const complaintsReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_COMPLAINTS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case FETCH_COMPLAINTS_SUCCESS:
      return {
        ...state,
        loading: false,
        data: action.payload.data || [],
        totalPages: action.payload.totalPages || 1,
        totalCount: action.payload.totalCount || 0,
        error: null,
      };
    case FETCH_COMPLAINTS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

export default complaintsReducer; 