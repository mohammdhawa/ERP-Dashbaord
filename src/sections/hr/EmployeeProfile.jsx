import React, {
  Fragment,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import { Alert, Card, Col, Nav, Row, Tab } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { MutatingDots } from "react-loader-spinner";
import { PageHeader, ModalFallback } from "../../components";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import { hasPermission } from "../../data/permissionsCatalog";
import {
  fetchEmployee,
  clearEmployee,
} from "../../redux/actions/employeesActions";
import EmployeeOverview from "./EmployeeOverview";
import EmployeeAssignments from "./EmployeeAssignments";
import EmployeeWarnings from "./EmployeeWarnings";

const EmployeeFormModal = lazy(() => import("./EmployeeFormModal"));

// Colour keyed on the status INT; the text is always the server's label.
const STATUS_VARIANTS = {
  1: "bg-success-transparent",
  2: "bg-warning-transparent",
  3: "bg-danger-transparent",
};

const EmployeeProfile = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { current, currentLoading, currentError } = useSelector(
    (state) => state.employees
  );
  const { permissions } = useSelector((state) => state.auth);

  // Each tab gates INDEPENDENTLY. A user without a tab's permission sees the
  // profile without that tab — not an error page, and not a tab that 403s when
  // clicked. The route itself only needs hr.employees.view.
  const canViewAssignments = hasPermission(permissions, "hr.assignments.view");
  const canViewWarnings = hasPermission(permissions, "hr.warnings.view");

  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(() => {
    dispatch(fetchEmployee(id)).catch(() => {
      // The error is already in state; the panel below renders it.
    });
  }, [dispatch, id]);

  useEffect(() => {
    load();
    return () => {
      // Drop the record on unmount so navigating to another employee cannot
      // flash the previous one while the new request is in flight.
      dispatch(clearEmployee());
    };
  }, [load, dispatch]);

  const tabs = useMemo(
    () =>
      [
        { key: "overview", title: "نظرة عامة", show: true },
        {
          key: "assignments",
          title: "سجل التعيين",
          show: canViewAssignments,
        },
        { key: "warnings", title: "الإنذارات", show: canViewWarnings },
      ].filter((t) => t.show),
    [canViewAssignments, canViewWarnings]
  );

  // If the active tab disappears (permissions reloaded), fall back to overview
  // rather than rendering nothing.
  useEffect(() => {
    if (!tabs.some((t) => t.key === activeTab)) setActiveTab("overview");
  }, [tabs, activeTab]);

  const header = (
    <PageHeader
      homepage={current?.full_name || "ملف الموظف"}
      activepage="الموارد البشرية"
      page="ملف الموظف"
    >
      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-light btn-wave"
          onClick={() => navigate(`${import.meta.env.BASE_URL}hr/employees`)}
        >
          <i className="ri-arrow-right-line align-middle me-1"></i> عودة للقائمة
        </button>
        {current && (
          <ProtectedElement
            element={
              <button
                type="button"
                className="btn btn-secondary btn-wave"
                onClick={() => setEditOpen(true)}
              >
                <i className="ri-pencil-line align-middle me-1"></i> تعديل
                البيانات
              </button>
            }
            requiredPermissions={["hr.employees.update"]}
          />
        )}
      </div>
    </PageHeader>
  );

  if (currentLoading && !current) {
    return (
      <Fragment>
        <Helmet>
          <title>الراقي ERP | ملف الموظف</title>
        </Helmet>
        {header}
        <Card className="custom-card">
          <Card.Body className="d-flex justify-content-center py-5">
            <MutatingDots
              visible
              height="100"
              width="100"
              color="var(--primary-color)"
              secondaryColor="var(--secondary-color)"
              radius="12.5"
              ariaLabel="mutating-dots-loading"
            />
          </Card.Body>
        </Card>
      </Fragment>
    );
  }

  if (currentError) {
    const denied = currentError.status === 403;
    return (
      <Fragment>
        <Helmet>
          <title>الراقي ERP | ملف الموظف</title>
        </Helmet>
        {header}
        <Card className="custom-card">
          <Card.Body className="text-center py-5">
            <p className="text-danger mb-3">{currentError.message}</p>
            {/* A 403 is not a transient failure: retrying it just produces the
                same 403, so no retry button is offered for one. */}
            {!denied && (
              <button
                type="button"
                className="btn btn-primary-light"
                onClick={load}
              >
                <i className="ri-refresh-line align-middle me-1"></i> إعادة
                المحاولة
              </button>
            )}
          </Card.Body>
        </Card>
      </Fragment>
    );
  }

  if (!current) return null;

  return (
    <Fragment>
      <Helmet>
        <title>
          {`الراقي ERP | ${current.full_name || "ملف الموظف"}`}
        </title>
      </Helmet>
      {header}

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <Row className="g-3 align-items-center">
                <Col md={12} lg={6}>
                  <h5 className="mb-1">{current.full_name}</h5>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    {current.status_label && (
                      <span
                        className={`badge ${
                          STATUS_VARIANTS[current.status] || "bg-light"
                        }`}
                      >
                        {current.status_label}
                      </span>
                    )}
                    {current.job_title?.name && (
                      <span className="badge bg-primary-transparent">
                        {current.job_title.name}
                      </span>
                    )}
                    {current.department?.name && (
                      <span className="badge bg-info-transparent">
                        {current.department.name}
                      </span>
                    )}
                  </div>
                </Col>
                <Col md={12} lg={6}>
                  {/* Same fix as the Field helper in EmployeeOverview: the
                      direction goes on an inline <bdi>, never on the value's
                      block. `dir="ltr"` on the <div> flipped its text-align from
                      right to left while the label above it stayed right, so all
                      three values sat across the column from the labels they
                      belong to. */}
                  <Row className="g-3">
                    <Col xs={6} md={4}>
                      <div className="text-muted fs-11">الرقم الوظيفي</div>
                      <div className="fw-medium">
                        <bdi dir="ltr">{current.employee_number || "—"}</bdi>
                      </div>
                    </Col>
                    <Col xs={6} md={4}>
                      <div className="text-muted fs-11">الرقم القديم</div>
                      <div className="fw-medium">
                        <bdi dir="ltr">{current.legacy_number || "—"}</bdi>
                      </div>
                    </Col>
                    <Col xs={6} md={4}>
                      <div className="text-muted fs-11">تاريخ التعيين</div>
                      <div className="fw-medium">
                        <bdi dir="ltr">{current.hire_date || "—"}</bdi>
                      </div>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <Tab.Container
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
              >
                <Nav variant="tabs" className="mb-3">
                  {tabs.map((tab) => (
                    <Nav.Item key={tab.key}>
                      <Nav.Link eventKey={tab.key}>{tab.title}</Nav.Link>
                    </Nav.Item>
                  ))}
                </Nav>
                <Tab.Content>
                  <Tab.Pane eventKey="overview">
                    <EmployeeOverview employee={current} />
                  </Tab.Pane>
                  {canViewAssignments && (
                    // mountOnEnter so the nested list is not fetched until the
                    // tab is actually opened.
                    <Tab.Pane eventKey="assignments" mountOnEnter>
                      <EmployeeAssignments
                        employee={current}
                        onEmployeeChanged={load}
                      />
                    </Tab.Pane>
                  )}
                  {canViewWarnings && (
                    <Tab.Pane eventKey="warnings" mountOnEnter>
                      <EmployeeWarnings employee={current} />
                    </Tab.Pane>
                  )}
                </Tab.Content>
              </Tab.Container>

              {!canViewAssignments && !canViewWarnings && (
                <Alert variant="light" className="mt-3 mb-0 py-2 px-3 fs-12">
                  سجل التعيين والإنذارات غير متاحين بصلاحياتك الحالية.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Fallback gated on the open flag, NOT unconditional: the lazy
          element below is always mounted so its chunk prefetches with the
          page, which means this boundary is suspended during ordinary page
          load too — an unconditional fallback would flash a modal shell on
          every visit. See ModalFallback. */}
      <Suspense fallback={editOpen ? <ModalFallback /> : null}>
        <EmployeeFormModal
          open={editOpen}
          close={() => setEditOpen(false)}
          employee={current}
          standalone
          onSaved={load}
        />
      </Suspense>
    </Fragment>
  );
};

export default EmployeeProfile;
