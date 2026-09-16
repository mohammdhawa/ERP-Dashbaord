import { Fragment } from "react";
import { Breadcrumb } from "react-bootstrap";
import { Link } from "react-router-dom";

// props.homepage  — the <h1> page title
// props.activepage — the parent crumb (its link, when given, is props.homepage_link)
// props.page      — the current crumb
// props.children  — page-level actions, rendered on the trailing side
const Pageheader = (props) => {
  // Only the parent crumb can navigate, and only when a target was supplied.
  // Rendered through <Link> rather than a bare href: Breadcrumb.Item emits a
  // plain <a>, which leaves the SPA entirely — a full document reload that
  // drops Redux state and re-runs the session bootstrap. The no-link case is a
  // <span>, not an anchor to "#", so it is not announced as a link that does
  // nothing.
  const parentCrumbProps = props.homepage_link
    ? { linkAs: Link, linkProps: { to: props.homepage_link } }
    : { linkAs: "span" };

  return (
    <Fragment>
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{props.homepage}</h1>
          <div className="">
            <Breadcrumb className="mb-0">
              <Breadcrumb.Item {...parentCrumbProps}>
                {props.activepage}
              </Breadcrumb.Item>
              <Breadcrumb.Item linkAs="span" active>
                {props.page}
              </Breadcrumb.Item>
            </Breadcrumb>
          </div>
        </div>
        <div className="btn-list">{props.children}</div>
      </div>
    </Fragment>
  );
};

export default Pageheader;
