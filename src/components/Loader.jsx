import { Fragment } from "react";
import { Helmet } from "react-helmet";
import ALLImages from "../data/Imagedata";

const Loader = () => {
  return (
    <Fragment>
      <Helmet>
        <title>Loading..</title>
        <style>
          {`
            .brand-loader-logo {
              display: block;
              width: 108px;
              height: 108px;
              object-fit: contain;
              transform-origin: center;
              animation:
                brand-loader-spin 1.4s linear infinite,
                brand-loader-pulse 0.7s ease-in-out infinite alternate;
            }

            @keyframes brand-loader-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @keyframes brand-loader-pulse {
              from { opacity: 0.6; }
              to { opacity: 1; }
            }

            @media (prefers-reduced-motion: reduce) {
              .brand-loader-logo {
                animation: none;
              }
            }
          `}
        </style>
      </Helmet>
      <div
        role="status"
        aria-label="Loading"
        style={{
          position: "absolute",
          top: "0",
          right: "0",
          height: "100vh",
          width: "100%",
          zIndex: "99999",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backdropFilter: "blur(3px)",
        }}
      >
        <div style={{ padding: "2rem" }} id="logo">
          <img
            src={ALLImages("sYellowLogo")}
            alt=""
            className="brand-loader-logo"
          />
        </div>
      </div>
    </Fragment>
  );
};

export default Loader;
