import { Fragment } from "react";
import { Container, Row } from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import ALLImages from "../data/Imagedata";

const SessionsExpired = () => {
  const navigate = useNavigate();
  return (
    <Fragment>
      {/* Root provider only — see the note in NoAccess.jsx. */}
      <Helmet>
        <title>الراقي ERP | انتهت صلاحية الجلسة</title>
      </Helmet>
      {/* Selection left enabled, matching the other two error pages. */}
      <div dir="rtl" className="page">
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
