import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader } from "../../components";

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

  const hasPermission =
    requiredPermissions.length === 0 ||
    requiredPermissions.some((perm) => permissions.includes(perm));

  if (!hasPermission) {
    return <Navigate to="/no_access" replace />;
  }
  return element;
};

export default ProtectedRoute;
