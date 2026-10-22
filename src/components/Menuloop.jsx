import { Fragment, useId } from "react";
import { Link } from "react-router-dom";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { useSelector } from "react-redux";
import { hasPermission } from "../data/permissionsCatalog";

const Menuloop = ({ MENUITEMS, toggleSidemenu, level }) => {
  const { permissions } = useSelector((state) => state.auth);
  const theme = useSelector((state) => state.theme);
  // Ties the toggle to the <ul> it opens via aria-controls. useId because the
  // same group can be rendered more than once (the double-menu layout) and two
  // elements sharing an id would make aria-controls point at the wrong list.
  const submenuId = `slide-menu-${useId()}`;

  // From the theme slice, not localStorage: nothing writes `verticalstyles`,
  // `layout` or `rtl`, so the old conditions were always false and this tooltip
  // never appeared in the doublemenu layout it exists for.
  const isDoubleMenu =
    theme?.datanavlayout !== "horizontal" &&
    theme?.dataverticalstyle === "doublemenu";

  // Hide a parent group unless at least one child is reachable, so empty
  // sections never render for users lacking access to any item inside.
  const hasAnySubMenuAccess = MENUITEMS.children?.some((child) =>
    hasPermission(permissions, child.requiredPermissions)
  );

  const shouldRenderMainMenu =
    hasPermission(permissions, MENUITEMS.requiredPermissions) &&
    hasAnySubMenuAccess;

  if (!shouldRenderMainMenu) {
    return null;
  }

  return (
    <Fragment>
      {/* A <button>, not a <Link to="#!">. This control opens and closes a
          submenu; it navigates nowhere, and the anchor had to preventDefault
          its own href to say so. As a link it was announced as "link #!" with
          no indication that it expands anything, and its open/closed state was
          carried only by a CSS class. aria-expanded now reports that state and
          aria-controls names the list it governs. */}
      <button
        type="button"
        id={`${submenuId}-toggle`}
        aria-expanded={Boolean(MENUITEMS?.active)}
        aria-controls={submenuId}
        className={`side-menu__item ${MENUITEMS?.selected ? "active" : ""}`}
        onClick={(event) => {
          toggleSidemenu(event, MENUITEMS);
        }}
      >
        {level <= 1 &&
          MENUITEMS.icon &&
          (isDoubleMenu ? (
            <div className="custom-tooltip">
              <OverlayTrigger
                placement={theme?.dir === "rtl" ? "left" : "right"}
                overlay={<Tooltip>{MENUITEMS.title}</Tooltip>}
              >
                <i
                  className={`${MENUITEMS.icon} side-menu__icon align-items-center`}
                ></i>
              </OverlayTrigger>
            </div>
          ) : (
            <i
              className={`${MENUITEMS.icon} side-menu__icon align-items-center`}
            ></i>
          ))}

        <span className={`${level === 1 ? "side-menu__label" : ""}`}>
          {MENUITEMS.title}
        </span>

        <i
          className="ri-arrow-left-s-line side-menu__angle fs-7 "
          aria-hidden="true"
        ></i>
      </button>

      <ul
        id={submenuId}
        aria-labelledby={`${submenuId}-toggle`}
        className={`slide-menu child${level}
                          ${MENUITEMS.active ? "double-menu-active" : ""}
                          ${MENUITEMS?.dirchange ? "force-left" : ""}  `}
        style={MENUITEMS.active ? { display: "block" } : { display: "none" }}
      >
        {level <= 1 && (
          // The group's own title, repeated as a heading inside the flyout in
          // the collapsed layouts. It is a label, not a destination — it used
          // to be a <Link to="#!">, which put a focusable dead link in the tab
          // order on every group.
          <li className="slide side-menu__label1" aria-hidden="true">
            <span>{MENUITEMS.title}</span>
          </li>
        )}

        {MENUITEMS.children?.map((firstlevel) =>
          hasPermission(permissions, firstlevel.requiredPermissions) ? (
            <li
              className={`${firstlevel.menutitle ? "slide__category" : ""} 
                  ${firstlevel?.type === "empty" ? "slide" : ""} 
                  ${firstlevel?.type === "link" ? "slide" : ""} 
                  ${firstlevel?.type === "sub" ? "slide has-sub" : ""} 
                  ${firstlevel?.active ? "open" : ""} 
                  ${firstlevel?.selected ? "active" : ""}`}
              // Stable identity — a random key remounted every submenu item on
              // each render, discarding open/closed state and animations.
              key={firstlevel.path || firstlevel.title}
            >
              {firstlevel.type === "link" && (
                <Link
                  to={firstlevel.path || "#!"}
                  className={`side-menu__item ${
                    firstlevel.selected ? "active" : ""
                  }`}
                  // Matches the top-level entries in Sidebar.jsx: the current
                  // page is announced, not just highlighted.
                  aria-current={firstlevel.selected ? "page" : undefined}
                >
                  {firstlevel.icon} <span>{firstlevel.title}</span>
                </Link>
              )}

              {firstlevel.type === "empty" && (
                <Link to="#!" className="side-menu__item">
                  {firstlevel.icon} <span>{firstlevel.title}</span>
                </Link>
              )}

              {firstlevel.type === "sub" && (
                <Menuloop
                  MENUITEMS={firstlevel}
                  toggleSidemenu={toggleSidemenu}
                  level={level + 1}
                />
              )}
            </li>
          ) : null
        )}
      </ul>
    </Fragment>
  );
};

export default Menuloop;
