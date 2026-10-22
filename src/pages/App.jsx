import { Fragment, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Header, Sidebar, ScrollTop, Loader } from "../components";
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
        {/* FIRST tab stop in the app, before the header and the ~40-link
            sidebar. Without it a keyboard user re-tabs the entire navigation
            on every route change before reaching a single field. It is
            off-screen until focused — see .skip-to-content in styles.css. */}
        <a href="#main-content" className="skip-to-content">
          تخطَّ إلى المحتوى الرئيسي
        </a>
        <Header />
        <Sidebar />
        {/* <main>, not a <div>. This is the app's one main landmark: it is what
            the skip link targets and what "jump to main" in every screen
            reader looks for. tabIndex={-1} so the skip link can actually move
            FOCUS here rather than only scrolling the viewport — without it the
            caret stays back on the skip link and the next Tab lands in the
            header again. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="main-content app-content"
        >
          <div className="container-fluid">
            {/* Catches the route chunks split out in data/Routingdata.jsx. It
                sits INSIDE the shell, so the header and sidebar stay on screen
                while a screen's code arrives — the chrome does not flash. */}
            <Suspense fallback={<Loader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
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
