import { Fragment, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../redux/api";
import { Loader, PageHeader } from "../../components";
import { Helmet } from "react-helmet";
import { Card, Col, Row, Badge } from "react-bootstrap";
import moment from "moment";

const SubscriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const response = await api.get(`/subscriptions/${id}`);
        setSubscription(response.data);
      } catch (err) {
        if (err.response && (err.response.status === 404 || err.response.status === 500)) {
          navigate("/404", { replace: true });
        } else {
          setError("حدث خطأ أثناء جلب بيانات الاشتراك.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, navigate]);

  if (loading) return <Loader />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!subscription) return null;

  const { user, package: pkg } = subscription;

  return (
    <Fragment>
      <Helmet>
        <title>تفاصيل الاشتراك | {user?.name || "اشتراك"}</title>
      </Helmet>
      <PageHeader
        homepage="المشتركين"
        activepage="المشتركين"
        page={`تفاصيل الاشتراك #${subscription.id}`}
        homepage_link="/subscribers"
      />
      <Row>
        <Col xl={12}>
          <Card className="custom-card mt-3">
            <Card.Body>
              <Row className="mb-4">
                <Col md={4} className="text-center">
                  <img
                    src={user?.image}
                    alt={user?.name}
                    className="avatar avatar-xl avatar-rounded mb-2"
                    style={{ width: 96, height: 96, objectFit: "cover" }}
                  />
                  <h5 className="fw-bold mb-1">{user?.name}</h5>
                  <div className="text-muted mb-1">{user?.email}</div>
                  <div className="text-muted">{user?.phone}</div>
                  <div>
                    {user?.is_verified ? (
                      <Badge bg="success">موثق</Badge>
                    ) : (
                      <Badge bg="secondary">غير موثق</Badge>
                    )}
                  </div>
                </Col>
                <Col md={4} className="border-start border-end">
                  <h6 className="fw-semibold mb-2">معلومات الاشتراك</h6>
                  <div className="mb-2">
                    <span className="text-muted">رقم الاشتراك: </span>
                    <span>{subscription.id}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted">تاريخ الشراء: </span>
                    <span>{moment(subscription.purchase_date).format("YYYY-MM-DD HH:mm")}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted">تاريخ الانتهاء: </span>
                    <span>{moment(subscription.expiry_date).format("YYYY-MM-DD HH:mm")}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted">الإعلانات المتبقية: </span>
                    <span>{subscription.remaining_ads}</span>
                  </div>
                </Col>
                <Col md={4}>
                  <h6 className="fw-semibold mb-2">معلومات الباقة</h6>
                  <div className="mb-2">
                    <span className="text-muted">اسم الباقة: </span>
                    <span>{pkg?.name}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted">السعر: </span>
                    <span>{pkg?.price}$</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted">عدد الإعلانات: </span>
                    <span>{pkg?.max_of_ads}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted">مدة الباقة: </span>
                    <span>{pkg?.period} يوم</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted">خصائص الباقة: </span>
                    <span>{pkg?.properties}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted">حالة الباقة: </span>
                    <Badge bg={pkg?.is_active ? "success" : "danger"}>
                      {pkg?.is_active ? "نشطة" : "خامدة"}
                    </Badge>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Fragment>
  );
};

export default SubscriptionDetail; 