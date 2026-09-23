import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader } from "../../components";
import { hasPermission } from "../../data/permissionsCatalog";

// Route-level RBAC gate. `requiredPermissions` are permission strings from the
// Phase-1 catalogue (e.g. "hr.employees.view"); an empty array = auth only.
const ProtectedRoute = ({ element, requiredPermissions = [] }) => {
  const { user, permissions, initialized } = useSelector((state) => state.auth);

  // Session bootstrap (/auth/me + silent refresh) still in flight — don't
  // bounce to /signin before it resolves.
  if (!initialized) {
    return <Loader />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Still on the temporary password HR issued: the API 403s every route but
  // /auth/password, /auth/me and /auth/logout, so rendering a page here would
  // only produce a screen of failures. The flag comes from login and /auth/me.
  if (user.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  if (!hasPermission(permissions, requiredPermissions)) {
    return <Navigate to="/no_access" replace />;
  }
  return element;
};

export default ProtectedRoute;
