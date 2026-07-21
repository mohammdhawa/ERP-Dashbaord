
import api from "../api";

export const fetchPermissionsStart = () => ({
  type: "FETCH_PERMISSIONS_START",
});

export const fetchPermissionsSuccess = (permissions) => ({
  type: "FETCH_PERMISSIONS_SUCCESS",
  payload: permissions,
});

export const fetchPermissionsFailure = (error) => ({
  type: "FETCH_PERMISSIONS_FAILURE",
  payload: error,
});

export const fetchPermissions = () => async (dispatch) => {
  dispatch(fetchPermissionsStart());
  try {
    const response = await api.get("/permissions");
    dispatch(fetchPermissionsSuccess(response.data));
  } catch (error) {
    dispatch(
      fetchPermissionsFailure(
        error.response?.data?.message || error.message || "Something went wrong"
      )
    );
  }
};
