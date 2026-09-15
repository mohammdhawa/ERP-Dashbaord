import {
  Dashboard,
  Users,
  Roles,
  Departments,
  Employees,
  EmployeeProfile,
  JobTitles,
  Notifications,
} from "../sections";

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
    path: `${import.meta.env.BASE_URL}notifications`,
    element: <Notifications />,
    requiredPermissions: [], // owner-scoped, auth only
  },
];
