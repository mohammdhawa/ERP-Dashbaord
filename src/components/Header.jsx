import { Fragment, useEffect, useState } from "react";
import ALLImages from "../data/Imagedata";
import { Dropdown, DropdownDivider } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ThemeChanger } from "../redux/actions/themeActions";
import { logout } from "../redux/actions/authActions";
import {
  fetchUnreadCount,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../redux/actions/notificationsActions";
import moment from "moment";
import NotificationDetailModal from "./NotificationDetailModal";
import { notificationLink } from "../data/referenceRoutes";

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useSelector((state) => state.theme);
  const { user, initialized } = useSelector((state) => state.auth);
  const { unreadCount, items: notifications } = useSelector(
    (state) => state.notifications
  );

  // Navbar badge: poll the unread count every 60s, but only for an
  // authenticated, initialized session. We skip polls while the tab is hidden
  // and guard against overlapping requests; a returning tab polls immediately.
  useEffect(() => {
    if (!user || !initialized) return;
    let inFlight = false;
    const poll = () => {
      if (document.hidden || inFlight) return;
      inFlight = true;
      Promise.resolve(dispatch(fetchUnreadCount())).finally(() => {
        inFlight = false;
      });
    };
    poll();
    const interval = setInterval(poll, 60_000);
    const onVisibility = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dispatch, user, initialized]);

  const [isFullScreen, setIsFullScreen] = useState(false);
  useEffect(() => {
    const handleFullscreenChange = () =>
      setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const ToggleDark = () => {
    const isDarkMode = theme.datathememode === "dark";
    const updatedTheme = {
      ...theme,
      datathememode: isDarkMode ? "light" : "dark",
      dataheaderstyles: isDarkMode ? "light" : "dark",
      datamenustyles:
        theme.datanavlayout === "horizontal" && !isDarkMode
          ? "dark"
          : isDarkMode
          ? "light"
          : "dark",
    };
    dispatch(ThemeChanger(updatedTheme));
    localStorage.setItem("datathememode", isDarkMode ? "light" : "dark");
  };

  const toggleSidebar = () => {
    // MOBILE: one dispatch, derived from the current state.
    //
    // This used to dispatch `toggled: "close"` unconditionally and THEN fall
    // into a branch that read `theme.toggled` from the same render closure —
    // the value before that write. Both dispatches spread the same stale
    // `theme`, so the first was always discarded by the second, and the second
    // decided what to do from a state that no longer existed. A tap on a fresh
    // load therefore did nothing visible at all.
    //
    // The backdrop went with it: the old code added `.active` to
    // #responsive-overlay inside a setTimeout gated on that same stale
    // `theme.toggled == "open"`, which could never be true, so the dim layer
    // and tap-outside-to-close never worked on a phone. The overlay now renders
    // its own state from the store in Sidebar.jsx, which also disposes of the
    // un-removed window "resize" listener that block registered on every tap.
    //
    // Strict `< 992` / `>= 992`: the old `<= 992` and `>= 992` pair both ran at
    // exactly 992.
    //
    // The overlay key below is `iconoverlay`, all lowercase — the name the
    // reducer and main.jsx's data-icon-overlay attribute actually use. It was
    // written as `iconOverlay` in four places, so collapsing the sidebar set a
    // key nothing reads and left the real flag on whatever the last hover had
    // put there. Paired with the Outhover fix in Sidebar.jsx, that is the other
    // half of "the collapsed sidebar stays expanded".
    if (window.innerWidth < 992) {
      dispatch(
        ThemeChanger({
          ...theme,
          toggled: theme.toggled === "open" ? "close" : "open",
        })
      );
      return;
    }

    // DESKTOP (>= 992): the vertical-layout state machine, unchanged.
    const sidemenuType = theme.datanavlayout;
    if (sidemenuType === "vertical") {
      let verticalStyle = theme.dataverticalstyle;
      const navStyle = theme.datanavstyle;
      switch (verticalStyle) {
        // closed
        case "closed":
          dispatch(ThemeChanger({ ...theme, datanavstyle: "" }));
          if (theme.toggled === "close-menu-close") {
            dispatch(ThemeChanger({ ...theme, toggled: "" }));
          } else {
            dispatch(ThemeChanger({ ...theme, toggled: "close-menu-close" }));
          }
          break;
        // icon-overlay
        case "overlay":
          dispatch(ThemeChanger({ ...theme, datanavstyle: "" }));
          if (theme.toggled === "icon-overlay-close") {
            dispatch(
              ThemeChanger({
                ...theme,
                toggled: "",
                iconoverlay: "",
                dataverticalstyle: "default",
              })
            );
          } else {
            if (window.innerWidth >= 992) {
              dispatch(
                ThemeChanger({
                  ...theme,
                  toggled: "icon-overlay-close",
                  iconoverlay: "",
                })
              );
            }
          }
          break;
        // icon-text
        case "icontext":
          dispatch(ThemeChanger({ ...theme, datanavstyle: "" }));
          if (theme.toggled === "icon-text-close") {
            dispatch(ThemeChanger({ ...theme, toggled: "" }));
          } else {
            dispatch(ThemeChanger({ ...theme, toggled: "icon-text-close" }));
          }
          break;
        // doublemenu
        case "doublemenu":
          dispatch(
            ThemeChanger({
              ...theme,
              datanavstyle: "",
              toggled: "double-menu-close",
            })
          );
          if (theme.toggled !== "double-menu-close") {
            dispatch(
              ThemeChanger({ ...theme, toggled: "double-menu-close" })
            );
          } else {
            dispatch(ThemeChanger({ ...theme, toggled: "double-menu-open" }));
          }
          break;
        // detached
        case "detached":
          if (theme.toggled === "detached-close") {
            dispatch(
              ThemeChanger({ ...theme, toggled: "", iconoverlay: "" })
            );
          } else {
            dispatch(
              ThemeChanger({
                ...theme,
                toggled: "detached-close",
                iconoverlay: "",
              })
            );
          }
          break;

        // default
        case "default":
          dispatch(
            ThemeChanger({
              ...theme,
              toggled: "icon-overlay-close",
              dataverticalstyle: "overlay",
            })
          );
          break;
      }
      switch (navStyle) {
        case "menu-click":
          if (theme.toggled === "menu-click-closed") {
            dispatch(ThemeChanger({ ...theme, toggled: "" }));
          } else {
            dispatch(
              ThemeChanger({ ...theme, toggled: "menu-click-closed" })
            );
          }
          break;
        case "menu-hover":
          if (theme.toggled === "menu-hover-closed") {
            dispatch(ThemeChanger({ ...theme, toggled: "" }));
          } else {
            dispatch(
              ThemeChanger({ ...theme, toggled: "menu-hover-closed" })
            );
          }
          break;
        case "icon-click":
          if (theme.toggled === "icon-click-closed") {
            dispatch(ThemeChanger({ ...theme, toggled: "" }));
          } else {
            dispatch(
              ThemeChanger({ ...theme, toggled: "icon-click-closed" })
            );
          }
          break;
        case "icon-hover":
          if (theme.toggled === "icon-hover-closed") {
            dispatch(ThemeChanger({ ...theme, toggled: "" }));
          } else {
            dispatch(
              ThemeChanger({ ...theme, toggled: "icon-hover-closed" })
            );
          }
          break;
      }
    }
  };

  // CONTROLLED, so a row can close the menu. The rows are plain <button>s,
  // not Dropdown.Items, so React-Bootstrap's autoClose never sees a "select"
  // from them and the menu stayed open behind the detail modal.
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Refresh the latest page of notifications when the dropdown opens.
  const handleNotificationsToggle = (isOpen) => {
    setNotificationsOpen(isOpen);
    if (isOpen) {
      dispatch(fetchNotifications(1));
    }
  };

  // A row opens WHERE ITS RECIPIENT ACTS (notificationLink: type first, then
  // reference). A row with nowhere to go opens in full instead
  // (NotificationDetailModal) — otherwise a body longer than the preview line
  // could not be read from the header at all.
  const [openNotification, setOpenNotification] = useState(null);

  const handleNotificationClick = (notify) => {
    if (!notify.is_read) {
      dispatch(markNotificationRead(notify.id));
    }
    setNotificationsOpen(false);

    const link = notificationLink(notify);
    if (link) {
      navigate(link);
    } else {
      setOpenNotification(notify);
    }
  };

  const latestNotifications = notifications.slice(0, 6);

  return (
    <Fragment>
      <header className="app-header">
        <div className="main-header-container container-fluid">
          <div className="d-flex">
            <div className="header-content-left">
              <div className="header-element">
                <div className="horizontal-logo">
                  <Link
                    to={`${import.meta.env.BASE_URL}`}
                    className="header-logo"
                  >
                    <img
                      src={ALLImages("hBlackLogo")}
                      alt="logo"
                      className="desktop-logo brand-logo-full"
                    />
                    <img
                      src={ALLImages("sBlackLogo")}
                      alt="logo"
                      className="toggle-logo brand-logo-mark"
                    />
                    <img
                      src={ALLImages("hWhiteLogo")}
                      alt="logo"
                      className="desktop-dark brand-logo-full"
                    />
                    <img
                      src={ALLImages("sWhiteLogo")}
                      alt="logo"
                      className="toggle-dark brand-logo-mark"
                    />
                  </Link>
                </div>
              </div>

              {/* A real <button>: as a <Link to="#"> this pushed a history
                  entry on every toggle and announced itself as a link to
                  assistive tech rather than as the control it is. */}
              <div className="header-element mx-lg-0 mx-2">
                <button
                  type="button"
                  aria-label="إظهار أو إخفاء القائمة الجانبية"
                  className="sidemenu-toggle header-link animated-arrow hor-toggle horizontal-navtoggle btn border-0 bg-transparent p-0"
                  onClick={() => toggleSidebar()}
                >
                  <span></span>
                </button>
              </div>
            </div>
          </div>

          <ul className="header-content-right">
            <li className="header-element header-theme-mode">
              <button
                type="button"
                className="header-link layout-setting btn border-0 bg-transparent"
                onClick={() => ToggleDark()}
                aria-label={
                  theme.datathememode === "dark"
                    ? "التبديل إلى الوضع الفاتح"
                    : "التبديل إلى الوضع الداكن"
                }
                aria-pressed={theme.datathememode === "dark"}
              >
                <span className="light-layout">
                  <i className="bi bi-moon header-link-icon" aria-hidden="true"></i>
                </span>
                <span className="dark-layout">
                  <i
                    className="bi bi-brightness-high header-link-icon"
                    aria-hidden="true"
                  ></i>
                </span>
              </button>
            </li>

            {/* Notifications: badge fed by the 60s unread-count poll.
                DEFAULT autoClose, not "outside". React-Bootstrap's "outside"
                means exactly what it says — only a click OUTSIDE the menu
                closes it — so clicking a notification or "عرض الكل" navigated
                with the panel still open, and because the header persists
                across routes the open overlay rode along to the destination
                page and sat on top of it. Nothing in this menu needs to
                survive a click inside it. */}
            <Dropdown
              className="header-element notifications-dropdown"
              show={notificationsOpen}
              onToggle={handleNotificationsToggle}
            >
              <Dropdown.Toggle
                className="header-link position-relative"
                variant=""
                as="a"
                id="dropdown-notifications"
                aria-label={
                  unreadCount > 0
                    ? `الإشعارات، ${unreadCount} غير مقروءة`
                    : "الإشعارات"
                }
              >
                <i className="bi bi-bell header-link-icon" aria-hidden="true"></i>
                {unreadCount > 0 && (
                  <span
                    className="badge bg-danger rounded-pill position-absolute"
                    style={{ top: "0.4rem", insetInlineEnd: "0.1rem", fontSize: "0.6rem" }}
                    aria-hidden="true"
                  >
                    {unreadCount > 99 ? "+99" : unreadCount}
                  </span>
                )}
              </Dropdown.Toggle>

              <Dropdown.Menu className="main-header-dropdown" align="end">
                <div className="p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <p className="mb-0 fs-16">الإشعارات</p>
                    <span
                      className="badge bg-secondary-transparent"
                      id="notifiation-data"
                    >
                      {unreadCount} غير مقروءة
                    </span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 mt-1 fs-12"
                      onClick={() => dispatch(markAllNotificationsRead())}
                    >
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>
                <DropdownDivider />
                <div className="list-unstyled mb-0">
                  {latestNotifications.length === 0 && (
                    <div className="p-5 empty-item1">
                      <div className="text-center">
                        <span className="avatar avatar-xl avatar-rounded bg-secondary-transparent">
                          <i className="ri-notification-off-line fs-2"></i>
                        </span>
                        <h6 className="fw-medium mt-3">لا يوجد إشعارات</h6>
                      </div>
                    </div>
                  )}

                  {/* A real <button>, not a <div onClick>: as a div these rows
                      took no focus, were not announced as actionable and could
                      not be activated with a keyboard at all. */}
                  {latestNotifications.map((notify) => (
                    <button
                      type="button"
                      className="dropdown-item text-end w-100 border-0 bg-transparent"
                      key={notify.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleNotificationClick(notify)}
                    >
                      <div className="d-flex align-items-center">
                        <div className="pe-2 lh-1">
                          <span
                            className={`avatar avatar-rounded ${
                              notify.is_read
                                ? "bg-light text-muted"
                                : "bg-primary-transparent"
                            }`}
                          >
                            <i
                              className={`fs-18 ${
                                notify.is_read
                                  ? "ri-notification-line"
                                  : "ri-notification-3-fill"
                              }`}
                              aria-hidden="true"
                            ></i>
                          </span>
                        </div>
                        <div className="flex-grow-1">
                          {/* <span>, not <p>: a button may only contain
                              phrasing content, and a <p> inside one is invalid
                              markup browsers repair unpredictably. */}
                          <span
                            className={`d-block mb-0 ${
                              notify.is_read ? "" : "fw-semibold"
                            }`}
                          >
                            {notify.title}
                          </span>
                          {notify.body && (
                            <span className="text-muted fw-normal fs-12 header-notification-text d-block">
                              {notify.body}
                            </span>
                          )}
                          <span className="text-muted fs-11">
                            {moment(notify.created_at).format(
                              "YYYY-MM-DD HH:mm"
                            )}
                          </span>
                        </div>
                        {!notify.is_read && (
                          <span
                            className="p-1 rounded-circle bg-primary d-inline-block ms-2"
                            aria-hidden="true"
                          ></span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-3 empty-header-item1 border-top">
                  <div className="text-center">
                    <Link
                      to="/notifications"
                      className="link-primary text-decoration-underline"
                    >
                      عرض الكل
                    </Link>
                  </div>
                </div>
              </Dropdown.Menu>
            </Dropdown>

            {/* Profile Dropdown. Default autoClose for the same reason as the
                notifications menu above — with "outside", signing out left the
                panel hanging open over the sign-in screen. */}
            <Dropdown className="header-element">
              <Dropdown.Toggle
                as="a"
                className="header-link no-caret"
                variant=""
                id="mainHeaderProfile"
                // Below xl the name is hidden by `d-xl-block d-none` and all
                // that is left is an avatar icon, so the control had no
                // accessible name at all on a laptop or a phone. The label is
                // unconditional: the visible name is not a substitute, because
                // "أحمد العلي" alone does not say the button opens a menu.
                aria-label={
                  user?.name
                    ? `حساب المستخدم: ${user.name}`
                    : "حساب المستخدم"
                }
              >
                <div className="d-flex align-items-center">
                  <div className="me-sm-2 me-0">
                    <span className="avatar bg-primary-transparent avatar-sm avatar-rounded">
                      <i className="ri-user-line fs-13" aria-hidden="true"></i>
                    </span>
                  </div>
                  <div className="d-xl-block d-none lh-1">
                    <span className="lh-1">{user?.name}</span>
                  </div>
                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu
                className="main-header-dropdown pt-0 overflow-hidden header-profile-dropdown"
                align="end"
              >
                <div className="p-3 border-bottom">
                  <p className="mb-0 fw-semibold">{user?.name}</p>
                  <span className="text-muted fs-12">{user?.email}</span>
                </div>
                <Dropdown.Item
                  as={Link}
                  to="/change-password"
                  className="d-flex align-items-center"
                >
                  <i
                    className="bi bi-key fs-16 me-2 op-7"
                    aria-hidden="true"
                  ></i>
                  تغيير كلمة المرور
                </Dropdown.Item>
                <Dropdown.Item
                  as={Link}
                  to="/sessions"
                  className="d-flex align-items-center"
                >
                  <i
                    className="bi bi-laptop fs-16 me-2 op-7"
                    aria-hidden="true"
                  ></i>
                  الجلسات والأجهزة
                </Dropdown.Item>
                {/* `as="button"` instead of href="#": logging out is an action,
                    and the anchor left a stray "#" in the URL on the way out. */}
                <Dropdown.Item
                  as="button"
                  type="button"
                  onClick={() => {
                    dispatch(logout());
                  }}
                  className="d-flex align-items-center"
                >
                  <i
                    className="bi bi-box-arrow-right fs-16 me-2 op-7"
                    aria-hidden="true"
                  ></i>
                  تسجيل الخروج
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </ul>
        </div>
      </header>
      <NotificationDetailModal
        notification={openNotification}
        onClose={() => setOpenNotification(null)}
      />
    </Fragment>
  );
};

// No connect() wrapper: it mapped the ENTIRE store to an unused
// `local_varaiable` prop, so the header re-rendered on every dispatch anywhere
// in the app — every list fetch, every filter keystroke. It already reads the
// slices it needs with useSelector.
export default Header;
