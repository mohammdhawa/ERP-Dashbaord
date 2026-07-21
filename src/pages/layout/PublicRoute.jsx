import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader } from "../../components";

const PublicRoute = ({ element }) => {
  const { user, initialized } = useSelector((state) => state.auth);

  // Wait for session bootstrap so a logged-in user reloading /signin doesn't
  // see the login form flash before being redirected home.
  if (!initialized) {
    return <Loader />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return element;
};

export default PublicRoute;
