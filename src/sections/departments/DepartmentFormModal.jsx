import React, { useEffect, useState } from "react";
import { Col, Form, Row, Modal, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import {
  createDepartment,
  updateDepartment,
} from "../../redux/actions/departmentsActions";

// Create + edit in one modal: `department` null → create, otherwise edit.
const DepartmentFormModal = ({ open, close, department, currentPage }) => {
  const dispatch = useDispatch();
  const { saving } = useSelector((state) => state.departments);
  const isEdit = Boolean(department);

  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setName(department?.name || "");
      setManagerId(department?.manager_id ?? "");
      setErrors({});
    }
  }, [open, department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: ["اسم القسم مطلوب."] });
      return;
    }

    const payload = {
      name: name.trim(),
      // nullable: an empty input clears the manager assignment
      manager_id: managerId === "" ? null : Number(managerId),
    };

    try {
      if (isEdit) {
        await dispatch(updateDepartment(department.id, payload, currentPage));
      } else {
        await dispatch(createDepartment(payload, currentPage));
      }
      close();
    } catch (parsed) {
      // 422: map the Laravel error bag onto the fields; other errors show the
      // server's Arabic message under the form.
      setErrors(parsed.errors || { _general: [parsed.message] });
    }
  };

  return (
    <Modal show={open} onHide={close} keyboard={false} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          {isEdit ? "تعديل القسم" : "إضافة قسم جديد"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
          <Row>
            <Col sm={12}>
              <Form.Label htmlFor="department-name">اسم القسم</Form.Label>
              <Form.Control
                id="department-name"
                type="text"
                placeholder="ادخل اسم القسم"
                value={name}
                maxLength={255}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: null }));
                }}
                isInvalid={!!errors.name}
                autoFocus
              />
              {errors.name && (
                <div className="text-danger small mt-1">{errors.name[0]}</div>
              )}
            </Col>
          </Row>
          <Row>
            <Col sm={12}>
              <Form.Label htmlFor="department-manager">
                رقم الموظف المدير <span className="text-muted">(اختياري)</span>
              </Form.Label>
              <Form.Control
                id="department-manager"
                type="number"
                min={1}
                placeholder="معرّف الموظف (ID)"
                value={managerId}
                onChange={(e) => {
                  setManagerId(e.target.value);
                  setErrors((prev) => ({ ...prev, manager_id: null }));
                }}
                isInvalid={!!errors.manager_id}
              />
              {errors.manager_id && (
                <div className="text-danger small mt-1">
                  {errors.manager_id[0]}
                </div>
              )}
            </Col>
          </Row>
          {errors._general && (
            <p className="text-danger mb-0">{errors._general[0]}</p>
          )}
          <Row className="g-2 mt-1">
            <Col sm={12} md={6}>
              <button
                className="btn btn-secondary fw-md w-100"
                type="submit"
                disabled={saving || !name.trim()}
              >
                {saving ? (
                  <Spinner animation="border" size="sm" />
                ) : isEdit ? (
                  "حفظ التعديلات"
                ) : (
                  "إضافة"
                )}
              </button>
            </Col>
            <Col sm={12} md={6}>
              <button
                type="button"
                className="btn btn-light fw-md w-100"
                onClick={close}
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

export default DepartmentFormModal;
