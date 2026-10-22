import { Fragment } from "react";
import { Helmet } from "react-helmet-async";
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
      {/* ROUTE-LEVEL loader: a viewport overlay, not an inline spinner. It was
          `position: absolute`, which anchors to the nearest positioned ancestor
          — drop it inside a Bootstrap .card (which is position: relative) and a
          100vh blur spills down the page from the card's top edge. `fixed` with
          logical inset keeps it pinned to the viewport wherever it is rendered,
          and correct under RTL. Use MutatingDots for in-panel loading. */}
      <div
        role="status"
        aria-label="جارٍ التحميل"
        style={{
          position: "fixed",
          insetBlockStart: "0",
          insetInlineStart: "0",
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
