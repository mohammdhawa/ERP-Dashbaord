import React, { useEffect, useState } from "react";
import { Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { useSelector } from "react-redux";
import EmployeePicker from "../../components/EmployeePicker";
import { hasPermission } from "../../data/permissionsCatalog";

const REASON_MIN = 3;
const REASON_MAX = 500;

const stepLabel = (step) =>
  [
    `المرحلة ${step.step_order}`,
    step.resolver_label,
    step.approver?.full_name,
  ]
    .filter(Boolean)
    .join(" — ");

// Hand a pending step to someone else (API doc §15.5). `steps` is already the
// reassignable set (pending steps, and only when the server said can_reassign).
// The parent performs the call; `onSubmit` rejects with the parsed API error
// ({ message, errors }) and the modal keeps its input so a refused employee can
// be swapped without retyping the reason.
const ReassignModal = ({ show, steps, onHide, onSubmit }) => {
  const { permissions } = useSelector((state) => state.auth);
  const canPick = hasPermission(permissions, "hr.employees.view");

  const [pickedStep, setPickedStep] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (show) {
      setPickedStep("");
      setEmployeeId("");
      setReason("");
      setErrors({});
    }
  }, [show]);

  // Preselected when there is only one; a picked step that the latest reload
  // dropped (decided elsewhere) falls back to that rule instead of being sent.
  const stepId = steps.some((s) => s.id === Number(pickedStep))
    ? Number(pickedStep)
    : steps.length === 1
    ? steps[0].id
    : "";

  const clear = (field) => setErrors((prev) => ({ ...prev, [field]: null }));

  const validate = () => {
    const e = {};
    if (stepId === "") e.step = ["اختر الخطوة المراد إعادة إسنادها."];
    if (employeeId === "") e.employee_id = ["اختر الموظف الجديد."];
    const length = reason.trim().length;
    if (length < REASON_MIN || length > REASON_MAX)
      e.reason = [`السبب مطلوب، من ${REASON_MIN} إلى ${REASON_MAX} حرفاً.`];
    return e;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        stepId,
        employee_id: Number(employeeId),
        reason: reason.trim(),
      });
    } catch (parsed) {
      // Already toasted by the parent; map the field errors, if any.
      if (parsed?.errors) setErrors(parsed.errors);
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field) => errors?.[field]?.[0];

  return (
    <Modal
      show={show}
      onHide={saving ? undefined : onHide}
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton={!saving}>
        <Modal.Title as="h6">إعادة إسناد خطوة الاعتماد</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div>
            <Form.Label htmlFor="reassign-step">الخطوة *</Form.Label>
            <Form.Select
              id="reassign-step"
              value={stepId}
              onChange={(e) => {
                setPickedStep(e.target.value);
                clear("step");
              }}
              isInvalid={!!fieldError("step")}
              disabled={saving}
            >
              {steps.length !== 1 && <option value="">اختر الخطوة</option>}
              {steps.map((step) => (
                <option key={step.id} value={step.id}>
                  {stepLabel(step)}
                </option>
              ))}
            </Form.Select>
            {fieldError("step") && (
              <div className="text-danger small mt-1">{fieldError("step")}</div>
            )}
          </div>

          <div>
            <Form.Label htmlFor="reassign-employee">المعتمِد الجديد *</Form.Label>
            {canPick ? (
              <EmployeePicker
                inputId="reassign-employee"
                value={employeeId}
                onChange={(value) => {
                  setEmployeeId(value);
                  clear("employee_id");
                }}
                isDisabled={saving}
              />
            ) : (
              <div className="text-muted small">
                اختيار الموظف يتطلب صلاحية عرض الموظفين مع صلاحية إعادة الإسناد.
              </div>
            )}
            {fieldError("employee_id") && (
              <div className="text-danger small mt-1">
                {fieldError("employee_id")}
              </div>
            )}
          </div>

          <div>
            <Form.Label htmlFor="reassign-reason">السبب *</Form.Label>
            <Form.Control
              id="reassign-reason"
              as="textarea"
              maxLength={REASON_MAX}
              style={{ height: "5rem" }}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                clear("reason");
              }}
              isInvalid={!!fieldError("reason")}
              disabled={saving}
            />
            {fieldError("reason") && (
              <div className="text-danger small mt-1">{fieldError("reason")}</div>
            )}
          </div>

          <Row className="g-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-secondary fw-md w-100"
                type="submit"
                disabled={saving || !canPick}
              >
                {saving ? <Spinner animation="border" size="sm" /> : "إعادة الإسناد"}
              </button>
            </Col>
            <Col sm={12} md={6}>
              <button
                type="button"
                className="btn btn-light fw-md w-100"
                onClick={onHide}
                disabled={saving}
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

export default ReassignModal;
