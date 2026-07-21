import { Fragment } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { Helmet } from "react-helmet";
import { HelmetProvider } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import ALLImages from "../data/Imagedata";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <Fragment>
      <HelmetProvider>
        <Helmet>
          <title>Syria Souq | Not Found</title>
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
                  src={ALLImages("NotFoundPage")}
                  style={{ maxWidth: "50%" }}
                  alt=""
                />
              </Row>
              <Row className="align-items-center justify-content-center text-center h-100 mt-5">
                <p className="fs-1 fw-bold mb-3 ">
                  لم نتمكن من العثور على هذه الصفحة
                </p>
                <p className="fs-18 text-muted mb-4 op-8">
                  يبدو أن الرابط الذي أدخلته غير صحيح أو أن الصفحة قد تم نقلها
                  أو حذفها.
                </p>
                <button
                  onClick={() => navigate("/", { replace: true })}
                  className="btn btn-lg w-auto btn-primary d-flex align-items-center justify-content-center"
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

export default NotFound;
