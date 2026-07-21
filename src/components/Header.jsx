import { Fragment, useEffect, useState } from "react";
import ALLImages from "../data/Imagedata";
import { Dropdown, DropdownDivider } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { connect, useDispatch, useSelector } from "react-redux";
import { ThemeChanger } from "../redux/actions/themeActions";
import { logout } from "../redux/actions/authActions";
import {
  fetchUnreadCount,
  fetchNotifications,
  markNotificationRead,
} from "../redux/actions/notificationsActions";
import moment from "moment";

// Maps a notification `reference` ({ type: FQCN, id }) to a module route for
// deep-linking. Phase 1 has no per-record detail pages, so we land on the
// owning module's list page.
const referenceLink = (reference) => {
  if (!reference?.type) return null;
  const type = reference.type.toLowerCase();
  if (type.includes("employee")) return "/hr/employees";
  if (type.includes("department")) return "/departments";
  if (type.includes("user")) return "/users";
  if (type.includes("role")) return "/roles";
  return null;
};

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useSelector((state) => state.theme);
  const { user } = useSelector((state) => state.auth);
  const { unreadCount, items: notifications } = useSelector(
    (state) => state.notifications
  );

  // Navbar badge: poll the unread count every 60 seconds while logged in.
  useEffect(() => {
    if (!user) return;
    dispatch(fetchUnreadCount());
    const interval = setInterval(() => {
      dispatch(fetchUnreadCount());
    }, 60_000);
    return () => clearInterval(interval);
  }, [dispatch, user]);

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

  function menuClose() {
    dispatch(ThemeChanger({ ...theme, toggled: "close" }));
  }

  const toggleSidebar = () => {
    let sidemenuType = theme.datanavlayout;

    if (window.innerWidth <= 992) {
      dispatch(ThemeChanger({ ...theme, toggled: "close" }));
    }
    if (window.innerWidth >= 992) {
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
                  iconOverlay: "",
                  dataverticalstyle: "default",
                })
              );
            } else {
              if (window.innerWidth >= 992) {
                dispatch(
                  ThemeChanger({
                    ...theme,
                    toggled: "icon-overlay-close",
                    iconOverlay: "",
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
                ThemeChanger({ ...theme, toggled: "", iconOverlay: "" })
              );
            } else {
              dispatch(
                ThemeChanger({
                  ...theme,
                  toggled: "detached-close",
                  iconOverlay: "",
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
    } else {
      if (theme.toggled === "close") {
        dispatch(ThemeChanger({ ...theme, toggled: "open" }));

        setTimeout(() => {
          if (theme.toggled == "open") {
            const overlay = document.querySelector("#responsive-overlay");

            if (overlay) {
              overlay.classList.add("active");
              overlay.addEventListener("click", () => {
                const overlay = document.querySelector("#responsive-overlay");

                if (overlay) {
                  overlay.classList.remove("active");
                  menuClose();
                }
              });
            }
          }

          window.addEventListener("resize", () => {
            if (window.screen.width >= 992) {
              const overlay = document.querySelector("#responsive-overlay");

              if (overlay) {
                overlay.classList.remove("active");
              }
            }
          });
        }, 100);
      } else {
        dispatch(ThemeChanger({ ...theme, toggled: "close" }));
      }
    }
  };

  // Refresh the latest page of notifications when the dropdown opens.
  const handleNotificationsToggle = (isOpen) => {
    if (isOpen) {
      dispatch(fetchNotifications(1));
    }
  };

  const handleNotificationClick = (notify) => {
    if (!notify.is_read) {
      dispatch(markNotificationRead(notify.id));
    }
    const link = referenceLink(notify.reference);
    if (link) navigate(link);
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
                      className="desktop-logo"
                    />
                    <img
                      src={ALLImages("sBlackLogo")}
                      alt="logo"
                      className="toggle-logo"
                    />
                    <img
                      src={ALLImages("hWhiteLogo")}
                      alt="logo"
                      className="desktop-dark"
                    />
                    <img
                      src={ALLImages("sWhiteLogo")}
                      alt="logo"
                      className="toggle-dark"
                    />
                  </Link>
                </div>
              </div>

              <div
                className="header-element mx-lg-0 mx-2"
                style={{ cursor: "pointer" }}
                onClick={() => toggleSidebar()}
              >
                <Link
                  aria-label="Hide Sidebar"
                  className="sidemenu-toggle header-link animated-arrow hor-toggle horizontal-navtoggle"
                  to="#"
                >
                  <span></span>
                </Link>
              </div>
            </div>
          </div>

          <ul className="header-content-right">
            <li className="header-element header-theme-mode">
              <Link
                to="#"
                className="header-link layout-setting"
                onClick={() => ToggleDark()}
              >
                <span className="light-layout">
                  <i className="bi bi-moon header-link-icon"></i>
                </span>
                <span className="dark-layout">
                  <i className="bi bi-brightness-high header-link-icon"></i>
                </span>
              </Link>
            </li>

            {/* Notifications: badge fed by the 60s unread-count poll */}
            <Dropdown
              className="header-element notifications-dropdown"
              autoClose="outside"
              onToggle={handleNotificationsToggle}
            >
              <Dropdown.Toggle
                className="header-link position-relative"
                variant=""
                as="a"
                id="dropdown-notifications"
              >
                <i className="bi bi-bell header-link-icon"></i>
                {unreadCount > 0 && (
                  <span
                    className="badge bg-danger rounded-pill position-absolute"
                    style={{ top: "0.4rem", insetInlineEnd: "0.1rem", fontSize: "0.6rem" }}
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

                  {latestNotifications.map((notify) => (
                    <div
                      className="dropdown-item"
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
                            ></i>
                          </span>
                        </div>
                        <div className="flex-grow-1">
                          <p
                            className={`mb-0 ${
                              notify.is_read ? "" : "fw-semibold"
                            }`}
                          >
                            {notify.title}
                          </p>
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
                          <span className="p-1 rounded-circle bg-primary d-inline-block ms-2"></span>
                        )}
                      </div>
                    </div>
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

            {/* Profile Dropdown */}
            <Dropdown className="header-element" autoClose="outside">
              <Dropdown.Toggle
                as="a"
                className="header-link no-caret"
                variant=""
                id="mainHeaderProfile"
              >
                <div className="d-flex align-items-center">
                  <div className="me-sm-2 me-0">
                    <span className="avatar bg-primary-transparent avatar-sm avatar-rounded">
                      <i className="ri-user-line fs-13"></i>
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
                  onClick={() => {
                    dispatch(logout());
                  }}
                  className="d-flex align-items-center"
                  href="#"
                >
                  <i className="bi bi-box-arrow-right fs-16 me-2 op-7"></i>
                  تسجيل الخروج
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </ul>
        </div>
      </header>
    </Fragment>
  );
};

const mapStateToProps = (state) => ({
  local_varaiable: state,
});

export default connect(mapStateToProps, { ThemeChanger })(Header);
