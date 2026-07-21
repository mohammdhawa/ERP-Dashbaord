import React from "react";
import { Modal, Button, Row, Col, Spinner } from "react-bootstrap";
import moment from "moment-timezone";
import { getArabicPackageName } from "../../data/Columns";

const SubscriptionDetailModal = ({ show, onHide, subscription, loading }) => {
  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>تفاصيل الاشتراك {subscription?.id ? `#${subscription.id}` : ""}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 200 }}>
            <Spinner animation="border" />
          </div>
        ) : subscription ? (
          <>
            <Row className="mb-3">
              <Col md={6}><strong>المستخدم:</strong> {subscription.user?.name} ({subscription.user?.email})</Col>
              <Col md={6}><strong>الباقة:</strong> {getArabicPackageName(subscription.package?.name)}</Col>
            </Row>
            <Row className="mb-3">
              <Col md={6}><strong>تاريخ الشراء:</strong> {subscription.purchase_date ? moment(subscription.purchase_date).tz("Europe/Istanbul").format("YYYY-MM-DD HH:mm:ss") : "-"}</Col>
              <Col md={6}><strong>تاريخ الانتهاء:</strong> {subscription.expiry_date ? moment(subscription.expiry_date).tz("Europe/Istanbul").format("YYYY-MM-DD HH:mm:ss") : "-"}</Col>
            </Row>
            <Row className="mb-3">
              <Col md={6}><strong>الإعلانات المتبقية:</strong> {subscription.remaining_ads}</Col>
            </Row>
            {/* Add more fields as needed from the detailed API response */}
          </>
        ) : (
          <div className="text-center">لا توجد بيانات</div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>إغلاق</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SubscriptionDetailModal; 