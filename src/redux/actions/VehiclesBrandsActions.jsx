import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import api from "../api";
import { AlertWithSwal } from "../../components/SwalAlerts";
import { toastNotify } from "../../utils";

// Fetch Vehicle Brands
export const fetchVehicleBrandsStart = () => ({
  type: "FETCH_VEHICLE_BRANDS_START",
});
export const fetchVehicleBrandsSuccess = (brands) => ({
  type: "FETCH_VEHICLE_BRANDS_SUCCESS",
  payload: brands,
});
export const fetchVehicleBrandsFailure = (error) => ({
  type: "FETCH_VEHICLE_BRANDS_FAILURE",
  payload: error,
});

// Create Vehicle Brand
export const createVehicleBrandStart = () => ({
  type: "CREATE_VEHICLE_BRAND_START",
});
export const createVehicleBrandSuccess = (brand) => ({
  type: "CREATE_VEHICLE_BRAND_SUCCESS",
  payload: brand,
});
export const createVehicleBrandFailure = (error) => ({
  type: "CREATE_VEHICLE_BRAND_FAILURE",
  payload: error,
});

// Delete Vehicle Brand
export const deleteVehicleBrandStart = () => ({
  type: "DELETE_VEHICLE_BRAND_START",
});
export const deleteVehicleBrandSuccess = (brandId) => ({
  type: "DELETE_VEHICLE_BRAND_SUCCESS",
  payload: brandId,
});
export const deleteVehicleBrandFailure = (error) => ({
  type: "DELETE_VEHICLE_BRAND_FAILURE",
  payload: error,
});

// Edit Vehicle Brand
export const editVehicleBrandStart = () => ({
  type: "EDIT_VEHICLE_BRAND_START",
});
export const editVehicleBrandSuccess = (brand) => ({
  type: "EDIT_VEHICLE_BRAND_SUCCESS",
  payload: brand,
});
export const editVehicleBrandFailure = (error) => ({
  type: "EDIT_VEHICLE_BRAND_FAILURE",
  payload: error,
});

export const fetchVehicleBrands = () => async (dispatch) => {
  dispatch(fetchVehicleBrandsStart());
  try {
    const response = await api.get("/vehiclebrands");
    dispatch(fetchVehicleBrandsSuccess(response.data));
  } catch (error) {
    dispatch(
      fetchVehicleBrandsFailure(error.response?.data?.message || error.message)
    );
  }
};

export const deleteVehicleBrand = (brandId) => async (dispatch, getState) => {
  const { permissions } = getState().auth;

  if (!permissions.includes("delete_vehicleBrands")) {
    AlertWithSwal(
      "error",
      "خطأ!",
      "ليس لديك الصلاحية لحذف ماركات السيارات",
      "danger"
    );
    dispatch(
      deleteVehicleBrandFailure("ليس لديك الصلاحية لحذف ماركات السيارات")
    );
    return Promise.reject("ليس لديك الصلاحية لحذف ماركات السيارات");
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
      title: `هل أنت متأكد من حذف هذه الماركة؟`,
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
        dispatch(deleteVehicleBrandStart());
        try {
          await api.delete(`/vehiclebrands/${brandId}`);
          dispatch(deleteVehicleBrandSuccess(brandId));
          toastNotify(`تم حذف الماركة بنجاح.`, "success");
          return Promise.resolve();
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "حدث خطأ أثناء محاولة الحذف";
          dispatch(deleteVehicleBrandFailure(errorMessage));
          AlertWithSwal("error", "خطأ!", errorMessage, "danger");
          return Promise.reject(error);
        }
      } else {
        return Promise.resolve();
      }
    });
};

export const createVehicleBrand = (brandData) => async (dispatch, getState) => {
  const { permissions } = getState().auth;

  if (!permissions.includes("create_vehicleBrands")) {
    AlertWithSwal(
      "error",
      "خطأ!",
      "ليس لديك الصلاحية لإضافة ماركات السيارات",
      "danger"
    );
    dispatch(
      createVehicleBrandFailure("ليس لديك الصلاحية لإضافة ماركات السيارات")
    );
    return Promise.reject("ليس لديك الصلاحية لإضافة ماركات السيارات");
  }

  dispatch(createVehicleBrandStart());
  try {
    const response = await api.post("/vehiclebrands", brandData);
    dispatch(createVehicleBrandSuccess(response.data));
    toastNotify(`تم إضافة الماركة بنجاح.`, "success");
    return Promise.resolve(response.data);
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || "حدث خطأ أثناء إضافة الماركة";
    dispatch(createVehicleBrandFailure(errorMessage));
    AlertWithSwal("error", "خطأ!", errorMessage, "danger");
    return Promise.reject(error);
  }
};

export const editVehicleBrand =
  (brandId, brandData) => async (dispatch, getState) => {
    const { permissions } = getState().auth;

    if (!permissions.includes("update_vehicleBrands")) {
      AlertWithSwal(
        "error",
        "خطأ!",
        "ليس لديك الصلاحية لتعديل ماركات السيارات",
        "danger"
      );
      dispatch(
        editVehicleBrandFailure("ليس لديك الصلاحية لتعديل ماركات السيارات")
      );
      return Promise.reject("ليس لديك الصلاحية لتعديل ماركات السيارات");
    }

    dispatch(editVehicleBrandStart());
    try {
      const response = await api.put(`/vehiclebrands/${brandId}`, brandData);
      dispatch(editVehicleBrandSuccess(response.data));
      toastNotify("تم تعديل الماركة بنجاح.", "success");
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || "حدث خطأ أثناء تعديل الماركة";
      dispatch(editVehicleBrandFailure(errorMessage));
      AlertWithSwal("error", "خطأ!", errorMessage, "danger");
      return Promise.reject(errorMessage);
    }
  };
