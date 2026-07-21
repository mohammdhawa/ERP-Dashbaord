const initialState = {
  items: [],
  meta: null,
  unreadCount: 0,
  fetchLoading: false,
  error: null,
};

const notificationsReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_NOTIFICATIONS_START":
      return { ...state, fetchLoading: true, error: null };
    case "FETCH_NOTIFICATIONS_SUCCESS":
      return {
        ...state,
        fetchLoading: false,
        items: action.payload.items,
        meta: action.payload.meta,
      };
    case "FETCH_NOTIFICATIONS_FAILURE":
      return { ...state, fetchLoading: false, error: action.payload };

    case "SET_UNREAD_COUNT":
      return { ...state, unreadCount: action.payload };

    case "MARK_NOTIFICATION_READ": {
      const updated = action.payload;
      const wasUnread = state.items.some(
        (n) => n.id === updated.id && !n.is_read
      );
      return {
        ...state,
        items: state.items.map((n) => (n.id === updated.id ? updated : n)),
        unreadCount: wasUnread
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    }

    case "LOGOUT_SUCCESS":
      return initialState;

    default:
      return state;
  }
};

export default notificationsReducer;
