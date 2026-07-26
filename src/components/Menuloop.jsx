import { Fragment } from "react";
import { Link } from "react-router-dom";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { useSelector } from "react-redux";
import { hasPermission } from "../data/permissionsCatalog";

const Menuloop = ({ MENUITEMS, toggleSidemenu, level }) => {
  const { permissions } = useSelector((state) => state.auth);

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
      <Link
        to="#!"
        className={`side-menu__item ${MENUITEMS?.selected ? "active" : ""}`}
        onClick={(event) => {
          event.preventDefault();
          toggleSidemenu(event, MENUITEMS);
        }}
      >
        {level <= 1 &&
          MENUITEMS.icon &&
          (localStorage.verticalstyles === "doublemenu" &&
          localStorage.layout !== "horizontal" ? (
            <div className="custom-tooltip">
              <OverlayTrigger
                placement={localStorage.rtl ? "left" : "right"}
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

        <i className="ri-arrow-left-s-line side-menu__angle fs-7 "></i>
      </Link>

      <ul
        className={`slide-menu child${level}  
                          ${MENUITEMS.active ? "double-menu-active" : ""} 
                          ${MENUITEMS?.dirchange ? "force-left" : ""}  `}
        style={MENUITEMS.active ? { display: "block" } : { display: "none" }}
      >
        {level <= 1 && (
          <li className="slide side-menu__label1">
            <Link to="#!">{MENUITEMS.title}</Link>
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
              key={Math.random()}
            >
              {firstlevel.type === "link" && (
                <Link
                  to={firstlevel.path || "#!"}
                  className={`side-menu__item ${
                    firstlevel.selected ? "active" : ""
                  }`}
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
