import { Fragment } from "react";
import { Container, Row } from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import ALLImages from "../data/Imagedata";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <Fragment>
      {/* Root provider only — see the note in NoAccess.jsx. The title was still
          the previous product's ("Syria Souq"). */}
      <Helmet>
        <title>الراقي ERP | الصفحة غير موجودة</title>
      </Helmet>
      {/* Selection left enabled: the user may well need to copy this out to
          report the broken link. */}
      <div dir="rtl" className="page">
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
