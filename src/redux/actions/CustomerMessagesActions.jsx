import api from "../api";
import {
  FETCH_CUSTOMER_MESSAGES_START,
  FETCH_CUSTOMER_MESSAGES_SUCCESS,
  FETCH_CUSTOMER_MESSAGES_FAILURE,
  FETCH_CUSTOMER_MESSAGE_DETAILS_START,
  FETCH_CUSTOMER_MESSAGE_DETAILS_SUCCESS,
  FETCH_CUSTOMER_MESSAGE_DETAILS_FAILURE,
} from "../types.jsx";
import { toastNotify } from "../../utils";

// system-complaints
export const fetchCustomerMessages = (page = 1, perPage = 10, search = "") => {
  return async (dispatch) => {
    dispatch({ type: FETCH_CUSTOMER_MESSAGES_START });
    try {
      const response = await api.get(
        `/system-complaints?page=${page}&per_page=${perPage}&search=${search}`
      );
      const paged = response.data.data;
      dispatch({
        type: FETCH_CUSTOMER_MESSAGES_SUCCESS,
        payload: {
          data: paged["system complaints"] || [],
          totalPages: paged.total_pages || 1,
          totalCount: paged.total || 0,
          currentPage: paged.current_page || 1,
          perPage: paged.per_page || perPage,
        },
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "حدث خطأ أثناء جلب رسائل العملاء";
      dispatch({
        type: FETCH_CUSTOMER_MESSAGES_FAILURE,
        payload: errorMessage,
      });
      toastNotify("error", errorMessage);
    }
  };
};

export const fetchCustomerMessageDetails = (id) => {
  return async (dispatch) => {
    dispatch({ type: FETCH_CUSTOMER_MESSAGE_DETAILS_START });
    try {
      const response = await api.get(`/system-complaints/${id}`);
      dispatch({
        type: FETCH_CUSTOMER_MESSAGE_DETAILS_SUCCESS,
        payload: response.data.data,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "حدث خطأ أثناء جلب تفاصيل الرسالة";
      dispatch({
        type: FETCH_CUSTOMER_MESSAGE_DETAILS_FAILURE,
        payload: errorMessage,
      });
      toastNotify("error", errorMessage);
    }
  };
};

// // Delete Report
// export const deleteReportStart = () => ({
//   type: "DELETE_REPORT_START",
// });

// export const deleteReportSuccess = (reportId) => ({
//   type: "DELETE_REPORT_SUCCESS",
//   payload: reportId,
// });

// export const deleteReportFailure = (error) => ({
//   type: "DELETE_REPORT_FAILURE",
//   payload: error,
// });

// export const deleteReport = (reportId) => async (dispatch) => {
//   dispatch(deleteReportStart());
//   try {
//     await api.delete(`/system-complaints/${reportId}`);
//     dispatch(deleteReportSuccess(reportId));
//     toastNotify("success", "Report deleted successfully");
//   } catch (error) {
//     dispatch(
//       deleteReportFailure(
//         error.response?.data?.message || error.message || "Something went wrong"
//       )
//     );
//     toastNotify("error", "Failed to delete report");
//   }
// }; 