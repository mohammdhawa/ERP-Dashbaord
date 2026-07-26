import { useSelector } from "react-redux";
import { hasPermission } from "../../data/permissionsCatalog";

// Action-level RBAC gate (create/update/delete buttons). Uses the same
// convention as ProtectedRoute: renders `element` when the user holds the
// required permission, otherwise renders nothing.
const ProtectedElement = ({ element, requiredPermissions }) => {
  const { permissions } = useSelector((state) => state.auth);

  if (!hasPermission(permissions, requiredPermissions)) {
    return null;
  }
  return element;
};

export default ProtectedElement;
