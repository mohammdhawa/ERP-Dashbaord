import { useSelector } from "react-redux";

const ProtectedElement = ({ element, requiredPermissions }) => {
  const { permissions } = useSelector((state) => state.auth);

  const hasPermission = requiredPermissions?.every((perm) =>
    permissions?.includes(perm)
  );

  if (!hasPermission) {
    return null;
  }
  return element;
};

export default ProtectedElement;
