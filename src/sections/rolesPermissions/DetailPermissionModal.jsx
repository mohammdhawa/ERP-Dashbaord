import React from "react";
import { Badge, Col, Form, Modal, Row } from "react-bootstrap";
import moment from "moment";

const DetailPermissionModal = ({ open, close, permission }) => {
  return (
    <Modal show={open} onHide={close} keyboard={false} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h6" className="modal-title">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{permission?.id}#</span>
            <p className="m-0 fs-12 text-muted">
              معلومات الصلاحية {permission?.name}
            </p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column gap-2">
          <Row>
            <Col>
              <Form.Label htmlFor="permission-id">رقم الصلاحية</Form.Label>
              <Form.Control
                type="text"
                id="permission-id"
                value={permission?.id}
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="permission-name">اسم الصلاحية</Form.Label>
              <Form.Control
                type="text"
                id="permission-name"
                value={permission?.name}
                disabled
              />
            </Col>
          </Row>

          <Row>
            <Col>
              <Form.Label htmlFor="permission-created_at">
                تاريخ الانشاء
              </Form.Label>
              <Form.Control
                type="text"
                id="permission-created_at"
                value={
                  permission?.created_at
                    ? moment(permission.created_at)
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
              <Form.Label htmlFor="permission-updated_at">
                تاريخ اخر تعديل
              </Form.Label>
              <Form.Control
                type="text"
                id="permission-updated_at"
                value={
                  permission?.updated_at
                    ? moment(permission.updated_at)
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
                className="btn btn-light fw-md w-100  mt-2"
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

export default DetailPermissionModal;
