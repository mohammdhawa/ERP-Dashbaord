import React from "react";
import { Badge, Col, Form, Modal, Row } from "react-bootstrap";
import moment from "moment";
import { adTypes } from "../../../data/General";

const DetailBrandModal = ({ open, close, brand }) => {
  return (
    <Modal show={open} onHide={close} keyboard={false} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h6" className="modal-title">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{brand?.id}#</span>
            <p className="m-0 fs-12 text-muted">
              معلومات الماركة {brand?.name}
            </p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column gap-2">
          <Row>
            <Col>
              <Form.Label htmlFor="brand-id">رقم الماركة</Form.Label>
              <Form.Control
                type="text"
                id="brand-id"
                value={brand?.id}
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="brand-name">اسم الماركة</Form.Label>
              <Form.Control
                type="text"
                id="brand-name"
                value={brand?.name}
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="brand-category">الفئة</Form.Label>
              <Form.Control
                type="text"
                id="brand-category"
                value={
                  adTypes.find((adType) => adType.value === brand?.category_id)
                    ?.label || "غير معروف"
                }
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="brand-created_at">تاريخ الانشاء</Form.Label>
              <Form.Control
                type="text"
                id="brand-created_at"
                value={
                  brand?.created_at
                    ? moment(brand.created_at)
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
              <Form.Label htmlFor="brand-updated_at">
                تاريخ اخر تعديل
              </Form.Label>
              <Form.Control
                type="text"
                id="brand-updated_at"
                value={
                  brand?.updated_at
                    ? moment(brand.updated_at)
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

export default DetailBrandModal;
