import api from "../api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";

// Notifications — /api/auth/notifications. Auth-only (no permission), every
// operation is scoped to the authenticated user's own notifications.

export const fetchNotificationsStart = () => ({
  type: "FETCH_NOTIFICATIONS_START",
});
export const fetchNotificationsSuccess = (payload) => ({
  type: "FETCH_NOTIFICATIONS_SUCCESS",
  payload, // { items, meta }
});
export const fetchNotificationsFailure = (error) => ({
  type: "FETCH_NOTIFICATIONS_FAILURE",
  payload: error,
});

export const setUnreadCount = (count) => ({
  type: "SET_UNREAD_COUNT",
  payload: count,
});

export const markReadSuccess = (notification) => ({
  type: "MARK_NOTIFICATION_READ",
  payload: notification,
});

export const fetchNotifications =
  (page = 1, perPage = 10) => async (dispatch) => {
  dispatch(fetchNotificationsStart());
  try {
    const response = await api.get("/auth/notifications", {
      params: { page, per_page: perPage },
    });
    dispatch(
      fetchNotificationsSuccess({
        items: response.data.data,
        meta: response.data.meta,
      })
    );
  } catch (error) {
    const parsed = parseApiError(error);
    dispatch(fetchNotificationsFailure(parsed.message));
  }
};

// Polled every 60s from the header badge — designed for frequent polling.
// Silent on failure: a missed poll must not spam toasts.
export const fetchUnreadCount = () => async (dispatch) => {
  try {
    const response = await api.get("/auth/notifications/unread-count");
    dispatch(setUnreadCount(response.data.data.unread_count));
  } catch {
    /* silent */
  }
};

export const markAllReadSuccess = () => ({ type: "MARK_ALL_NOTIFICATIONS_READ" });

// POST /auth/notifications/read-all — every unread notification the caller
// has, not just the page on screen. On success the loaded items and the badge
// are cleared locally (the server answers with how many changed, so nothing
// else needs re-reading); on failure, re-sync from the server like a failed
// single mark-read does.
export const markAllNotificationsRead =
  (refetchPage = 1, perPage = 10) =>
  async (dispatch) => {
    try {
      const response = await api.post("/auth/notifications/read-all");
      dispatch(markAllReadSuccess());
      toastNotify(response.data.message, "success");
    } catch {
      toastNotify("تعذّر تحديث الإشعارات، يرجى المحاولة مرة أخرى.", "error");
      dispatch(fetchNotifications(refetchPage, perPage));
      dispatch(fetchUnreadCount());
    }
  };

// Idempotent server-side. On success we sync the item + badge from the
// returned object. On failure (incl. 404 = missing OR not owned, which are
// indistinguishable by design) we show a generic safe message and re-sync the
// current page + badge so the UI reflects the real server state.
export const markNotificationRead =
  (notificationId, refetchPage = 1, perPage = 10) =>
  async (dispatch) => {
    try {
      const response = await api.post(
        `/auth/notifications/${notificationId}/read`
      );
      dispatch(markReadSuccess(response.data.data));
    } catch {
      toastNotify("تعذّر تحديث الإشعار، يرجى المحاولة مرة أخرى.", "error");
      dispatch(fetchNotifications(refetchPage, perPage));
      dispatch(fetchUnreadCount());
    }
  };
