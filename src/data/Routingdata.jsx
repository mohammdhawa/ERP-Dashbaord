import {
  Dashboard,
  Users,
  Roles,
  Departments,
  Employees,
  Notifications,
} from "../sections";

// Route-level gating uses the Phase-1 permission strings; ProtectedRoute
// passes when ANY of the listed permissions is held (empty = auth only).
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
    id: 4,
    path: `${import.meta.env.BASE_URL}users`,
    element: <Users />,
    requiredPermissions: ["auth.users.view"],
  },
  {
    id: 5,
    path: `${import.meta.env.BASE_URL}roles`,
    element: <Roles />,
    requiredPermissions: ["auth.roles.view"],
  },
  {
    id: 6,
    path: `${import.meta.env.BASE_URL}notifications`,
    element: <Notifications />,
    requiredPermissions: [], // owner-scoped, auth only
  },
];
