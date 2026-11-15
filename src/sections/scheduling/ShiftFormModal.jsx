import { useEffect, useMemo, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDiscardChanges, toastNotify } from "../../utils";
import { formatMinutes } from "../attendance/minutesText";
import { rulesFormFrom, rulesProblem, toRulesBody, toShiftBody } from "./schedulingPayload";
import { durationFromTimes, endFromDuration, endsNextDay } from "./shiftDisplay";
import ShiftRulesFields from "./ShiftRulesFields";
import ShiftRuleVersions from "./ShiftRuleVersions";

// Create / edit one shift (API doc §19.1; per-shift rules spec §5.2). HR
// enters a start and an end; the length the API stores is worked out here.
// `code` is locked once created; a refusal (a time change on a shift in use,
// say) is the server's 422 and stays in the open modal. A new shift carries
// its first rules; an existing one changes them as dated versions below.

const emptyForm = {
  code: "",
  name: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

const formFromShift = (shift) =>
  shift
    ? {
        code: shift.code || "",
        name: shift.name || "",
        starts_at: shift.starts_at || "",
        ends_at: endFromDuration(shift.starts_at || "", shift.duration_minutes ?? 0),
        is_active: Boolean(shift.is_active),
      }
    : emptyForm;

const ShiftFormModal = ({ show, shift = null, onHide, onSaved, onRulesChanged }) => {
  const isEdit = Boolean(shift);

  const [form, setForm] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [rulesForm, setRulesForm] = useState(() => rulesFormFrom(null));
  const [initialRules, setInitialRules] = useState(() => rulesFormFrom(null));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      const values = formFromShift(shift);
      setForm(values);
      setInitialForm(values);
      setRulesForm(rulesFormFrom(null));
      setInitialRules(rulesFormFrom(null));
      setErrors({});
      setMessage(null);
    }
  }, [show, shift]);

  const duration = durationFromTimes(form.starts_at, form.ends_at);
  const rulesIssue = isEdit ? null : rulesProblem(rulesForm);

  const isDirty = useMemo(
    () =>
      Object.keys(form).some((key) => form[key] !== initialForm[key]) ||
      (!isEdit && Object.keys(rulesForm).some((key) => rulesForm[key] !== initialRules[key])),
    [form, initialForm, rulesForm, initialRules, isEdit]
  );

  const setRuleField = (field, value) => {
    setRulesForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

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
      const shiftBody = toShiftBody({ ...form, duration_minutes: duration }, { editing: isEdit });
      const body = isEdit ? shiftBody : { ...shiftBody, ...toRulesBody(rulesForm, duration) };
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
              <Form.Label htmlFor="sh-ends">النهاية *</Form.Label>
              <Form.Control
                id="sh-ends"
                type="time"
                dir="ltr"
                value={form.ends_at}
                onChange={(e) => setField("ends_at", e.target.value)}
                isInvalid={!!fieldError("duration_minutes")}
              />
              {errorLine("duration_minutes")}
            </Col>
            {duration && (
              <Col sm={12}>
                <div className="text-muted small">
                  المدة: {formatMinutes(duration)}
                  {endsNextDay(form.starts_at, form.ends_at) && " · ينتهي في اليوم التالي"}
                </div>
              </Col>
            )}
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

          {!isEdit && (
            <div className="border-top pt-3">
              <h6 className="mb-3">قواعد الوردية</h6>
              <ShiftRulesFields
                value={rulesForm}
                onChange={setRuleField}
                fieldError={fieldError}
                idPrefix="sh"
                lengthMinutes={duration}
              />
              {rulesIssue && <div className="text-danger small mt-2">{rulesIssue}</div>}
            </div>
          )}

          <Row className="g-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-secondary fw-md w-100"
                type="submit"
                disabled={saving || !duration || Boolean(rulesIssue)}
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
        {isEdit && shift && <ShiftRuleVersions shift={shift} onChanged={onRulesChanged} />}
      </Modal.Body>
    </Modal>
  );
};

export default ShiftFormModal;
