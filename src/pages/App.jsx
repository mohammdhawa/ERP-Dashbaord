import { Fragment } from "react";
import { Outlet } from "react-router-dom";
import { Header, Sidebar, ScrollTop } from "../components";
import { Slide, ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import "swiper/scss";
import "swiper/scss/navigation";
import "swiper/scss/pagination";
import "swiper/scss/scrollbar";
import "swiper/css/free-mode";
import "swiper/css/thumbs";
import "boxicons";

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
      <ToastContainer
        rtl
        autoClose={1000}
        limit={5}
        theme={theme?.datathememode}
        position="bottom-left"
        closeOnClick
        transition={Slide}
        pauseOnHover
      />
      <ScrollTop />
    </Fragment>
  );
};

export default App;
