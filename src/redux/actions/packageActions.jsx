import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import api from "../api";
import { AlertWithSwal } from "../../components/SwalAlerts";
import { toastNotify } from "../../utils";

// Fetch Packages
export const fetchPackagesStart = () => ({ type: "FETCH_PACKAGES_START" });
export const fetchPackagesSuccess = (packages) => ({
  type: "FETCH_PACKAGES_SUCCESS",
  payload: packages,
});
export const fetchPackagesFailure = (error) => ({
  type: "FETCH_PACKAGES_FAILURE",
  payload: error,
});

// Create Package
export const createPackageStart = () => ({ type: "CREATE_PACKAGE_START" });
export const createPackageSuccess = (pkg) => ({
  type: "CREATE_PACKAGE_SUCCESS",
  payload: pkg,
});
export const createPackageFailure = (error) => ({
  type: "CREATE_PACKAGE_FAILURE",
  payload: error,
});

// Delete Package
export const deletePackageStart = () => ({ type: "DELETE_PACKAGE_START" });
export const deletePackageSuccess = (packageId) => ({
  type: "DELETE_PACKAGE_SUCCESS",
  payload: packageId,
});
export const deletePackageFailure = (error) => ({
  type: "DELETE_PACKAGE_FAILURE",
  payload: error,
});

// Edit Package
export const editPackageStart = () => ({ type: "EDIT_PACKAGE_START" });
export const editPackageSuccess = (pkg) => ({
  type: "EDIT_PACKAGE_SUCCESS",
  payload: pkg,
});
export const editPackageFailure = (error) => ({
  type: "EDIT_PACKAGE_FAILURE",
  payload: error,
});

export const fetchPackages = () => async (dispatch) => {
  dispatch(fetchPackagesStart());
  try {
    const response = await api.get("/packages");
    dispatch(fetchPackagesSuccess(response.data));
  } catch (error) {
    dispatch(
      fetchPackagesFailure(error.response?.data?.message || error.message)
    );
  }
};

export const deletePackage = (packageId) => async (dispatch, getState) => {
  const { permissions } = getState().auth;

  if (!permissions.includes("delete_package")) {
    AlertWithSwal("error", "خطأ!", "ليس لديك الصلاحية لحذف الباقات", "danger");
    dispatch(deletePackageFailure("ليس لديك الصلاحية لحذف الباقات"));
    return Promise.reject("ليس لديك الصلاحية لحذف الباقات");
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
      title: `هل أنت متأكد من حذف هذه الباقة؟`,
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
        dispatch(deletePackageStart());

        try {
          await api.delete(`/packages/${packageId}`);
          dispatch(deletePackageSuccess(packageId));
          AlertWithSwal(
            "success",
            "تم الحذف!",
            `تم حذف الباقة بنجاح.`,
            "success"
          );
          return Promise.resolve();
        } catch (error) {
          dispatch(
            deletePackageFailure(
              error.response?.data?.message || "حدث خطأ أثناء محاولة الحذف"
            )
          );
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

export const createPackage = (packageData) => async (dispatch, getState) => {
  const { permissions } = getState().auth;

  if (!permissions.includes("create_package")) {
    AlertWithSwal(
      "error",
      "خطأ!",
      "ليس لديك الصلاحية لإضافة الباقات",
      "danger"
    );
    dispatch(createPackageFailure("ليس لديك الصلاحية لإضافة الباقات"));
    return Promise.reject("ليس لديك الصلاحية لإضافة الباقات");
  }

  dispatch(createPackageStart());
  try {
    const response = await api.post("/packages", packageData);
    
    dispatch(
      createPackageSuccess({
        ...response.data,
        active_subscribers_count: 0,
        total_subscribers_count:0,
      })
    );

    toastNotify(`تم إضافة الباقة بنجاح.`, "success");

    return Promise.resolve(response.data);
  } catch (error) {
    const errorMessage =
      error.response?.data?.errors?.name[0] || "حدث خطأ أثناء إضافة الباقة";
    dispatch(createPackageFailure(errorMessage));
    AlertWithSwal("error", "خطأ!", "حدث خطأ أثناء إضافة الباقة", "danger");
    return Promise.reject(errorMessage);
  }
};

export const editPackage =
  (packageId, packageData) => async (dispatch, getState) => {
    const { permissions } = getState().auth;

    if (!permissions.includes("update_package")) {
      AlertWithSwal(
        "error",
        "خطأ!",
        "ليس لديك الصلاحية لتعديل الباقات",
        "danger"
      );

      dispatch(editPackageFailure("ليس لديك الصلاحية لتعديل الباقات"));
      return Promise.reject("ليس لديك الصلاحية لتعديل الباقات");
    }
    dispatch(editPackageStart());
    try {
      const response = await api.put(`/packages/${packageId}`, packageData);
      dispatch(editPackageSuccess(response.data));
      toastNotify("تم تعديل الباقة بنجاح.", "success");

      return Promise.resolve(response.data);
    } catch (error) {
      const errorMessage =
        error.response?.data?.errors?.name[0] || "حدث خطأ أثناء تعديل الباقة";
      dispatch(createPackageFailure(errorMessage));
      AlertWithSwal("error", "خطأ!", errorMessage, "danger");
      return Promise.reject(errorMessage);
    }
  };
