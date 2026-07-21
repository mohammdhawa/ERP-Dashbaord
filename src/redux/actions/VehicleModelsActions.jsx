import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import api from "../api";
import { AlertWithSwal } from "../../components/SwalAlerts";
import { toastNotify } from "../../utils";

// Fetch Vehicle Models
export const fetchVehicleModelsStart = () => ({
  type: "FETCH_VEHICLE_MODELS_START",
});
export const fetchVehicleModelsSuccess = (models) => ({
  type: "FETCH_VEHICLE_MODELS_SUCCESS",
  payload: models,
});
export const fetchVehicleModelsFailure = (error) => ({
  type: "FETCH_VEHICLE_MODELS_FAILURE",
  payload: error,
});

// Create Vehicle Model
export const createVehicleModelStart = () => ({
  type: "CREATE_VEHICLE_MODEL_START",
});
export const createVehicleModelSuccess = (model) => ({
  type: "CREATE_VEHICLE_MODEL_SUCCESS",
  payload: model,
});
export const createVehicleModelFailure = (error) => ({
  type: "CREATE_VEHICLE_MODEL_FAILURE",
  payload: error,
});

// Delete Vehicle Model
export const deleteVehicleModelStart = () => ({
  type: "DELETE_VEHICLE_MODEL_START",
});
export const deleteVehicleModelSuccess = (modelId) => ({
  type: "DELETE_VEHICLE_MODEL_SUCCESS",
  payload: modelId,
});
export const deleteVehicleModelFailure = (error) => ({
  type: "DELETE_VEHICLE_MODEL_FAILURE",
  payload: error,
});

// Edit Vehicle Model
export const editVehicleModelStart = () => ({
  type: "EDIT_VEHICLE_MODEL_START",
});
export const editVehicleModelSuccess = (model) => ({
  type: "EDIT_VEHICLE_MODEL_SUCCESS",
  payload: model,
});
export const editVehicleModelFailure = (error) => ({
  type: "EDIT_VEHICLE_MODEL_FAILURE",
  payload: error,
});

export const fetchVehicleModels = () => async (dispatch) => {
  dispatch(fetchVehicleModelsStart());
  try {
    const response = await api.get("/vehiclemodels");
    dispatch(fetchVehicleModelsSuccess(response.data));
  } catch (error) {
    dispatch(
      fetchVehicleModelsFailure(error.response?.data?.message || error.message)
    );
  }
};

export const deleteVehicleModel = (modelId) => async (dispatch, getState) => {
  const { permissions } = getState().auth;

  if (!permissions.includes("delete_vehicleModels")) {
    AlertWithSwal(
      "error",
      "خطأ!",
      "ليس لديك الصلاحية لحذف موديلات السيارات",
      "danger"
    );
    dispatch(
      deleteVehicleModelFailure("ليس لديك الصلاحية لحذف موديلات السيارات")
    );
    return Promise.reject("ليس لديك الصلاحية لحذف موديلات السيارات");
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
      title: `هل أنت متأكد من حذف هذا الموديل؟`,
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
        dispatch(deleteVehicleModelStart());
        try {
          await api.delete(`/vehiclemodels/${modelId}`);
          dispatch(deleteVehicleModelSuccess(modelId));
          toastNotify(`تم حذف الموديل بنجاح.`, "success");
          return Promise.resolve();
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "حدث خطأ أثناء محاولة الحذف";
          dispatch(deleteVehicleModelFailure(errorMessage));
          AlertWithSwal("error", "خطأ!", errorMessage, "danger");
          return Promise.reject(error);
        }
      } else {
        return Promise.resolve();
      }
    });
};

export const createVehicleModel = (modelData) => async (dispatch, getState) => {
  const { permissions } = getState().auth;

  if (!permissions.includes("create_vehicleModels")) {
    AlertWithSwal(
      "error",
      "خطأ!",
      "ليس لديك الصلاحية لإضافة موديلات السيارات",
      "danger"
    );
    dispatch(
      createVehicleModelFailure("ليس لديك الصلاحية لإضافة موديلات السيارات")
    );
    return Promise.reject("ليس لديك الصلاحية لإضافة موديلات السيارات");
  }

  dispatch(createVehicleModelStart());
  try {
    const response = await api.post("/vehiclemodels", modelData);
    dispatch(createVehicleModelSuccess(response.data));
    toastNotify(`تم إضافة الموديل بنجاح.`, "success");
    return Promise.resolve(response.data);
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || "حدث خطأ أثناء إضافة الموديل";
    dispatch(createVehicleModelFailure(errorMessage));
    AlertWithSwal("error", "خطأ!", errorMessage, "danger");
    return Promise.reject(error);
  }
};

export const editVehicleModel =
  (modelId, modelData) => async (dispatch, getState) => {
    const { permissions } = getState().auth;

    if (!permissions.includes("update_vehicleModels")) {
      AlertWithSwal(
        "error",
        "خطأ!",
        "ليس لديك الصلاحية لتعديل موديلات السيارات",
        "danger"
      );
      dispatch(
        editVehicleModelFailure("ليس لديك الصلاحية لتعديل موديلات السيارات")
      );
      return Promise.reject("ليس لديك الصلاحية لتعديل موديلات السيارات");
    }

    dispatch(editVehicleModelStart());
    try {
      const response = await api.put(`/vehiclemodels/${modelId}`, modelData);
      dispatch(editVehicleModelSuccess(response.data));
      toastNotify("تم تعديل الموديل بنجاح.", "success");
      return Promise.resolve(response.data);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || "حدث خطأ أثناء تعديل الموديل";
      dispatch(editVehicleModelFailure(errorMessage));
      AlertWithSwal("error", "خطأ!", errorMessage, "danger");
      return Promise.reject(errorMessage);
    }
  };
