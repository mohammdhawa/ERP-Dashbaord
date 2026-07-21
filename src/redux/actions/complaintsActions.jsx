import api from "../api";
import {
  FETCH_COMPLAINTS_START,
  FETCH_COMPLAINTS_SUCCESS,
  FETCH_COMPLAINTS_FAILURE,
} from "../types.jsx";
import { toastNotify } from "../../utils";

export const fetchComplaints = (page = 1, perPage = 10, search = "", advId = "") => {
  return async (dispatch) => {
    dispatch({ type: FETCH_COMPLAINTS_START });
    try {
      let url = `/complaints?page=${page}&per_page=${perPage}&search=${search}`;
      if (advId) url += `&adv_id=${advId}`;
      const response = await api.get(url);
      const paged = response.data.data;
      dispatch({
        type: FETCH_COMPLAINTS_SUCCESS,
        payload: {
          data: paged.complaints || [],
          totalPages: paged.total_pages || 1,
          totalCount: paged.total || 0,
          currentPage: paged.current_page || 1,
          perPage: paged.per_page || perPage,
        },
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "حدث خطأ أثناء جلب الشكاوى";
      dispatch({
        type: FETCH_COMPLAINTS_FAILURE,
        payload: errorMessage,
      });
      toastNotify("error", errorMessage);
    }
  };
}; 