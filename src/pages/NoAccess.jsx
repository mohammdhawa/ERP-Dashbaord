import { Fragment } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { Helmet } from "react-helmet";
import { HelmetProvider } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import ALLImages from "../data/Imagedata";

const NoAccess = () => {
  const navigate = useNavigate();
  return (
    <Fragment>
      <HelmetProvider>
        <Helmet>
          <title>Syria Souq | No Access</title>
        </Helmet>
      </HelmetProvider>
      <div
        dir="rtl"
        className="page"
        style={{
          userSelect: "none",
          caretColor: "transparent",
        }}
      >
        <div className="error-page">
          <Container>
            <div className="my-auto">
              <Row className="d-flex align-items-center justify-content-center">
                <img
                  src={ALLImages("NoAccess")}
                  style={{ maxWidth: "50%" }}
                  alt=""
                />
              </Row>
              <Row className="align-items-center justify-content-center text-center h-100 mt-5">
                <p className="fs-1 fw-bold mb-2 ">
                  ليس لديك الصلاحيات الكافية!
                </p>
                <p className="fs-18 text-muted mb-4 op-8">
                  عذراً، لا يمكنك الوصول إلى هذه الصفحة لأنك لا تمتلك الصلاحيات
                  المطلوبة.
                </p>
                <button
                  onClick={() => navigate("/", { replace: true })}
                  className="btn w-auto btn-lg btn-primary d-flex align-items-center justify-content-center"
                >
                  <i className="ri-arrow-go-back-line align-middle me-2 d-inline-block"></i>
                  العودة الى الصفحة الرئيسية
                </button>
              </Row>
            </div>
          </Container>
        </div>
      </div>
    </Fragment>
  );
};

export default NoAccess;
