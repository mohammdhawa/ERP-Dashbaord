import { Fragment } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { Helmet } from "react-helmet";
import { HelmetProvider } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import ALLImages from "../data/Imagedata";

const SessionsExpired = () => {
  const navigate = useNavigate();
  return (
    <Fragment>
      <HelmetProvider>
        <Helmet>
          <title>الراقي ERP | انتهت صلاحية الجلسة</title>
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
                  src={ALLImages("SessionExpired")}
                  style={{ maxWidth: "50%" }}
                  alt=""
                />
              </Row>
              <Row className="align-items-center justify-content-center text-center h-100 mt-5">
                <p className="fs-1 fw-bold mb-3 ">انتهت صلاحية الجلسة</p>
                <p className="fs-18 text-muted mb-4 op-8">
                  لقد انتهت صلاحية جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة
                  أخرى.
                </p>
                <button
                  onClick={() => navigate("/signin", { replace: true })}
                  className="btn btn-lg w-auto btn-primary d-flex align-items-center justify-content-center"
                >
                  تسجيل الدخول
                </button>
              </Row>
            </div>
          </Container>
        </div>
      </div>
    </Fragment>
  );
};

export default SessionsExpired;
