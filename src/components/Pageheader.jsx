import { Fragment } from "react";
import { Breadcrumb } from "react-bootstrap";

const Pageheader = (props) => {
  return (
    <Fragment>
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{props.homepage}</h1>
          <div className="">
            <Breadcrumb className="mb-0">
              <Breadcrumb.Item className="" href={props.homepage_link || "#"}>
                {props.activepage}
              </Breadcrumb.Item>
              <Breadcrumb.Item className="" href="#" active>
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
