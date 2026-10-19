import { lazy } from "react";

// ROUTES ARE CODE-SPLIT, ONE CHUNK PER SCREEN.
//
// These used to come from the `../sections` barrel, which is a plain
// re-export: naming one route pulled all eight into the entry chunk, and with
// them react-select, moment, sweetalert2, every form modal and every profile
// tab. Signing in therefore downloaded the employee form, the RBAC matrix and
// the notifications list before rendering a login box — a 1.16 MB main script
// (329 KB gzipped) for an app whose first screen needs two inputs.
//
// Each entry is now its own dynamic import, so a route's code arrives when the
// route does. The <Suspense> that catches the gap is in pages/App.jsx, around
// the <Outlet>; sign-in and the error pages stay eager because they are the
// shell, not a destination.
//
// ⚠️ Import the MODULE, not the barrel. `lazy(() => import("../sections"))`
// would split nothing — it would just move all eight behind one chunk.
const Dashboard = lazy(() => import("../sections/dashboard/Dashboard"));
const Departments = lazy(() => import("../sections/departments/Departments"));
const Employees = lazy(() => import("../sections/hr/Employees"));
const EmployeeProfile = lazy(() => import("../sections/hr/EmployeeProfile"));
const JobTitles = lazy(() => import("../sections/hr/JobTitles"));
const Users = lazy(() => import("../sections/accounts/Users"));
const Roles = lazy(() => import("../sections/rbac/Roles"));
const AuditLog = lazy(() => import("../sections/system/AuditLog"));
const Notifications = lazy(() =>
  import("../sections/notifications/Notifications")
);
const Sessions = lazy(() => import("../sections/account/Sessions"));
const ApprovalsInbox = lazy(() =>
  import("../sections/approvals/ApprovalsInbox")
);
const LeaveRequest = lazy(() => import("../sections/leave/LeaveRequest"));
const LeaveTypes = lazy(() => import("../sections/leave/LeaveTypes"));
const LeaveBalances = lazy(() => import("../sections/leave/LeaveBalances"));
const LeaveRegister = lazy(() => import("../sections/leave/LeaveRegister"));
const MyLeave = lazy(() => import("../sections/leave/MyLeave"));

// Route-level gating uses the permission strings from the catalogue;
// ProtectedRoute passes when ANY of the listed permissions is held
// (empty = auth only).
export const RouteData = [
  {
    id: 1,
    path: `${import.meta.env.BASE_URL}`,
    element: <Dashboard />,
    requiredPermissions: [],
  },
  {
    id: 2,
    path: `${import.meta.env.BASE_URL}departments`,
    element: <Departments />,
    requiredPermissions: ["departments.view"],
  },
  {
    id: 3,
    path: `${import.meta.env.BASE_URL}hr/employees`,
    element: <Employees />,
    requiredPermissions: ["hr.employees.view"],
  },
  {
    // Profile route only — deliberately NOT in the sidebar: it is reached by
    // opening a row in the employees list, never from a standing menu entry.
    id: 4,
    path: `${import.meta.env.BASE_URL}hr/employees/:id`,
    element: <EmployeeProfile />,
    requiredPermissions: ["hr.employees.view"],
  },
  {
    id: 5,
    path: `${import.meta.env.BASE_URL}hr/job-titles`,
    element: <JobTitles />,
    requiredPermissions: ["hr.job_titles.view"],
  },
  {
    id: 6,
    path: `${import.meta.env.BASE_URL}users`,
    element: <Users />,
    requiredPermissions: ["auth.users.view"],
  },
  {
    id: 7,
    path: `${import.meta.env.BASE_URL}roles`,
    element: <Roles />,
    requiredPermissions: ["auth.roles.view"],
  },
  {
    id: 8,
    path: `${import.meta.env.BASE_URL}audit-log`,
    element: <AuditLog />,
    requiredPermissions: ["auth.audit.view"],
  },
  {
    id: 9,
    path: `${import.meta.env.BASE_URL}notifications`,
    element: <Notifications />,
    requiredPermissions: [], // owner-scoped, auth only
  },
  {
    id: 10,
    path: `${import.meta.env.BASE_URL}sessions`,
    element: <Sessions />,
    requiredPermissions: [], // self-scoped: the caller's own sessions
  },
  {
    id: 11,
    path: `${import.meta.env.BASE_URL}approvals`,
    element: <ApprovalsInbox />,
    requiredPermissions: [], // self-scoped: the caller's own approval steps
  },
  {
    id: 12,
    path: `${import.meta.env.BASE_URL}leave/requests/:id`,
    element: <LeaveRequest />,
    // The server decides who may read it (the employee, anyone on its chain,
    // leave.requests.view within reach); a refusal renders in the screen.
    requiredPermissions: [],
  },
  {
    id: 13,
    path: `${import.meta.env.BASE_URL}leave/types`,
    element: <LeaveTypes />,
    // Reading the catalogue is open to every account (the pickers use it); this
    // screen is the management view, so it needs one of the write permissions.
    requiredPermissions: [
      "leave.types.create",
      "leave.types.update",
      "leave.types.delete",
    ],
  },
  {
    id: 14,
    path: `${import.meta.env.BASE_URL}leave/balances`,
    element: <LeaveBalances />,
    requiredPermissions: ["leave.balances.view"],
  },
  {
    id: 15,
    path: `${import.meta.env.BASE_URL}leave/register`,
    element: <LeaveRegister />,
    requiredPermissions: ["leave.requests.view"],
  },
  {
    id: 16,
    path: `${import.meta.env.BASE_URL}my-leave`,
    element: <MyLeave />,
    // Self-scoped. An account with no employee link gets 403 from the reads
    // and the screen says so; the sidebar hides the link for it.
    requiredPermissions: [],
  },
];
