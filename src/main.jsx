import { Fragment, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.scss";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RouteData } from "./data/Routingdata.jsx";
import Scrolltotop from "./components/Scrolltotop.jsx";
import { Provider, useDispatch, useSelector } from "react-redux";
import store from "./redux/Store.jsx";
import {
  App,
  ProtectedRoute,
  PublicRoute,
  Signin,
  ChangePassword,
  Error404,
  NoAccess,
  SessionsExpired,
} from "./pages";
import { Helmet } from "react-helmet-async";
import {
  bootstrapSession,
  logoutSuccess,
} from "./redux/actions/authActions.jsx";
import {
  onTokensChangedInAnotherTab,
  REFRESH_KEY,
} from "./utils/tokenStore.js";
import { disableReactDevTools } from "@fvilers/disable-react-devtools";
import NoInternetConnection from "./components/NoInternetConnection.jsx";

// Session bootstrap: if a refresh token survived the reload, /auth/me is
// called (the interceptor silently refreshes the expired access token) and the
// user + flattened permissions are rehydrated before any route renders.
const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(bootstrapSession());
  }, [dispatch]);

  // Tokens are shared across tabs, so a sign-out in one tab ends the session in
  // all of them. Without this, the other tabs keep rendering a logged-in UI and
  // only discover the truth on their next request — which then looks like a
  // random failure rather than "you logged out".
  useEffect(
    () =>
      onTokensChangedInAnotherTab(({ key, newValue }) => {
        if (key === REFRESH_KEY && !newValue) {
          dispatch(logoutSuccess());
        }
      }),
    [dispatch]
  );

  return children;
};

// NOTE: no HelmetProvider here. It used to wrap ONLY the <Helmet> below rather
// than `children`, so every page-level <Helmet> in the app rendered outside any
// provider — which react-helmet-async treats as an error. A single provider now
// wraps the whole tree at the root, below.
const ThemeWrapper = ({ children }) => {
  const theme = useSelector((state) => state.theme);
  return (
    <Fragment>
      <Helmet>
        <html
          dir={"rtl"}
          data-theme-mode={theme?.datathememode}
          data-header-styles={theme.dataheaderstyles}
          data-vertical-style={theme.dataverticalstyle}
          data-nav-layout={theme.datanavlayout}
          data-menu-styles={theme.datamenustyles}
          data-toggled={theme.toggled}
          data-nav-style={theme.datanavstyle}
          hor-style={theme.horstyle}
          data-page-style={theme.datapagestyle}
          data-width={theme.datawidth}
          data-menu-position={theme.datamenuposition}
          data-header-position={theme.dataheaderposition}
          data-icon-overlay={theme.iconoverlay}
          data-bg-img={theme.bgimg}
        ></html>
      </Helmet>
      {children}
    </Fragment>
  );
};

if (process.env.NODE_ENV === "production") {
  disableReactDevTools();
}

const AppWrapper = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  return (
    <Fragment>
      {!isOnline && <NoInternetConnection />}
      <Routes>
        <Route
          path={`${import.meta.env.BASE_URL}/signin`}
          element={<PublicRoute element={<Signin />} />}
        />
        {/* Outside the <App> layout and outside ProtectedRoute: it guards
            itself, and ProtectedRoute is what redirects here. */}
        <Route
          path={`${import.meta.env.BASE_URL}/change-password`}
          element={<ChangePassword />}
        />
        <Route
          path={`${import.meta.env.BASE_URL}`}
          element={
            <ProtectedRoute element={<App />} requiredPermissions={[]} />
          }
        >
          {RouteData.map((idx) => (
            <Route
              key={idx.id}
              path={idx.path}
              element={
                <ProtectedRoute
                  element={idx.element}
                  requiredPermissions={idx.requiredPermissions}
                />
              }
            />
          ))}
        </Route>
        <Route
          path={`${import.meta.env.BASE_URL}/no_access`}
          element={<NoAccess />}
        />
        <Route
          path={`${import.meta.env.BASE_URL}/404`}
          element={<Error404 />}
        />
        <Route
          path={`${import.meta.env.BASE_URL}/session-expired`}
          element={<SessionsExpired />}
        />
        <Route path="*" element={<Error404 />} />
      </Routes>
    </Fragment>
  );
};

// One HelmetProvider for the whole app. Every page sets its own <title>, and
// with the provider nested inside ThemeWrapper (wrapping only the <html>
// attribute Helmet) none of them had one to register against.
ReactDOM.createRoot(document.getElementById("root")).render(
  <Fragment>
    <Provider store={store}>
      <AuthProvider>
        <HelmetProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ThemeWrapper>
              <Scrolltotop />
              <AppWrapper />
            </ThemeWrapper>
          </BrowserRouter>
        </HelmetProvider>
      </AuthProvider>
    </Provider>
  </Fragment>
);
