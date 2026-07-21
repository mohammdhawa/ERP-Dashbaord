import React, { useEffect } from "react";
import { Helmet } from "react-helmet";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Col, Row, Button } from "react-bootstrap";
import PageHeader from "../../components/Pageheader";
import Loader from "../../components/Loader";
import { fetchCustomerMessageDetails } from "../../redux/actions/customerMessagesActions";

const CustomerMessageDetails = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { messageDetails, messageDetailsLoading, messageDetailsError } = useSelector(
    (state) => state.customerMessages
  );

  useEffect(() => {
    dispatch(fetchCustomerMessageDetails(id));
  }, [dispatch, id]);

  if (messageDetailsLoading) {
    return <Loader />;
  }

  if (messageDetailsError) {
    return (
      <div className="alert alert-danger" role="alert">
        {messageDetailsError}
      </div>
    );
  }

  if (!messageDetails) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>لوحة التحكم | تفاصيل رسالة العميل</title>
      </Helmet>

      <PageHeader
        homepage="خدمة العملاء"
        activepage="رسائل العملاء"
        page="تفاصيل الرسالة"
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="card-title">تفاصيل الرسالة</h4>
                <Button
                  variant="primary"
                  onClick={() => navigate("/customer_messages")}
                >
                  العودة للقائمة
                </Button>
              </div>

              <Row>
                <Col md={6}>
                  <div className="mb-3">
                    <label className="form-label">الاسم</label>
                    <p className="form-control-static">{messageDetails.name}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <label className="form-label">البريد الإلكتروني</label>
                    <p className="form-control-static">{messageDetails.email}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <label className="form-label">رقم الهاتف</label>
                    <p className="form-control-static">{messageDetails.phone}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <label className="form-label">تاريخ الإرسال</label>
                    <p className="form-control-static">
                      {new Date(messageDetails.created_at).toLocaleDateString("ar-SA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </Col>
                <Col md={12}>
                  <div className="mb-3">
                    <label className="form-label">الرسالة</label>
                    <div className="p-3 bg-light rounded">
                      {messageDetails.message}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default CustomerMessageDetails; 