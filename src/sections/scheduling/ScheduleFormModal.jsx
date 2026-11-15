import { useEffect, useMemo, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDiscardChanges, toastNotify } from "../../utils";
import { toScheduleBody } from "./schedulingPayload";
import { displayPositions, scheduleDayLabel, shiftSpan } from "./shiftDisplay";
import { useSchedulingOptions } from "./useSchedulingOptions";

// Create / edit one schedule (API doc §19.2). `code`, `kind` and `cycle_days`
// are fixed once created. The day rows are keyed by position; a weekly
// schedule lists them Saturday first, but every row keeps its own position.

const emptyForm = {
  code: "",
  name: "",
  kind: "1",
  cycle_days: "7",
  is_active: true,
  days: {},
};

const formFromSchedule = (schedule) => {
  if (!schedule) return emptyForm;
  const days = {};
  (schedule.days || []).forEach((day) => {
    days[day.position] = day.shift?.id ?? "";
  });
  return {
    code: schedule.code || "",
    name: schedule.name || "",
    kind: String(schedule.kind),
    cycle_days: String(schedule.cycle_days),
    is_active: Boolean(schedule.is_active),
    days,
  };
};

const isSame = (a, b) =>
  a.code === b.code &&
  a.name === b.name &&
  a.kind === b.kind &&
  a.cycle_days === b.cycle_days &&
  a.is_active === b.is_active &&
  Object.keys({ ...a.days, ...b.days }).every(
    (position) => String(a.days[position] ?? "") === String(b.days[position] ?? "")
  );

const ScheduleFormModal = ({ show, schedule = null, onHide, onSaved }) => {
  const isEdit = Boolean(schedule);

  const [form, setForm] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const {
    shifts,
    loading: shiftsLoading,
    error: shiftsError,
    reload: reloadShifts,
  } = useSchedulingOptions(show);

  useEffect(() => {
    if (show) {
      const values = formFromSchedule(schedule);
      setForm(values);
      setInitialForm(values);
      setErrors({});
      setMessage(null);
    }
  }, [show, schedule]);

  const kind = Number(form.kind);
  const cycleDays = kind === 1 ? 7 : Number(form.cycle_days) || 0;
  const cycleValid = Number.isInteger(cycleDays) && cycleDays >= 1 && cycleDays <= 28;
  const positions = cycleValid ? displayPositions(kind, cycleDays) : [];

  // Active shifts, plus any shift the schedule already uses that has since been
  // stopped: its row must still show what it holds.
  const options = useMemo(() => {
    const known = new Map(shifts.map((option) => [option.value, option.item]));
    (schedule?.days || []).forEach((day) => {
      if (day.shift && !known.has(day.shift.id)) known.set(day.shift.id, day.shift);
    });
    return [...known.values()];
  }, [shifts, schedule]);

  const shiftById = useMemo(
    () => new Map(options.map((item) => [String(item.id), item])),
    [options]
  );

  const isDirty = !isSame(form, initialForm);

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

  const setDay = (position, value) => {
    setForm((prev) => ({ ...prev, days: { ...prev.days, [position]: value } }));
    setErrors((prev) => ({ ...prev, days: null }));
  };

  const handleKind = (value) => {
    setForm((prev) => ({
      ...prev,
      kind: value,
      cycle_days: value === "1" ? "7" : prev.kind === "1" ? "" : prev.cycle_days,
    }));
    setErrors((prev) => ({ ...prev, kind: null, cycle_days: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const body = toScheduleBody(
        { ...form, cycle_days: cycleDays },
        { editing: isEdit, initialDays: isEdit ? initialForm.days : undefined }
      );
      const response = isEdit
        ? await api.patch(`/scheduling/schedules/${schedule.id}`, body)
        : await api.post("/scheduling/schedules", body);
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
      size="lg"
      onHide={handleCancel}
      keyboard={false}
      centered
      backdrop="static"
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          {isEdit ? `تعديل الجدول: ${schedule?.name}` : "إضافة جدول"}
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
            <Col sm={12} md={4}>
              <Form.Label htmlFor="sc-code">الرمز {!isEdit && "*"}</Form.Label>
              <Form.Control
                id="sc-code"
                type="text"
                dir="ltr"
                maxLength={30}
                placeholder="NIGHTS"
                value={form.code}
                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                isInvalid={!!fieldError("code")}
                disabled={isEdit}
                autoFocus={!isEdit}
              />
              {errorLine("code")}
            </Col>
            <Col sm={12} md={8}>
              <Form.Label htmlFor="sc-name">الاسم *</Form.Label>
              <Form.Control
                id="sc-name"
                type="text"
                maxLength={100}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                isInvalid={!!fieldError("name")}
                autoFocus={isEdit}
              />
              {errorLine("name")}
            </Col>
            <Col sm={12} md={4}>
              <Form.Label htmlFor="sc-kind">النوع *</Form.Label>
              <Form.Select
                id="sc-kind"
                value={form.kind}
                onChange={(e) => handleKind(e.target.value)}
                isInvalid={!!fieldError("kind")}
                disabled={isEdit}
              >
                <option value="1">أسبوعي</option>
                <option value="2">دوري</option>
              </Form.Select>
              {errorLine("kind")}
            </Col>
            {kind === 2 && (
              <Col sm={12} md={4}>
                <Form.Label htmlFor="sc-cycle">طول الدورة (بالأيام) *</Form.Label>
                <Form.Control
                  id="sc-cycle"
                  type="number"
                  dir="ltr"
                  min={1}
                  max={28}
                  value={form.cycle_days}
                  onChange={(e) => setField("cycle_days", e.target.value)}
                  isInvalid={!!fieldError("cycle_days")}
                  disabled={isEdit}
                />
                {errorLine("cycle_days")}
              </Col>
            )}
            <Col sm={12} md={4} className="d-flex align-items-end">
              <Form.Check
                type="switch"
                id="sc-is-active"
                label="مفعّل"
                checked={form.is_active}
                onChange={(e) => setField("is_active", e.target.checked)}
              />
            </Col>
          </Row>

          <div>
            <div className="fw-semibold mb-2">أيام الجدول</div>
            {shiftsError ? (
              <Alert variant="danger" className="mb-0 py-2 px-3 d-flex align-items-center justify-content-between">
                <span>{typeof shiftsError === "string" ? shiftsError : "تعذّر تحميل الورديات."}</span>
                <button type="button" className="btn btn-sm btn-light" onClick={reloadShifts}>
                  إعادة المحاولة
                </button>
              </Alert>
            ) : shiftsLoading && positions.length > 0 ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <div className="d-flex flex-column gap-2">
                {positions.map((position) => {
                  const chosen = form.days[position] ?? "";
                  const picked = chosen === "" ? null : shiftById.get(String(chosen));
                  return (
                    <Row key={position} className="g-2 align-items-center">
                      <Col xs={3} md={2}>
                        <Form.Label htmlFor={`sc-day-${position}`} className="mb-0">
                          {scheduleDayLabel(kind, position)}
                        </Form.Label>
                      </Col>
                      <Col xs={9} md={6}>
                        <Form.Select
                          id={`sc-day-${position}`}
                          value={String(chosen)}
                          onChange={(e) => setDay(position, e.target.value)}
                        >
                          <option value="">راحة</option>
                          {options.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.code} — {item.name}
                            </option>
                          ))}
                        </Form.Select>
                      </Col>
                      <Col xs={12} md={4} className="text-muted small" dir="ltr">
                        {picked ? shiftSpan(picked) : ""}
                      </Col>
                    </Row>
                  );
                })}
              </div>
            )}
            {errorLine("days")}
          </div>

          <Row className="g-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-secondary fw-md w-100"
                type="submit"
                disabled={saving || !cycleValid || Boolean(shiftsError)}
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

export default ScheduleFormModal;
