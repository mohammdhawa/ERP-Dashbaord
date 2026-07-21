import Swal from "sweetalert2";
import { AlertWithSwal } from "../../components/SwalAlerts";
import { toastNotify } from "../../utils";
import api from "../api";

export const fetchAdvertisementsStart = () => ({
  type: "FETCH_ADVERTISEMENTS_START",
});

export const fetchAdvertisementsSuccess = (responseData) => ({
  type: "FETCH_ADVERTISEMENTS_SUCCESS",
  payload: responseData,
});

export const fetchAdvertisementsFailure = (error) => ({
  type: "FETCH_ADVERTISEMENTS_FAILURE",
  payload: error,
});

export const processAdvertisementStart = () => ({
  type: "PROCESS_ADVERTISEMENT_START",
});

export const processAdvertisementSuccess = (advertisement) => ({
  type: "PROCESS_ADVERTISEMENT_SUCCESS",
  payload: advertisement,
});

export const processAdvertisementFailure = (error) => ({
  type: "PROCESS_ADVERTISEMENT_FAILURE",
  payload: error,
});

export const deleteAdvertisementStart = () => ({
  type: "DELETE_ADVERTISEMENT_START",
});

export const deleteAdvertisementSuccess = (advertisementId) => ({
  type: "DELETE_ADVERTISEMENT_SUCCESS",
  payload: advertisementId,
});

export const deleteAdvertisementFailure = (error) => ({
  type: "DELETE_ADVERTISEMENT_FAILURE",
  payload: error,
});

export const fetchAdvertisements =
  (page = 1, perPage = 10, userQuery = "", adsStatus = "", activeStatus = "", city = "", categoryId = "") =>
  async (dispatch) => {
    dispatch(fetchAdvertisementsStart());
    try {
      const response = await api.get(
        `/advertisements?per_page=${perPage}&page=${page}&user_query=${userQuery}&ads_status=${adsStatus}&active_status=${activeStatus}&city=${city}&category_id=${categoryId}`
      );
      dispatch(fetchAdvertisementsSuccess(response.data.data));
    } catch (error) {
      dispatch(
        fetchAdvertisementsFailure(
          error.response?.data?.message || error.message
        )
      );
    }
  };

export const processAdvertisement =
  (id, processData) => async (dispatch, getState) => {
    const { permissions } = getState().auth;

    if (!permissions.includes("process_ad")) {
      dispatch(
        processAdvertisementFailure("ليس لديك الصلاحية لتغيير حالة الإعلان")
      );
      return Promise.reject("ليس لديك الصلاحية لتغيير حالة الإعلان");
    }
    dispatch(processAdvertisementStart());
    try {
      const response = await api.post(
        `/advertisements/${id}/process`,
        processData
      );
      dispatch(processAdvertisementSuccess(response.data));
      toastNotify("تم تغيير حالة الإعلان بنجاح.", "success");
    } catch (error) {
      const errorMessage = error.message || "حدث خطأ أثناء تغيير حالة الإعلان";
      dispatch(
        processAdvertisementFailure(
          error.response?.data?.message ||
            error.message ||
            "حدث خطأ تغيير حالة الإعلان"
        )
      );
      AlertWithSwal("error", "خطأ!", errorMessage, "danger");
      return Promise.reject(errorMessage);
    }
  };

export const deleteAdvertisement = (adId) => async (dispatch, getState) => {
  const { permissions } = getState().auth;

  if (!permissions.includes("delete_ad")) {
    AlertWithSwal("error", "خطأ!", "ليس لديك الصلاحية لحذف الإعلان", "danger");

    dispatch(deleteAdvertisementFailure("ليس لديك الصلاحية لحذف الإعلان"));
    return Promise.reject("ليس لديك الصلاحية لحذف الإعلان");
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
      title: `هل أنت متأكد من حذف هذا الإعلان؟`,
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
        dispatch(deleteAdvertisementStart());
        try {
          await api.delete(`/advertisements/${adId}`);
          dispatch(deleteAdvertisementSuccess(adId));
          toastNotify(`تم حذف الإعلان بنجاح.`, "success");
          return Promise.resolve(true);
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "حدث خطأ أثناء محاولة الحذف";
          dispatch(deleteAdvertisementFailure(errorMessage));
          AlertWithSwal("error", "خطأ!", errorMessage, "danger");
          return Promise.reject(errorMessage);
        }
      } else {
        return Promise.resolve(false);
      }
    });
};
