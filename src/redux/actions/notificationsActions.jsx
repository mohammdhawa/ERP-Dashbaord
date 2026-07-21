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

export const fetchNotifications = (page = 1) => async (dispatch) => {
  dispatch(fetchNotificationsStart());
  try {
    const response = await api.get("/auth/notifications", { params: { page } });
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

// Idempotent server-side; we optimistically decrement the badge.
export const markNotificationRead = (notificationId) => async (dispatch) => {
  try {
    const response = await api.post(
      `/auth/notifications/${notificationId}/read`
    );
    dispatch(markReadSuccess(response.data.data));
  } catch (error) {
    // 404 = doesn't exist OR belongs to another user (indistinguishable by design)
    toastNotify(parseApiError(error).message, "error");
  }
};
