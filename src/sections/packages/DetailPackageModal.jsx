import moment from "moment";
import React, { useEffect, useState } from "react";
import { Col, Form, Modal, Row } from "react-bootstrap";
import { NumericFormat } from "react-number-format";

const DetailPackageModal = ({ open, close, pack }) => {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [maxOfAds, setMaxOfAds] = useState("");
  const [period, setPeriod] = useState(null);
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [totalSubscribers, setTotalSubscribers] = useState("");
  const [activeSubscribers, setActiveSubscribers] = useState("");
  const [isActive, setIsActive] = useState("");
  const [properties, setProperties] = useState([""]);

  useEffect(() => {
    if (pack) {
      setName(pack?.name || "");
      setPrice(pack?.price || "");
      setMaxOfAds(pack?.max_of_ads || "");
      setProperties(pack?.properties?.split("#split_here#") || [""]);
      setPeriod(pack?.period || "");
      setCreatedAt(pack?.created_at);
      setUpdatedAt(pack?.updated_at);
      setId(pack?.id || "");
      setTotalSubscribers(pack?.total_subscribers_count || 0);
      setActiveSubscribers(pack?.active_subscribers_count || 0);
      setIsActive(pack?.is_active === 1 ? true : false);
    }
  }, [pack]);

  const handleCloseModal = () => {
    close();
  };

  const handlePropertyChange = (index, value) => {
    setProperties(properties.map((prop, i) => (i === index ? value : prop)));
  };

  return (
    <Modal show={open} onHide={handleCloseModal} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{pack?.id}#</span>
            <p className="m-0 fs-12 text-muted">معلومات الباقة {pack?.name}</p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-2">
          <Row>
            <Col>
              <Form.Label htmlFor="id">رقم الباقة</Form.Label>
              <Form.Control
                className="border-0"
                type="text"
                value={id}
                id="id"
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="name">اسم الباقة</Form.Label>
              <Form.Control
                className="border-0"
                type="text"
                value={name}
                id="name"
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="isActive">حالة الباقة</Form.Label>
              <Form.Control
                className="border-0"
                type="text"
                value={isActive ? "نشطة" : "خامدة"}
                id="isActive"
                disabled
              />
            </Col>
          </Row>
          <Row className="g-2">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="price">سعر الباقة</Form.Label>
              <NumericFormat
                className={`form-control border-0`}
                value={price}
                thousandSeparator=","
                disabled={true}
                id="price"
              />
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="period">مدة الباقة</Form.Label>
              <Form.Control
                className="border-0"
                type="text"
                value={`${period} يوم`}
                disabled
                id="period"
              />
            </Col>
          </Row>

          <Row>
            <Col>
              <Form.Label htmlFor="maxOfAds">
                عدد الإعلانات المسموح بها
              </Form.Label>
              <NumericFormat
                className={`form-control border-0`}
                value={maxOfAds}
                disabled={true}
                thousandSeparator=","
                id="maxOfAds"
              />
            </Col>
          </Row>

          <Row>
            <Col>
              <Form.Label>ميزات الباقة</Form.Label>
              {properties.map((property, index) => (
                <div key={index} className="d-flex align-items-center mb-2">
                  <Form.Control
                    className="border-0"
                    disabled
                    type="text"
                    placeholder={`ميزة رقم ${index + 1}`}
                    value={property}
                    onChange={(e) =>
                      handlePropertyChange(index, e.target.value)
                    }
                    required={index === 0}
                  />
                </div>
              ))}
            </Col>
          </Row>
          <Row className="g-2">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="totalSub">إجمالي المشتركين</Form.Label>
              <NumericFormat
                className={`form-control border-0`}
                value={totalSubscribers}
                thousandSeparator=","
                disabled={true}
                id="totalSub"
              />
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="activeSub">المشتركين النشطين</Form.Label>
              <Form.Control
                className="border-0"
                type="text"
                value={activeSubscribers}
                disabled
                id="activeSub"
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="package-created_at">
                تاريخ الانشاء
              </Form.Label>
              <Form.Control
                className="border-0"
                type="text"
                id="package-created_at"
                value={
                  createdAt
                    ? moment(pack.created_at)
                        .tz("Europe/Istanbul")
                        .format("HH:mm:ss - YYYY-MM-DD")
                    : ""
                }
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="package-updated_at">
                تاريخ اخر تعديل
              </Form.Label>
              <Form.Control
                className="border-0"
                type="text"
                id="package-updated_at"
                value={
                  updatedAt
                    ? moment(pack.updated_at)
                        .tz("Europe/Istanbul")
                        .format("HH:mm:ss - YYYY-MM-DD")
                    : ""
                }
                disabled
              />
            </Col>
          </Row>
          <Row className=" mt-2">
            <Col>
              <button
                type="button"
                className="btn btn-light fw-md w-100"
                onClick={handleCloseModal}
              >
                إلغاء
              </button>
            </Col>
          </Row>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default DetailPackageModal;
