import Swal from "sweetalert2";
import api from "../api";
import { AlertWithSwal } from "../../components/SwalAlerts";
import { toastNotify } from "../../utils";

export const fetchFeaturesStart = () => ({ type: "FETCH_FEATURES_START" });
export const fetchFeaturesSuccess = (features) => ({
  type: "FETCH_FEATURES_SUCCESS",
  payload: features,
});
export const fetchFeaturesFailure = (error) => ({
  type: "FETCH_FEATURES_FAILURE",
  payload: error,
});

// Create Feature
export const createFeatureStart = () => ({ type: "CREATE_FEATURE_START" });
export const createFeatureSuccess = (feature) => ({
  type: "CREATE_FEATURE_SUCCESS",
  payload: feature,
});
export const createFeaturesSuccessAfterGroupCreate = (features) => ({
  type: "CREATE_FEATURES_SUCCESS_AFTER_GROUP_CREATE",
  payload: features,
});
export const deleteFeaturesByDeletedGroupID = (groupId) => ({
  type: "DELETE_FEATURES_BY_GROUP",
  payload: groupId,
});
export const createFeatureFailure = (error) => ({
  type: "CREATE_FEATURE_FAILURE",
  payload: error,
});

// Delete Feature
export const deleteFeatureStart = () => ({ type: "DELETE_FEATURE_START" });
export const deleteFeatureSuccess = (featureId) => ({
  type: "DELETE_FEATURE_SUCCESS",
  payload: featureId,
});
export const deleteFeatureFailure = (error) => ({
  type: "DELETE_FEATURE_FAILURE",
  payload: error,
});

// Edit Feature
export const editFeatureStart = () => ({ type: "EDIT_FEATURE_START" });
export const editFeatureSuccess = (feature) => ({
  type: "EDIT_FEATURE_SUCCESS",
  payload: feature,
});
export const editFeatureFailure = (error) => ({
  type: "EDIT_FEATURE_FAILURE",
  payload: error,
});

export const fetchFeatures = () => async (dispatch) => {
  dispatch(fetchFeaturesStart());
  try {
    const response = await api.get("/features");
    dispatch(fetchFeaturesSuccess(response.data));
  } catch (error) {
    dispatch(
      fetchFeaturesFailure(error.response?.data?.message || error.message)
    );
  }
};

export const deleteFeature = (featureId) => async (dispatch, getState) => {
  const { permissions } = getState().auth;

  if (!permissions.includes("delete_feature")) {
    AlertWithSwal("error", "خطأ!", "ليس لديك الصلاحية لحذف الميزات", "danger");

    dispatch(deleteFeatureFailure("ليس لديك الصلاحية لحذف الميزات"));
    return Promise.reject("ليس لديك الصلاحية لحذف الميزات");
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
      title: `هل أنت متأكد من حذف هذه الميزة؟`,
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
        dispatch(deleteFeatureStart());
        try {
          await api.delete(`/features/${featureId}`);
          dispatch(deleteFeatureSuccess(featureId));
          toastNotify(`تم حذف الميزة بنجاح.`, "success");
          return Promise.resolve();
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "حدث خطأ أثناء محاولة الحذف";

          dispatch(deleteFeatureFailure(errorMessage));
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

export const createFeature = (featureData) => async (dispatch, getState) => {
  const { permissions } = getState().auth;

  if (!permissions.includes("create_feature")) {
    AlertWithSwal(
      "error",
      "خطأ!",
      "ليس لديك الصلاحية لإضافة الميزات",
      "danger"
    );

    dispatch(createFeatureFailure("ليس لديك الصلاحية لإضافة الميزات"));
    return Promise.reject("ليس لديك الصلاحية لإضافة الميزات");
  }

  dispatch(createFeatureStart());
  try {
    const response = await api.post("/features", featureData);
    dispatch(createFeatureSuccess(response.data));
    toastNotify(`تم إضافة الميزة بنجاح.`, "success");

    return Promise.resolve(response.data);
  } catch (error) {
    const errorMessage =
      error.response?.data?.errors?.name ||
      error.response?.data?.errors?.feature_group_id ||
      "حدث خطأ أثناء إضافة الميزة";
    dispatch(createFeatureFailure(errorMessage));
    AlertWithSwal("error", "خطأ!", errorMessage, "danger");
    return Promise.reject(error);
  }
};

export const editFeature =
  (featureId, featureData) => async (dispatch, getState) => {
    const { permissions } = getState().auth;

    if (!permissions.includes("update_feature")) {
      AlertWithSwal(
        "error",
        "خطأ!",
        "ليس لديك الصلاحية لتعديل الميزات",
        "danger"
      );

      dispatch(editFeatureFailure("ليس لديك الصلاحية لتعديل الميزات"));
      return Promise.reject("ليس لديك الصلاحية لتعديل الميزات");
    }

    dispatch(editFeatureStart());
    try {
      const response = await api.put(`/features/${featureId}`, featureData);
      dispatch(editFeatureSuccess(response.data));

      toastNotify("تم تعديل الميزة بنجاح.", "success");
    } catch (error) {
      const errorMessage =
        error.response?.data?.errors?.name ||
        error.response?.data?.errors?.feature_group_id ||
        "حدث خطأ أثناء تعديل الميزة";
      dispatch(
        editFeatureFailure(errorMessage || "حدث خطأ أثناء تعديل الميزة")
      );
      AlertWithSwal("error", "خطأ!", errorMessage, "danger");
      return Promise.reject(error);
    }
  };
