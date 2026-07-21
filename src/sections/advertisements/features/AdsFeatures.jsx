import React, { Fragment, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { ProtectedElement } from "../../../pages";
import { Card, Col, Nav, Row, Tab } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { fetchFeatures } from "../../../redux/actions/featuresActions";
import Features from "./Features";
import { Loader, PageHeader } from "../../../components";
import AddFeatureModal from "./AddFeatureModal";
import { fetchFeatureGroups } from "../../../redux/actions/featuresGroupsActions";
import Groups from "./Groups";
import AddGroupModal from "./AddGroupModal";
import { AlertWithSwal } from "../../../components/SwalAlerts";

const AdsFeatures = () => {
  const { fetchFeaturesLoading } = useSelector((state) => state.features);
  const { permissions } = useSelector((state) => state.auth);
  const { featureGroups, fetchFeatureGroupsLoading } = useSelector(
    (state) => state.featuresGroups
  );
  const dispatch = useDispatch();
  const [showAddFeatureModal, setShowAddFeatureModal] = useState(false);
  const [showAddGroupModal, setAddGroupModal] = useState(false);
  const defaultActiveTab = permissions.includes("view_feature")
    ? "features"
    : permissions.includes("view_feature_group")
    ? "groups"
    : null;
  const [activeTab, setActiveTab] = useState(defaultActiveTab);

  useEffect(() => {
    dispatch(fetchFeatures());
    dispatch(fetchFeatureGroups());
  }, [dispatch]);
  // useEffect(() => {
  //   if (activeTab === "features") {
  //     dispatch(fetchFeatures());
  //   } else if (activeTab === "groups") {
  //     dispatch(fetchFeatureGroups());
  //   }
  // }, [activeTab]);
  return (
    <Fragment>
      <Helmet>
        <title>Dashboard | Features</title>
      </Helmet>
      {fetchFeaturesLoading || fetchFeatureGroupsLoading ? (
        <Loader />
      ) : (
        <Fragment>
          <PageHeader
            homepage="ميزات الإعلانات"
            activepage="الإعلانات"
            page="ميزات الإعلانات"
          >
            <ProtectedElement
              element={
                <button
                  onClick={() => {
                    setAddGroupModal(true);
                  }}
                  className="btn btn-secondary-transparent  btn-wave"
                >
                  <i className="ri-apps-line align-middle me-1"></i> إضافة
                  مجموعة
                </button>
              }
              requiredPermissions={["create_feature_group"]}
            />
            <ProtectedElement
              element={
                <button
                  onClick={() => {
                    if (featureGroups && featureGroups.length > 0) {
                      setShowAddFeatureModal(true);
                    } else {
                      AlertWithSwal(
                        "info",
                        "لا يوجد مجموعات",
                        "يرجى إضافة مجموعة واحدة على الأقل قبل إضافة الميزات",
                        "info"
                      );
                    }
                  }}
                  className="btn btn-primary  btn-wave"
                >
                  <i className="ri-shining-line align-middle me-1"></i> إضافة
                  ميزة
                </button>
              }
              requiredPermissions={["create_feature"]}
            />
          </PageHeader>
          <Row>
            <Col xl={12}>
              <Card className="custom-card">
                <Card.Body className="p-0">
                  <Row className="g-0">
                    <Col xl={4} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-secondary-transparent">
                            <i className="ri-shining-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">50</h5>
                          <p className="text-muted mb-0 fs-15">
                            إجمالي الميزات
                          </p>
                        </div>
                      </div>
                    </Col>
                    <Col xl={4} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-success-transparent">
                            <i className="ri-apps-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">4</h5>
                          <p className="text-muted mb-0 fs-15">
                            إجمالي المجموعات
                          </p>
                        </div>
                      </div>
                    </Col>
                    <Col xl={4}>
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-info-transparent">
                            <i className="ri-instance-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">سيارات</h5>
                          <p className="text-muted mb-0 fs-15">
                            الفئة الأكثر استخدامًا
                          </p>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Tab.Container
            activeKey={activeTab}
            onSelect={(key) => setActiveTab(key)}
          >
            <Nav
              variant="pills"
              className="nav-tabs tab-style-6 nav-justified mb-3 d-flex"
              id="myTab1"
              role="tablist"
            >
              <ProtectedElement
                element={
                  <Nav.Item>
                    <Nav.Link
                      eventKey="features"
                      id="order-tab"
                      type="button"
                      className="d-flex py-3 text-center align-items-center justify-content-center"
                    >
                      الميزات
                    </Nav.Link>
                  </Nav.Item>
                }
                requiredPermissions={["view_feature"]}
              />
              <ProtectedElement
                element={
                  <Nav.Item>
                    <Nav.Link
                      eventKey="groups"
                      id="confirmed-tab"
                      type="button"
                      className="d-flex py-3 text-center align-items-center justify-content-center"
                    >
                      المجموعات
                    </Nav.Link>
                  </Nav.Item>
                }
                requiredPermissions={["view_feature_group"]}
              />
            </Nav>

            <Tab.Content id="myTabContent">
              <Tab.Pane
                className={`fade text-muted ${
                  activeTab === "features" ? "show active" : ""
                }`}
                id="order-tab-pane"
                role="tabpanel"
                eventKey="features"
                aria-labelledby="roles-tab"
                tabIndex={0}
              >
                {activeTab === "features" && (
                  <Row>
                    <Col xl={12}>
                      <Features />
                    </Col>
                  </Row>
                )}
              </Tab.Pane>

              <Tab.Pane
                className={`fade text-muted ${
                  activeTab === "groups" ? "show active" : ""
                }`}
                id="confirm-tab-pane"
                role="tabpanel"
                eventKey="groups"
                aria-labelledby="permissions-tab"
                tabIndex={0}
              >
                {activeTab === "groups" && (
                  <Row>
                    <Col xl={12}>
                      <Groups />
                    </Col>
                  </Row>
                )}
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Fragment>
      )}
      <AddFeatureModal
        open={showAddFeatureModal}
        close={() => {
          setShowAddFeatureModal(false);
        }}
      />
      <AddGroupModal
        open={showAddGroupModal}
        close={() => {
          setAddGroupModal(false);
        }}
      />
    </Fragment>
  );
};

export default AdsFeatures;
