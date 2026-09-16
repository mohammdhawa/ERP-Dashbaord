import { Fragment } from "react";
import { Outlet } from "react-router-dom";
import { Header, Sidebar, ScrollTop } from "../components";
import { Slide, ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";

// Six Swiper stylesheets and the `boxicons` web-component package used to be
// imported here for the whole app. Swiper's only consumer is the unrouted
// sections/advertisements/ads/AdDetails.jsx, and no live markup uses <box-icon>
// elements — so both were loading on every page for nothing. If AdDetails is
// ever revived it should import the Swiper CSS it needs itself.

const App = () => {
  const theme = useSelector((state) => state.theme);
  return (
    <Fragment>
      <div className="page">
        <Header />
        <Sidebar />
        <div className="main-content app-content">
          <div className="container-fluid">
            <Outlet />
          </div>
        </div>
      </div>
      {/* autoClose was 1000ms — too short to read an Arabic error message,
          and toasts are the primary channel for parseApiError output. Errors
          now stay until dismissed; everything else gets 4s. Position is the
          RTL "start" corner, matching where the eye lands in this layout. */}
      <ToastContainer
        rtl
        autoClose={4000}
        limit={5}
        theme={theme?.datathememode}
        position="bottom-right"
        closeOnClick
        transition={Slide}
        pauseOnHover
      />
      <ScrollTop />
    </Fragment>
  );
};

export default App;
