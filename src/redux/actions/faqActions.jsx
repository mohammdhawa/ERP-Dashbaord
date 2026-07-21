import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import api from "../api";
import { AlertWithSwal } from "../../components/SwalAlerts";
import { toastNotify } from "../../utils";
// Fetch FAQs
export const fetchFaqsStart = () => ({ type: "FETCH_FAQS_START" });
export const fetchFaqsSuccess = (faqs) => ({
  type: "FETCH_FAQS_SUCCESS",
  payload: faqs,
});
export const fetchFaqsFailure = (error) => ({
  type: "FETCH_FAQS_FAILURE",
  payload: error,
});

// Create FAQ
export const createFaqStart = () => ({ type: "CREATE_FAQ_START" });
export const createFaqSuccess = (faq) => ({
  type: "CREATE_FAQ_SUCCESS",
  payload: faq,
});
export const createFaqFailure = (error) => ({
  type: "CREATE_FAQ_FAILURE",
  payload: error,
});

// Delete FAQ
export const deleteFaqStart = () => ({ type: "DELETE_FAQ_START" });
export const deleteFaqSuccess = (faqId) => ({
  type: "DELETE_FAQ_SUCCESS",
  payload: faqId,
});
export const deleteFaqFailure = (error) => ({
  type: "DELETE_FAQ_FAILURE",
  payload: error,
});

// Edit FAQ
export const editFaqStart = () => ({ type: "EDIT_FAQ_START" });
export const editFaqSuccess = (faq) => ({
  type: "EDIT_FAQ_SUCCESS",
  payload: faq,
});
export const editFaqFailure = (error) => ({
  type: "EDIT_FAQ_FAILURE",
  payload: error,
});

export const fetchFaqs = () => async (dispatch) => {
  dispatch(fetchFaqsStart());
  try {
    const response = await api.get("/popularQuestions");
    dispatch(fetchFaqsSuccess(response.data));
  } catch (error) {
    dispatch(fetchFaqsFailure(error.response?.data?.message || error.message));
  }
};

export const deleteFaq = (faqId) => async (dispatch, getState) => {
  const { permissions } = getState().auth;

  if (!permissions.includes("delete_faq")) {
    AlertWithSwal(
      "error",
      "خطأ!",
      "ليس لديك الصلاحية لحذف الأسئلة الشائعة",
      "danger"
    );

    dispatch(deleteFaqFailure("ليس لديك الصلاحية لحذف الأسئلة الشائعة"));
    return Promise.reject("ليس لديك الصلاحية لحذف الأسئلة الشائعة");
  }

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: "btn btn-danger me-2",
      cancelButton: "btn btn-light me-2",
    },
    buttonsStyling: false,
  });

  return swalWithBootstrapButtons
    .fire({
      title: `هل أنت متأكد من حذف هذا السؤال؟`,
      text: "لن تتمكن من التراجع عن هذا الإجراء!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "حذف",
      cancelButtonText: "إلغاء",
      reverseButtons: true,
      backdrop: true,
    })
    .then(async (result) => {
      if (result.isConfirmed) {
        dispatch(deleteFaqStart());
        try {
          await api.delete(`/popularQuestions/${faqId}`);
          dispatch(deleteFaqSuccess(faqId));
          toastNotify(`تم حذف السؤال بنجاح.`, "success");
          return Promise.resolve();
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "حدث خطأ أثناء محاولة الحذف";

          dispatch(deleteFaqFailure(errorMessage));
          AlertWithSwal(
            "error",
            "خطأ!",
            "حدث خطأ أثناء محاولة الحذف",
            "danger"
          );

          return Promise.reject(error);
        }
      } else {
        return Promise.resolve();
      }
    });
};

export const createFaq = (faqData) => async (dispatch, getState) => {
  const { permissions } = getState().auth;

  if (!permissions.includes("create_faq")) {
    AlertWithSwal(
      "error",
      "خطأ!",
      "ليس لديك الصلاحية لإضافة الأسئلة الشائعة",
      "danger"
    );
    dispatch(createFaqFailure("ليس لديك الصلاحية لإضافة الأسئلة الشائعة"));
    return Promise.reject("ليس لديك الصلاحية لإضافة الأسئلة الشائعة");
  }

  dispatch(createFaqStart());
  try {
    const response = await api.post("/popularQuestions", faqData);
    dispatch(createFaqSuccess(response.data));
    toastNotify(`تم إضافة السؤال بنجاح.`, "success");

    return Promise.resolve(response.data);
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || "حدث خطأ أثناء إضافة السؤال";
    dispatch(createFaqFailure(errorMessage));
    AlertWithSwal("error", "خطأ!", errorMessage, "danger");
    return Promise.reject(error);
  }
};

export const editFaq = (faqId, faqData) => async (dispatch, getState) => {
  const { permissions } = getState().auth;

  if (!permissions.includes("update_faq")) {
    AlertWithSwal(
      "error",
      "خطأ!",
      "ليس لديك الصلاحية لتعديل الأسئلة الشائعة",
      "danger"
    );

    dispatch(editFaqFailure("ليس لديك الصلاحية لتعديل الأسئلة الشائعة"));
    return Promise.reject("ليس لديك الصلاحية لتعديل الأسئلة الشائعة");
  }

  dispatch(editFaqStart());
  try {
    const response = await api.put(`/popularQuestions/${faqId}`, faqData);
    dispatch(editFaqSuccess(response.data));

    toastNotify("تم تعديل السؤال بنجاح.", "success");
  } catch (error) {
    dispatch(
      editFaqFailure(
        error.response?.data?.message || "حدث خطأ أثناء تعديل السؤال"
      )
    );
    AlertWithSwal("error", "خطأ!", "حدث خطأ أثناء تعديل السؤال", "danger");
    return Promise.reject(error);
  }
};
