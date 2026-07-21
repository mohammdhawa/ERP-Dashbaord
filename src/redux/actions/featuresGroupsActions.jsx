import Swal from "sweetalert2";
import api from "../api";
import { AlertWithSwal } from "../../components/SwalAlerts";
import { toastNotify } from "../../utils";
import {
  createFeaturesSuccessAfterGroupCreate,
  deleteFeaturesByDeletedGroupID,
} from "./featuresActions";

export const fetchFeatureGroupsStart = () => ({
  type: "FETCH_FEATURE_GROUPS_START",
});
export const fetchFeatureGroupsSuccess = (featureGroups) => ({
  type: "FETCH_FEATURE_GROUPS_SUCCESS",
  payload: featureGroups,
});
export const fetchFeatureGroupsFailure = (error) => ({
  type: "FETCH_FEATURE_GROUPS_FAILURE",
  payload: error,
});

export const createFeatureGroupStart = () => ({
  type: "CREATE_FEATURE_GROUP_START",
});
export const createFeatureGroupSuccess = (featureGroup) => ({
  type: "CREATE_FEATURE_GROUP_SUCCESS",
  payload: featureGroup,
});
export const createFeatureGroupFailure = (error) => ({
  type: "CREATE_FEATURE_GROUP_FAILURE",
  payload: error,
});

export const deleteFeatureGroupStart = () => ({
  type: "DELETE_FEATURE_GROUP_START",
});
export const deleteFeatureGroupSuccess = (featureGroupId) => ({
  type: "DELETE_FEATURE_GROUP_SUCCESS",
  payload: featureGroupId,
});
export const deleteFeatureGroupFailure = (error) => ({
  type: "DELETE_FEATURE_GROUP_FAILURE",
  payload: error,
});

export const editFeatureGroupStart = () => ({
  type: "EDIT_FEATURE_GROUP_START",
});
export const editFeatureGroupSuccess = (featureGroup) => ({
  type: "EDIT_FEATURE_GROUP_SUCCESS",
  payload: featureGroup,
});
export const editFeatureGroupFailure = (error) => ({
  type: "EDIT_FEATURE_GROUP_FAILURE",
  payload: error,
});

export const fetchFeatureGroups = () => async (dispatch) => {
  dispatch(fetchFeatureGroupsStart());
  try {
    const response = await api.get("/feature-groups");
    dispatch(fetchFeatureGroupsSuccess(response.data));
  } catch (error) {
    dispatch(
      fetchFeatureGroupsFailure(error.response?.data?.message || error.message)
    );
  }
};

export const deleteFeatureGroup =
  (featureGroupId) => async (dispatch, getState) => {
    const { permissions } = getState().auth;

    if (!permissions.includes("delete_feature_group")) {
      AlertWithSwal(
        "error",
        "خطأ!",
        "ليس لديك الصلاحية لحذف مجموعات الميزات",
        "danger"
      );
      dispatch(
        deleteFeatureGroupFailure("ليس لديك الصلاحية لحذف مجموعات الميزات")
      );
      return Promise.reject("ليس لديك الصلاحية لحذف مجموعات الميزات");
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
        title: `هل أنت متأكد من حذف هذه المجموعة؟`,
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
          dispatch(deleteFeatureGroupStart());
          try {
            await api.delete(`/feature-groups/${featureGroupId}`);
            dispatch(deleteFeatureGroupSuccess(featureGroupId));
            dispatch(deleteFeaturesByDeletedGroupID(featureGroupId));
            toastNotify(`تم حذف المجموعة بنجاح.`, "success");
            return Promise.resolve();
          } catch (error) {
            const errorMessage =
              error.response?.data?.message || "حدث خطأ أثناء محاولة الحذف";

            dispatch(deleteFeatureGroupFailure(errorMessage));
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

export const createFeatureGroup =
  (featureGroupData) => async (dispatch, getState) => {
    const { permissions } = getState().auth;

    if (!permissions.includes("create_feature_group")) {
      AlertWithSwal(
        "error",
        "خطأ!",
        "ليس لديك الصلاحية لإضافة مجموعات الميزات",
        "danger"
      );
      dispatch(
        createFeatureGroupFailure("ليس لديك الصلاحية لإضافة مجموعات الميزات")
      );
      return Promise.reject("ليس لديك الصلاحية لإضافة مجموعات الميزات");
    }
    dispatch(createFeatureGroupStart());
    try {
      const response = await api.post("/feature-groups", featureGroupData);
      dispatch(createFeatureGroupSuccess(response.data));
      if (response.data?.features && response.data?.features?.length > 0) {
        dispatch(
          createFeaturesSuccessAfterGroupCreate(response.data?.features)
        );
      }
      toastNotify(`تم إضافة المجموعة بنجاح.`, "success");
      return Promise.resolve(response.data);
    } catch (error) {
      const errorMessage =
        error.response?.data?.errors?.name || "حدث خطأ أثناء إضافة المجموعة";
      dispatch(createFeatureGroupFailure(errorMessage));
      AlertWithSwal("error", "خطأ!", errorMessage, "danger");
      return Promise.reject(error);
    }
  };

export const editFeatureGroup =
  (featureGroupId, updatedData) => async (dispatch, getState) => {
    const { permissions } = getState().auth;

    if (!permissions.includes("update_feature_group")) {
      AlertWithSwal(
        "error",
        "خطأ!",
        "ليس لديك الصلاحية لتعديل مجموعات الميزات",
        "danger"
      );
      dispatch(
        editFeatureGroupFailure("ليس لديك الصلاحية لتعديل مجموعات الميزات")
      );
      return Promise.reject("ليس لديك الصلاحية لتعديل مجموعات الميزات");
    }

    dispatch(editFeatureGroupStart());

    try {
      const response = await api.put(
        `/feature-groups/${featureGroupId}`,
        updatedData
      );
      dispatch(editFeatureGroupSuccess(response.data));
      toastNotify(`تم تعديل المجموعة بنجاح.`, "success");
      return Promise.resolve(response.data);
    } catch (error) {
      const errorMessage =
        error.response?.data?.errors?.name || "حدث خطأ أثناء تعديل المجموعة";

      dispatch(editFeatureGroupFailure(errorMessage));
      AlertWithSwal("error", "خطأ!", errorMessage, "danger");
      return Promise.reject(error);
    }
  };
