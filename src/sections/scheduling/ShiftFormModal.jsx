import { useEffect, useMemo, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDiscardChanges, toastNotify } from "../../utils";
import { toShiftBody } from "./schedulingPayload";

// Create / edit one shift (API doc §19.1). `code` is locked once created; a
// refusal (a time change on a shift in use, say) is the server's 422 and stays
// in the open modal.

const emptyForm = {
  code: "",
  name: "",
  starts_at: "",
  duration_minutes: "",
  is_active: true,
};

const formFromShift = (shift) =>
  shift
    ? {
        code: shift.code || "",
        name: shift.name || "",
        starts_at: shift.starts_at || "",
        duration_minutes: String(shift.duration_minutes ?? ""),
        is_active: Boolean(shift.is_active),
      }
    : emptyForm;

const ShiftFormModal = ({ show, shift = null, onHide, onSaved }) => {
  const isEdit = Boolean(shift);

  const [form, setForm] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      const values = formFromShift(shift);
      setForm(values);
      setInitialForm(values);
      setErrors({});
      setMessage(null);
    }
  }, [show, shift]);

  const isDirty = useMemo(
    () => Object.keys(form).some((key) => form[key] !== initialForm[key]),
    [form, initialForm]
  );

  const handleCancel = async () => {
    if (saving) return;
    if (!isDirty) {
      onHide();
      return;
    }
    if (await confirmDiscardChanges()) onHide();
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const body = toShiftBody(form, { editing: isEdit });
      const response = isEdit
        ? await api.patch(`/scheduling/shifts/${shift.id}`, body)
        : await api.post("/scheduling/shifts", body);
      toastNotify(response.data.message, "success");
      onSaved?.(response.data.data);
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.status === 0) {
        toastNotify(parsed.message, "error");
      } else {
        setMessage(parsed.message);
        setErrors(parsed.errors || {});
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field) => errors?.[field]?.[0];
  const errorLine = (field) =>
    fieldError(field) && (
      <div className="text-danger small mt-1">{fieldError(field)}</div>
    );

  return (
    <Modal
      show={show}
      onHide={handleCancel}
      keyboard={false}
      centered
      backdrop="static"
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          {isEdit ? `تعديل الوردية: ${shift?.name}` : "إضافة وردية"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          {message && (
            <Alert variant="danger" className="mb-0 py-2 px-3">
              {message}
            </Alert>
          )}
          <Row className="g-3">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="sh-code">الرمز {!isEdit && "*"}</Form.Label>
              <Form.Control
                id="sh-code"
                type="text"
                dir="ltr"
                maxLength={30}
                placeholder="NIGHT"
                value={form.code}
                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                isInvalid={!!fieldError("code")}
                disabled={isEdit}
                autoFocus={!isEdit}
              />
              {errorLine("code")}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="sh-name">الاسم *</Form.Label>
              <Form.Control
                id="sh-name"
                type="text"
                maxLength={100}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                isInvalid={!!fieldError("name")}
                autoFocus={isEdit}
              />
              {errorLine("name")}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="sh-starts">البداية *</Form.Label>
              <Form.Control
                id="sh-starts"
                type="time"
                dir="ltr"
                value={form.starts_at}
                onChange={(e) => setField("starts_at", e.target.value)}
                isInvalid={!!fieldError("starts_at")}
              />
              {errorLine("starts_at")}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="sh-duration">المدة (بالدقائق) *</Form.Label>
              <Form.Control
                id="sh-duration"
                type="number"
                dir="ltr"
                min={1}
                max={1440}
                value={form.duration_minutes}
                onChange={(e) => setField("duration_minutes", e.target.value)}
                isInvalid={!!fieldError("duration_minutes")}
              />
              {errorLine("duration_minutes")}
            </Col>
            <Col sm={12}>
              <Form.Check
                type="switch"
                id="sh-is-active"
                label="مفعّلة"
                checked={form.is_active}
                onChange={(e) => setField("is_active", e.target.checked)}
              />
              {errorLine("is_active")}
            </Col>
          </Row>

          <Row className="g-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-secondary fw-md w-100"
                type="submit"
                disabled={saving}
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
                onClick={handleCancel}
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

export default ShiftFormModal;
