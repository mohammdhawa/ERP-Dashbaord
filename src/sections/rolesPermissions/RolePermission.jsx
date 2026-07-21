import React, { Fragment, useEffect, useState } from "react";
import { Card, Col, Nav, Row, Tab } from "react-bootstrap";
import { Helmet } from "react-helmet";
import { Loader, PageHeader } from "../../components";
import Roles from "./Roles";
import Permissions from "./Permissions";
import { useDispatch, useSelector } from "react-redux";
import { fetchRoles } from "../../redux/actions/rolesActions";
import { fetchPermissions } from "../../redux/actions/permissionActions";
import AddRoleModal from "./AddRoleModal";
import { ProtectedElement } from "../../pages";

const RolePermission = () => {
  const { fetchRoleLoading, roles } = useSelector((state) => state.roles);
  const { fetchPermsLoading, permissions } = useSelector(
    (state) => state.permissions
  );
  const { profile } = useSelector((state) => state.auth);

  const [addModalShow, setAddModalShow] = useState(false);
  const [alertShow, setAlertShow] = useState(true);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchRoles());
  }, [dispatch]);
  useEffect(() => {
    dispatch(fetchPermissions());
  }, []);
  return (
    <Fragment>
      <Helmet>
        <title>Dashboard | Roles & Permissions</title>
      </Helmet>
      {fetchRoleLoading || fetchPermsLoading ? (
        <Loader />
      ) : (
        <Fragment>
          <PageHeader
            homepage="الأدوار والصلاحيات"
            activepage="إدارة الموقع"
            page="الأدوار والصلاحيات"
          >
            {profile?.user?.role_id === 2 && (
              <ProtectedElement
                element={
                  <button
                    onClick={() => {
                      setAddModalShow(true);
                    }}
                    className="btn btn-secondary btn-wave"
                  >
                    <i className="ri-add-line align-middle me-1"></i> اضافة دور
                  </button>
                }
                requiredPermissions={["create_role"]}
              />
            )}
          </PageHeader>
          {alertShow && (
            <div
              className={`alert alert-secondary gap-4 justify-content-between fade show d-flex align-items-center fs-14`}
              role="alert"
            >
              <div className="d-flex align-items-start">
                <i className="ri-alert-line me-2"></i>
                <div>
                  تأكد من تعيين الصلاحيات للأدوار المناسبة فقط، وفقًا لمتطلبات
                  العمل والسياسات المعتمدة، لتجنب أي مخاطر أمنية أو سوء استخدام
                  للنظام.
                </div>
              </div>
              <i
                className="ri-close-line"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setAlertShow(false);
                }}
              ></i>
            </div>
          )}
          <Row>
            <Col xl={12}>
              <Card className="custom-card">
                <Card.Body className="p-0">
                  <Row className="g-0">
                    <Col xl={3} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-secondary-transparent">
                            <i className="ri-briefcase-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">{roles?.length}</h5>
                          <p className="text-muted mb-0 fs-15">
                            إجمالي الأدوار
                          </p>
                        </div>
                      </div>
                    </Col>
                    <Col xl={3} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-success-transparent">
                            <i className="ri-shield-keyhole-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">
                            {permissions?.length}
                          </h5>
                          <p className="text-muted mb-0 fs-15">
                            إجمالي الصلاحيات
                          </p>
                        </div>
                      </div>
                    </Col>
                    <Col xl={3} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-info-transparent">
                            <i className="ri-shining-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">محاسب</h5>
                          <p className="text-muted mb-0 fs-15">
                            أكثر الأدوار استخدامًا
                          </p>
                        </div>
                      </div>
                    </Col>
                    <Col xl={3}>
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-danger-transparent">
                            <i className="ri-error-warning-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">20</h5>
                          <p className="text-muted mb-0 fs-15">
                            صلاحيات غير مرتبطة
                          </p>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Tab.Container defaultActiveKey="first">
            <Nav
              variant="pills"
              className="nav-tabs tab-style-6 nav-justified mb-3 d-flex d-flex"
              id="myTab1"
              role="tablist"
              defaultActiveKey="first"
            >
              <Nav.Item>
                <Nav.Link
                  eventKey="first"
                  id="order-tab"
                  type="button"
                  className="d-flex py-3 text-center align-items-center justify-content-center"
                >
                  الأدوار
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  eventKey="second"
                  id="confirmed-tab"
                  type="button"
                  className="d-flex py-3 text-center  align-items-center justify-content-center"
                >
                  الصلاحيات
                </Nav.Link>
              </Nav.Item>
            </Nav>
            <Tab.Content id="myTabContent">
              <Tab.Pane
                className="fade text-muted"
                id="order-tab-pane"
                role="tabpanel"
                eventKey="first"
                aria-labelledby="roles-tab"
                tabIndex={0}
              >
                <Row>
                  <Col xl={12}>
                    <Roles />
                  </Col>
                </Row>
              </Tab.Pane>
              <Tab.Pane
                className="fade text-muted"
                id="confirm-tab-pane"
                eventKey="second"
                role="tabpanel"
                aria-labelledby="permissions-tab"
                tabIndex={0}
              >
                <Row>
                  <Col xl={12}>
                    <Permissions />
                  </Col>
                </Row>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Fragment>
      )}
      <AddRoleModal
        open={addModalShow}
        close={() => {
          setAddModalShow(!addModalShow);
        }}
      />
    </Fragment>
  );
};

export default RolePermission;
