import React from "react";
import { Col, Form, Modal, Row } from "react-bootstrap";
import moment from "moment";
import { useSelector } from "react-redux";

const DetailModelModal = ({ open, close, model }) => {
  const vehicleBrands = useSelector(
    (state) => state.vehicleBrands.vehicleBrands
  );
  const brand = vehicleBrands.find((b) => b.id === model?.brand_id);

  return (
    <Modal show={open} onHide={close} keyboard={false} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h6" className="modal-title">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{model?.id}#</span>
            <p className="m-0 fs-12 text-muted">
              معلومات الموديل {model?.name}
            </p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column gap-2">
          <Row>
            <Col>
              <Form.Label htmlFor="model-id">رقم الموديل</Form.Label>
              <Form.Control
                type="text"
                id="model-id"
                value={model?.id}
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="model-name">اسم الموديل</Form.Label>
              <Form.Control
                type="text"
                id="model-name"
                value={model?.name}
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="model-brand">الماركة</Form.Label>
              <Form.Control
                type="text"
                id="model-brand"
                value={brand ? brand.name : "غير معروف"}
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="model-created_at">تاريخ الانشاء</Form.Label>
              <Form.Control
                type="text"
                id="model-created_at"
                value={
                  model?.created_at
                    ? moment(model.created_at)
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
              <Form.Label htmlFor="model-updated_at">
                تاريخ اخر تعديل
              </Form.Label>
              <Form.Control
                type="text"
                id="model-updated_at"
                value={
                  model?.updated_at
                    ? moment(model.updated_at)
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
              <button
                type="button"
                className="btn btn-light fw-md w-100 mt-2"
                onClick={close}
              >
                إخفاء
              </button>
            </Col>
          </Row>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default DetailModelModal;
