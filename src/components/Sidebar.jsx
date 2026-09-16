import { Fragment, useState, useEffect, useRef } from "react";
import ALLImages from "../data/Imagedata";
import { Link, useLocation } from "react-router-dom";
import { MENUITEMS } from "../data/Sidemenudata";
import store from "../redux/Store";
import { useDispatch, useSelector } from "react-redux";
import { hasPermission } from "../data/permissionsCatalog";

import Menuloop from "./Menuloop";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import SimpleBar from "simplebar-react";
import { ThemeChanger } from "../redux/actions/themeActions";
export function closeMenuRecursively(items) {
  items?.forEach((item) => {
    item.active = false;
    closeMenuRecursively(item.children);
  });
}

const Sidebar = () => {
  const location = useLocation();
  const [menuitems, setMenuitems] = useState(MENUITEMS);
  // `state.them` — the slice is `theme`. The typo left this undefined, so every
  // `theme?.…` guard below short-circuited and the hover-to-expand behaviour
  // (the default, since dataverticalstyle starts as "overlay") never ran.
  const theme = useSelector((state) => state.theme);
  const { permissions } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // The document listeners below are attached once but read theme/menu state on
  // every event. Routing them through a ref keeps the handlers stable (so they
  // can actually be removed again) while still seeing current values.
  const handlersRef = useRef({});

  function closeMenuFn() {
    closeMenuRecursively(MENUITEMS);

    setMenuitems((arr) => [...arr]);
  }

  useEffect(() => {
    const mainContent = document.querySelector(".main-content");
    const onMainContentClick = () => handlersRef.current.menuClose?.();
    const onResize = () => handlersRef.current.menuResizeFn?.();

    mainContent?.addEventListener("click", onMainContentClick);
    window.addEventListener("resize", onResize);
    return () => {
      mainContent?.removeEventListener("click", onMainContentClick);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  function Onhover() {
    if (
      (theme?.toggled == "icon-overlay-close" ||
        theme?.toggled == "detached-close") &&
      theme.iconoverlay != "open"
    ) {
      dispatch(ThemeChanger({ ...theme, iconoverlay: "open" }));
    }
  }
  function Outhover() {
    const theme = store.getState();
    if (
      (theme.toggled == "icon-overlay-close" ||
        theme.toggled == "detached-close") &&
      theme.iconoverlay == "open"
    ) {
      dispatch(ThemeChanger({ ...theme, iconoverlay: "" }));
    }
  }

  function menuClose() {
    if (window.innerWidth <= 992) {
      dispatch(ThemeChanger({ ...theme, toggled: "close" }));
    }

    if (theme?.dataverticalstyle == "overlay" && theme.iconoverlay == "open") {
      dispatch(ThemeChanger({ ...theme, iconoverlay: "close" }));
    }

    if (
      theme?.datanavlayout == "horizontal" ||
      theme?.datanavstyle == "menu-click" ||
      theme?.datanavstyle == "icon-click"
    ) {
      closeMenuFn();
    }

    const MainContent = document.querySelector(".main-content");

    if (theme?.dataverticalstyle === "icontext" && theme?.iconText !== "") {
      const theme = store.getState();
      dispatch(ThemeChanger({ ...theme, dataIconText: "open" }));

      MainContent?.addEventListener("click", (_event) => {
        const theme = store.getState();
        dispatch(ThemeChanger({ ...theme, dataIconText: "" }));
      });
    }
    if (
      theme?.dataverticalstyle == "icontext" ||
      theme?.toggled == "icon-text-open"
    ) {
      dispatch(ThemeChanger({ ...theme, icontext: "" }));
    }
  }

  const WindowPreSize = [window.innerWidth];

  function menuResizeFn() {
    WindowPreSize.push(window.innerWidth);
    if (WindowPreSize.length > 2) {
      WindowPreSize.shift();
    }
    const theme = store.getState();
    if (WindowPreSize.length > 1) {
      if (
        WindowPreSize[WindowPreSize.length - 1] < 992 &&
        WindowPreSize[WindowPreSize.length - 2] >= 992
      ) {
        // less than 992;
        dispatch(ThemeChanger({ ...theme, toggled: "close" }));
      }

      if (
        WindowPreSize[WindowPreSize.length - 1] >= 992 &&
        WindowPreSize[WindowPreSize.length - 2] < 992
      ) {
        // greater than 992
        dispatch(
          ThemeChanger({
            ...theme,
            toggled:
              theme.dataverticalstyle == "doublemenu" ? "double-menu-open" : "",
          })
        );
      }
    }
  }

  function switcherArrowFn() {
    // Used to remove is-expanded class and remove class on clicking arrow buttons
    function slideClick() {
      const slide = document.querySelectorAll(".slide");
      const slideMenu = document.querySelectorAll(".slide-menu");

      slide.forEach((element) => {
        if (element.classList.contains("is-expanded")) {
          element.classList.remove("is-expanded");
        }
      });

      slideMenu.forEach((element) => {
        if (element.classList.contains("open")) {
          element.classList.remove("open");
          element.style.display = "none";
        }
      });
    }

    slideClick();
  }

  function slideRight() {
    const menuNav = document.querySelector(".main-menu");
    const mainContainer1 = document.querySelector(".main-sidebar");

    if (menuNav && mainContainer1) {
      const marginLeftValue = Math.ceil(
        Number(
          window.getComputedStyle(menuNav).marginInlineStart.split("px")[0]
        )
      );
      const marginRightValue = Math.ceil(
        Number(window.getComputedStyle(menuNav).marginInlineEnd.split("px")[0])
      );
      const check = menuNav.scrollWidth - mainContainer1.offsetWidth;
      let mainContainer1Width = mainContainer1.offsetWidth;

      if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
        // `dataverticalstyle` is a string ("overlay", "closed", …) and has no
        // `.dir` — reading it threw once `theme` was actually defined.
        if (theme?.dir !== "rtl") {
          if (Math.abs(check) > Math.abs(marginLeftValue)) {
            menuNav.style.marginInlineEnd = "0";

            if (
              !(
                Math.abs(check) >
                Math.abs(marginLeftValue) + mainContainer1Width
              )
            ) {
              mainContainer1Width = Math.abs(check) - Math.abs(marginLeftValue);
              const slideRightButton = document.querySelector("#slide-right");
              if (slideRightButton) {
                slideRightButton.classList.add("hidden");
              }
            }

            menuNav.style.marginInlineStart =
              Number(menuNav.style.marginInlineStart.split("px")[0]) -
              Math.abs(mainContainer1Width) +
              "px";

            const slideRightButton = document.querySelector("#slide-right");
            if (slideRightButton) {
              slideRightButton.classList.remove("hidden");
            }
          }
        } else {
          if (Math.abs(check) > Math.abs(marginRightValue)) {
            menuNav.style.marginInlineEnd = "0";

            if (
              !(
                Math.abs(check) >
                Math.abs(marginRightValue) + mainContainer1Width
              )
            ) {
              mainContainer1Width =
                Math.abs(check) - Math.abs(marginRightValue);
              const slideRightButton = document.querySelector("#slide-right");
              if (slideRightButton) {
                slideRightButton.classList.add("hidden");
              }
            }

            menuNav.style.marginInlineStart =
              Number(menuNav.style.marginInlineStart.split("px")[0]) -
              Math.abs(mainContainer1Width) +
              "px";

            const slideLeftButton = document.querySelector("#slide-left");
            if (slideLeftButton) {
              slideLeftButton.classList.remove("hidden");
            }
          }
        }
      }

      const element = document.querySelector(".main-menu > .slide.open");
      const element1 = document.querySelector(".main-menu > .slide.open > ul");
      if (element) {
        element.classList.remove("active");
      }
      if (element1) {
        element1.style.display = "none";
      }
    }

    switcherArrowFn();
  }

  function slideLeft() {
    const menuNav = document.querySelector(".main-menu");
    const mainContainer1 = document.querySelector(".main-sidebar");

    if (menuNav && mainContainer1) {
      const marginLeftValue = Math.ceil(
        Number(
          window.getComputedStyle(menuNav).marginInlineStart.split("px")[0]
        )
      );
      const marginRightValue = Math.ceil(
        Number(window.getComputedStyle(menuNav).marginInlineEnd.split("px")[0])
      );
      const check = menuNav.scrollWidth - mainContainer1.offsetWidth;
      let mainContainer1Width = mainContainer1.offsetWidth;

      if (menuNav.scrollWidth > mainContainer1.offsetWidth) {
        // `local_varaiable` was a connect() prop name that never existed in
        // this scope — this threw a ReferenceError every time the horizontal
        // menu overflowed. The direction lives on the theme slice.
        if (theme?.dir !== "rtl") {
          if (Math.abs(check) <= Math.abs(marginLeftValue)) {
            menuNav.style.marginInlineStart = "0px";
          }
        } else {
          if (Math.abs(check) > Math.abs(marginRightValue)) {
            menuNav.style.marginInlineStart = "0";

            if (
              !(
                Math.abs(check) >
                Math.abs(marginRightValue) + mainContainer1Width
              )
            ) {
              mainContainer1Width =
                Math.abs(check) - Math.abs(marginRightValue);
              const slideRightButton = document.querySelector("#slide-right");
              if (slideRightButton) {
                slideRightButton.classList.add("hidden");
              }
            }

            menuNav.style.marginInlineStart =
              Number(menuNav.style.marginInlineStart.split("px")[0]) -
              Math.abs(mainContainer1Width) +
              "px";

            const slideLeftButton = document.querySelector("#slide-left");
            if (slideLeftButton) {
              slideLeftButton.classList.remove("hidden");
            }
          }
        }
      }

      const element = document.querySelector(".main-menu > .slide.open");
      const element1 = document.querySelector(".main-menu > .slide.open > ul");
      if (element) {
        element.classList.remove("active");
      }
      if (element1) {
        element1.style.display = "none";
      }
    }

    switcherArrowFn();
  }

  // Attached ONCE, in an effect with a teardown. Registering it in the render
  // body added a fresh listener on every render and removed none of them, so
  // scrolling got progressively more expensive for as long as the app stayed
  // open.
  useEffect(() => {
    const Topup = () => {
      const sidebars = document.querySelectorAll(".app-sidebar");
      sidebars.forEach((e) => {
        e.classList.toggle("sticky-pin", window.scrollY > 30);
      });
    };

    window.addEventListener("scroll", Topup);
    return () => window.removeEventListener("scroll", Topup);
  }, []);

  const level = 0;
  // Drives the collapsed-rail tooltips. Sourced from the theme slice because
  // the localStorage keys this used to read are never written by anything.
  const isDoubleMenu =
    theme?.datanavlayout !== "horizontal" &&
    theme?.dataverticalstyle === "doublemenu";
  let hasParent = false;
  let hasParentLevel = 0;

  function setSubmenu(event, targetObject, MENUITEMS = menuitems) {
    const theme = store.getState();
    if (
      (window.screen.availWidth <= 992 ||
        theme.datanavlayout != "icon-hover") &&
      (window.screen.availWidth <= 992 || theme.datanavlayout != "menu-hover")
    ) {
      if (!event?.ctrlKey) {
        for (const item of MENUITEMS) {
          if (item === targetObject) {
            item.active = true;
            item.selected = true;
            // setMenuAncestorsActive(MENUITEMS,item);
            setMenuAncestorsActive(item);
          } else if (!item.active && !item.selected) {
            item.active = false; // Set active to false for items not matching the target
            item.selected = false; // Set active to false for items not matching the target
          } else {
            // removeActiveOtherMenus(MENUITEMS,item);
            removeActiveOtherMenus(item);
          }
          if (item.children && item.children.length > 0) {
            setSubmenu(event, targetObject, item.children);
          }
        }
      }
    }

    setMenuitems((arr) => [...arr]);
  }

  function getParentObject(obj, childObject) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (
          typeof obj[key] === "object" &&
          JSON.stringify(obj[key]) === JSON.stringify(childObject)
        ) {
          return obj; // Return the parent object
        }
        if (typeof obj[key] === "object") {
          const parentObject = getParentObject(obj[key], childObject);
          if (parentObject !== null) {
            return parentObject;
          }
        }
      }
    }
    return null; // Object not found
  }

  function setMenuAncestorsActive(targetObject) {
    const parent = getParentObject(menuitems, targetObject);
    const theme = store.getState();
    if (parent) {
      if (hasParentLevel > 2) {
        hasParent = true;
      }
      parent.active = true;
      parent.selected = true;
      hasParentLevel += 1;
      setMenuAncestorsActive(parent);
    } else if (!hasParent) {
      if (theme.dataverticalstyle == "doublemenu") {
        // html.setAttribute('data-toggled', 'double-menu-close');
        dispatch(ThemeChanger({ ...theme, toggled: "double-menu-close" }));
      }
    }
  }

  function removeActiveOtherMenus(item) {
    if (item) {
      if (Array.isArray(item)) {
        for (const val of item) {
          val.active = false;
          val.selected = false;
        }
      }
      item.active = false;
      item.selected = false;

      if (item.children && item.children.length > 0) {
        removeActiveOtherMenus(item.children);
      }
    } else {
      return;
    }
  }
  //
  function setMenuUsingUrl(currentPath) {
    hasParent = false;
    hasParentLevel = 1;
    const setSubmenuRecursively = (items) => {
      items?.forEach((item) => {
        if (
          item.path ===
          `${import.meta.env.BASE_URL}maincomponent/dashboards/sales`
        ) {
          // Handle the default case where the path is empty (default path)
          setSubmenu(null, item);
        } else if (item.path === currentPath) {
          setSubmenu(null, item);
        }
        setSubmenuRecursively(item.children);
      });
    };
    setSubmenuRecursively(MENUITEMS);
  }
  const [previousUrl, setPreviousUrl] = useState("/");

  // The observer is torn down with the effect that created it. Without the
  // cleanup a new one was attached to <html> on every navigation and none were
  // ever disconnected, so each route change permanently added another callback
  // firing on every theme attribute write.
  useEffect(() => {
    const observer = new MutationObserver(handleAttributeChange);
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentPath = location.pathname.endsWith("/")
      ? location.pathname.slice(0, -1)
      : location.pathname;

    if (currentPath !== previousUrl) {
      setMenuUsingUrl(currentPath);
      setPreviousUrl(currentPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  function toggleSidemenu(event, targetObject, MENUITEMS = menuitems) {
    const theme = store.getState();
    let element = event.target;

    //for icon-text
    if (
      theme.dataverticalstyle == "icontext" ||
      theme.toggled == "icon-text-close"
    ) {
      dispatch(ThemeChanger({ ...theme, icontext: "open" }));
    }

    if (
      (theme.datanavstyle != "icon-hover" &&
        theme.datanavstyle != "menu-hover") ||
      window.innerWidth < 992 ||
      (theme.datanavlayout != "horizontal" &&
        theme.toggled != "icon-hover-closed" &&
        theme.toggled != "menu-hover-closed")
    ) {
      for (const item of MENUITEMS) {
        if (item === targetObject) {
          if (theme.dataverticalstyle == "doublemenu" && item.active) {
            return;
          }
          item.active = !item.active;

          if (item.active) {
            closeOtherMenus(MENUITEMS, item);
          } else {
            if (theme.dataverticalstyle == "doublemenu") {
              dispatch(
                ThemeChanger({ ...theme, toggled: "double-menu-close" })
              );
            }
          }
          setAncestorsActive(MENUITEMS, item);
        } else if (!item.active) {
          if (theme.dataverticalstyle != "doublemenu") {
            item.active = false; // Set active to false for items not matching the target
          }
        }
        if (item.children && item.children.length > 0) {
          toggleSidemenu(event, targetObject, item.children);
        }
      }
      if (targetObject?.children && targetObject.active) {
        if (
          theme.dataverticalstyle == "doublemenu" &&
          theme.toggled != "double-menu-open"
        ) {
          dispatch(ThemeChanger({ ...theme, toggled: "double-menu-open" }));
        }
      }
      const isHorizontalLayout = theme.datanavlayout === "horizontal";
      const isMenuClickOrIconClick =
        theme.datanavlayout === "menu-click" ||
        theme.datanavlayout === "icon-click";

      if (element && isHorizontalLayout && isMenuClickOrIconClick) {
        const listItem = element.closest("li");
        if (listItem) {
          // Find the first sibling <ul> element
          const siblingUL = listItem.querySelector("ul");
          let outterUlWidth = 0;
          let listItemUL = listItem.closest("ul:not(.main-menu)");
          while (listItemUL) {
            listItemUL = listItemUL.parentElement.closest("ul:not(.main-menu)");
            if (listItemUL) {
              outterUlWidth += listItemUL.clientWidth;
            }
          }
          if (siblingUL) {
            // You've found the sibling <ul> element
            let siblingULRect = listItem.getBoundingClientRect();
            if (theme.dir == "rtl") {
              if (
                siblingULRect.left - siblingULRect.width - outterUlWidth + 150 <
                  0 &&
                outterUlWidth < window.innerWidth &&
                outterUlWidth + siblingULRect.width + siblingULRect.width <
                  window.innerWidth
              ) {
                targetObject.dirchange = true;
              } else {
                targetObject.dirchange = false;
              }
            } else {
              if (
                outterUlWidth + siblingULRect.right + siblingULRect.width + 50 >
                  window.innerWidth &&
                siblingULRect.right >= 0 &&
                outterUlWidth + siblingULRect.width + siblingULRect.width <
                  window.innerWidth
              ) {
                targetObject.dirchange = true;
              } else {
                targetObject.dirchange = false;
              }
            }
          }
          setTimeout(() => {
            let computedValue = siblingUL.getBoundingClientRect();
            if (computedValue.bottom > window.innerHeight) {
              siblingUL.style.height =
                window.innerHeight - computedValue.top - 8 + "px";
              siblingUL.style.overflow = "auto";
            }
          }, 100);
        }
      }
    }
    setMenuitems((arr) => [...arr]);
  }

  function setAncestorsActive(MENUITEMS, targetObject) {
    const theme = store.getState();
    const parent = findParent(MENUITEMS, targetObject);
    if (parent) {
      parent.active = true;
      if (parent.active) {
        dispatch(ThemeChanger({ ...theme, toggled: "double-menu-close" }));
      }

      setAncestorsActive(MENUITEMS, parent);
    } else {
      if (theme.dataverticalstyle == "doublemenu") {
        dispatch(ThemeChanger({ ...theme, toggled: "double-menu-close" }));
      }
    }
  }

  function closeOtherMenus(MENUITEMS, targetObject) {
    for (const item of MENUITEMS) {
      if (item !== targetObject) {
        item.active = false;
        if (item.children && item.children.length > 0) {
          closeOtherMenus(item.children, targetObject);
        }
      }
    }
  }

  function findParent(MENUITEMS, targetObject) {
    for (const item of MENUITEMS) {
      if (item.children && item.children.includes(targetObject)) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const parent = findParent((MENUITEMS = item.children), targetObject);
        if (parent) {
          return parent;
        }
      }
    }
    return null;
  }

  const Sideclick = () => {
    if (window.innerWidth > 992) {
      let html = document.documentElement;
      if (html.getAttribute("icon-overlay") != "open") {
        html.setAttribute("icon-overlay", "open");
      }
    }
  };

  // Kept current AFTER each render so the once-attached document listeners
  // above always call the latest closures. Written in an effect rather than
  // during render: mutating a ref mid-render is a side effect React is free to
  // run twice or discard under concurrent rendering.
  useEffect(() => {
    handlersRef.current.menuClose = menuClose;
    handlersRef.current.menuResizeFn = menuResizeFn;
  });

  function handleAttributeChange(mutationsList) {
    for (const mutation of mutationsList) {
      if (
        mutation.type === "attributes" &&
        (mutation.attributeName === "data-nav-layout" ||
          mutation.attributeName === "data-vertical-style")
      ) {
        const newValue = mutation.target.getAttribute("data-nav-layout");
        if (newValue == "vertical") {
          let currentPath = location.pathname.endsWith("/")
            ? location.pathname.slice(0, -1)
            : location.pathname;
          currentPath = !currentPath
            ? `${import.meta.env.BASE_URL}maincomponent/dashboards/sales`
            : currentPath;
          setMenuUsingUrl(currentPath);
        } else {
          closeMenuFn();
        }
      }
    }
  }

  return (
    <Fragment>
      {/* The mobile backdrop. Its `active` class comes from the store rather
          than from Header reaching in with classList.add(): that imperative
          path was gated on a stale `theme.toggled` and never fired, so below
          992px the menu opened over the page with nothing dimmed behind it and
          no tap-outside-to-close. Rendering it from state also means it clears
          itself when a resize past the breakpoint writes `toggled`. */}
      <div
        id="responsive-overlay"
        className={theme?.toggled === "open" ? "active" : ""}
        onClick={() => menuClose()}
      ></div>
      <aside
        className="app-sidebar sticky"
        id="sidebar"
        onMouseEnter={() => Onhover()}
        onMouseLeave={() => Outhover()}
      >
        <div className="main-sidebar-header border-0">
          <Link to={`${import.meta.env.BASE_URL}`} className="header-logo">
            <img
              src={ALLImages("hBlackLogo")}
              alt="logo"
              className="desktop-logo brand-logo-full"
            />
            <img
              src={ALLImages("sWhiteLogo")}
              alt="logo"
              className="toggle-dark brand-logo-mark"
            />
            <img
              src={ALLImages("hWhiteLogo")}
              alt="logo"
              className="desktop-dark brand-logo-full"
            />
            <img
              src={ALLImages("sBlackLogo")}
              alt="logo"
              className="toggle-logo brand-logo-mark"
            />
          </Link>
        </div>

        <SimpleBar className="main-sidebar" id="sidebar-scroll">
          <nav className="main-menu-container nav nav-pills flex-column sub-open">
            <div
              className="slide-left"
              id="slide-left"
              onClick={() => {
                slideLeft();
              }}
            >
              {" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="#7b8191"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                {" "}
                <path d="M13.293 6.293 7.586 12l5.707 5.707 1.414-1.414L10.414 12l4.293-4.293z"></path>{" "}
              </svg>
            </div>

            <ul className="main-menu" onClick={() => Sideclick()}>
              {MENUITEMS.filter((levelone) =>
                // Top-level `link` entries carried requiredPermissions that
                // nothing read. Menuloop already gates the `sub` branches; this
                // closes the same hole for flat entries so a user can never be
                // shown a menu item that only leads to /no_access.
                levelone.type === "link"
                  ? hasPermission(permissions, levelone.requiredPermissions)
                  : true
              ).map((levelone) => (
                // Keyed by identity, not Math.random(): a random key made React
                // unmount and remount the whole menu tree on every render.
                <Fragment key={levelone.title || levelone.menutitle}>
                  <li
                    className={`${levelone.menutitle ? "slide__category" : ""} 
									                ${levelone.type === "link" ? "slide" : ""}
                                                    ${
                                                      levelone.type === "sub"
                                                        ? "slide has-sub"
                                                        : ""
                                                    } 
													${levelone?.active ? "open" : ""} 
													${levelone?.selected ? "active" : ""}`}
                  >
                    {levelone.menutitle ? (
                      <span className="category-name">
                        {levelone.menutitle}
                      </span>
                    ) : (
                      ""
                    )}
                    {/* if Link */}
                    {levelone.type === "link" ? (
                      <Link
                        to={levelone.path + "/"}
                        className={`side-menu__item ${
                          levelone.selected ? "active" : ""
                        }`}
                        // "You are here" was expressed only as a CSS class, so
                        // it reached sighted users and nobody else.
                        aria-current={levelone.selected ? "page" : undefined}
                      >
                        {/* Read from the theme slice, not localStorage. Nothing
                            in this app ever writes `layout`, `verticalstyles`
                            or `rtl` — only `datathememode` and the auth tokens
                            — so these conditions were permanently false and the
                            doublemenu tooltip never rendered at all. The first
                            and third branches were also byte-identical; the
                            only real question is "doublemenu or not". */}
                        {isDoubleMenu ? (
                          <div className="custom-tooltip">
                            <OverlayTrigger
                              placement={theme?.dir === "rtl" ? "left" : "right"}
                              overlay={<Tooltip>{levelone.title}</Tooltip>}
                            >
                              <i
                                className={`${levelone.icon} side-menu__icon  align-items-center`}
                              ></i>
                            </OverlayTrigger>
                          </div>
                        ) : (
                          <i
                            className={`${levelone.icon} side-menu__icon  align-items-center`}
                          ></i>
                        )}
                        <span className="side-menu__label">
                          {levelone.title}
                        </span>{" "}
                      </Link>
                    ) : (
                      ""
                    )}

                    {levelone.type === "empty" ? (
                      // A non-navigating menu entry, so a <button> rather than
                      // an anchor to "#". (No current MENUITEMS row uses this
                      // type — the branch is kept for the template's sake.)
                      <button
                        type="button"
                        className="side-menu__item btn border-0 bg-transparent w-100 text-end"
                      >
                        {levelone.icon}
                        <span className="">{levelone.title}</span>
                      </button>
                    ) : (
                      ""
                    )}

                    {levelone.type === "sub" ? (
                      <Menuloop
                        MENUITEMS={levelone}
                        level={level + 1}
                        toggleSidemenu={toggleSidemenu}
                      />
                    ) : (
                      ""
                    )}
                  </li>
                </Fragment>
              ))}
            </ul>

            <div
              className="slide-right"
              id="slide-right"
              onClick={() => {
                slideRight();
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="#7b8191"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                {" "}
                <path d="M10.707 17.707 16.414 12l-5.707-5.707-1.414 1.414L13.586 12l-4.293 4.293z"></path>{" "}
              </svg>
            </div>
          </nav>
        </SimpleBar>
      </aside>
    </Fragment>
  );
};

// No connect() wrapper: it mapped the ENTIRE store to an unused
// `local_varaiable` prop, handing back a new object identity on every dispatch
// and re-rendering the whole menu tree on every unrelated state change. The
// component reads what it needs through hooks.
export default Sidebar;
