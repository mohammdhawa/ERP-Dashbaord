import { Fragment } from "react";
import { Card, Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useSelector } from "react-redux";
import { hasPermission } from "../../data/permissionsCatalog";

// Phase-1 landing page: a permission-aware launcher into the ERP modules.
// (No aggregate/statistics endpoints exist yet in the Phase-1 API.)
const MODULES = [
  {
    title: "الوحدات التنظيمية",
    description: "إدارة الوحدات التنظيمية للمؤسسة ومدرائها",
    icon: "ri-community-line",
    color: "primary",
    path: "/departments",
    permission: "departments.view",
  },
  {
    title: "الموظفين",
    description: "سجلات الموارد البشرية وملفات الموظفين",
    icon: "ri-team-line",
    color: "success",
    path: "/hr/employees",
    permission: "hr.employees.view",
  },
  {
    title: "المستخدمين",
    description: "حسابات الدخول للنظام وحالتها",
    icon: "ri-user-settings-line",
    color: "info",
    path: "/users",
    permission: "auth.users.view",
  },
  {
    title: "الأدوار والصلاحيات",
    description: "التحكم بالأدوار وإسنادها للمستخدمين",
    icon: "ri-shield-keyhole-line",
    color: "warning",
    path: "/roles",
    permission: "auth.roles.view",
  },
  {
    title: "الإشعارات",
    description: "آخر التنبيهات الخاصة بحسابك",
    icon: "ri-notification-3-line",
    color: "secondary",
    path: "/notifications",
    permission: null, // auth-only
  },
];

const Dashboard = () => {
  const { user, permissions } = useSelector((state) => state.auth);
  const { unreadCount } = useSelector((state) => state.notifications);

  const visibleModules = MODULES.filter((m) =>
    hasPermission(permissions, m.permission)
  );

  // "This account can reach nothing" — i.e. everything on screen is a module
  // that needs no permission at all. This used to be `length === 1`, which was
  // only ever true because notifications happens to be the single auth-only
  // tile; adding a second one would have silently switched the warning off.
  const hasNoModuleAccess = visibleModules.every((m) => m.permission === null);

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | لوحة التحكم</title>
      </Helmet>

      <div className="my-4">
        <h1 className="page-title fw-medium fs-20 mb-1">
          أهلاً {user?.name} 👋
        </h1>
        <p className="text-muted mb-0">
          {user?.roles?.length
            ? `الأدوار: ${user.roles.join("، ")}`
            : "لا توجد أدوار مسندة لحسابك بعد."}
          {unreadCount > 0 && (
            <Link to="/notifications" className="ms-2 link-primary">
              لديك {unreadCount} إشعارات غير مقروءة
            </Link>
          )}
        </p>
      </div>

      <Row className="g-3">
        {visibleModules.map((module) => (
          <Col sm={6} xl={4} key={module.path}>
            <Card className="custom-card h-100">
              <Card.Body className="d-flex align-items-center gap-3">
                <span
                  className={`avatar avatar-lg avatar-rounded bg-${module.color}-transparent`}
                >
                  <i className={`${module.icon} fs-4`}></i>
                </span>
                <div className="flex-grow-1">
                  <h6 className="fw-semibold mb-1">
                    <Link to={module.path} className="stretched-link">
                      {module.title}
                    </Link>
                  </h6>
                  <p className="text-muted mb-0 fs-13">{module.description}</p>
                </div>
                <i className="ri-arrow-left-s-line text-muted fs-4"></i>
              </Card.Body>
            </Card>
          </Col>
        ))}
        {hasNoModuleAccess && (
          <Col sm={12}>
            <Card className="custom-card">
              <Card.Body className="text-center p-5">
                <span className="avatar avatar-xl avatar-rounded bg-warning-transparent mb-3">
                  <i className="ri-lock-line fs-2"></i>
                </span>
                <h6 className="fw-medium">لا تملك صلاحيات على وحدات النظام</h6>
                <p className="text-muted mb-0">
                  تواصل مع مسؤول النظام لإسناد الأدوار المناسبة لحسابك.
                </p>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
    </Fragment>
  );
};

export default Dashboard;
