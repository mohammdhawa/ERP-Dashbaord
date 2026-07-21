import React from "react";
import { Badge, Col, Form, Modal, Row } from "react-bootstrap";
import moment from "moment";

const DetailRoleModal = ({ open, close, role }) => {
  return (
    <Modal show={open} onHide={close} keyboard={false} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h6" className="modal-title">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{role?.id}#</span>
            <p className="m-0 fs-12 text-muted">معلومات الدور {role?.name}</p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column gap-2">
          <Row>
            <Col>
              <Form.Label htmlFor="role-id">رقم الدور</Form.Label>
              <Form.Control
                type="text"
                id="role-id"
                value={role?.id}
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="role-name">اسم الدور</Form.Label>
              <Form.Control
                type="text"
                id="role-name"
                value={role?.name}
                disabled
              />
            </Col>
          </Row>
          <Row className="g-2">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="role-is_editable">قابل للتعديل</Form.Label>
              <Form.Control
                type="text"
                id="role-is_editable"
                value={role?.is_editable ? "نعم" : "لا"}
                disabled
              />
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="role-is_editable">قابل للحذف</Form.Label>
              <Form.Control
                type="text"
                id="role-is_editable"
                value={role?.is_deleteable ? "نعم" : "لا"}
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="role-name">
                عدد المستفيدين من الدور
              </Form.Label>
              <Form.Control
                type="text"
                id="role-name"
                value={role?.users_count && role?.users_count}
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="role-created_at">تاريخ الانشاء</Form.Label>
              <Form.Control
                type="text"
                id="role-created_at"
                value={
                  role?.created_at
                    ? moment(role.created_at)
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
              <Form.Label htmlFor="role-updated_at">تاريخ اخر تعديل</Form.Label>
              <Form.Control
                type="text"
                id="role-updated_at"
                value={
                  role?.updated_at
                    ? moment(role.updated_at)
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
              <Form.Label htmlFor="role-permissions">صلاحيات الدور</Form.Label>
              <div
                id="role-permissions"
                className="d-flex flex-wrap gap-1"
                style={{ maxHeight: "7rem", overflowY: "scroll" }}
              >
                {role?.permissions?.map((perm) => (
                  <Badge
                    draggable
                    key={perm.id}
                    className="fs-12 py-2 px-4 align-middle bg-secondary-transparent"
                  >
                    {perm.name}
                  </Badge>
                ))}
              </div>
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

export default DetailRoleModal;
