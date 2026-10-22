import React, { useEffect, useMemo, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDiscardChanges, toastNotify } from "../../utils";

// تعديل الرصيد — PUT /leave/balances/{employee}/{year} (API doc §16.2).
//
// ⚠️ The row's `allocated_days` is allocation PLUS adjustment, but the PUT's
// `allocated_days` is the allocation alone. Prefilling the field with the
// displayed figure would add the adjustment a second time on every save, so the
// field starts at `allocated_days − adjustment_days`. (When the server clamped a
// negative total to 0 the allocation is not recoverable from the row; the
// subtraction is floored at 0 and HR sees the field before saving.)
//
// The server's floor refusal («لا يمكن أن يقل الرصيد عن الأيام المعتمدة…») is a
// 422 with no `errors` key, so it lands in the form's message like any other
// error with no field of its own.

const MAX_DAYS = 365;

const formFromRow = (row) => {
  const allocation = Math.min(
    MAX_DAYS,
    Math.max(0, (row?.allocated_days ?? 0) - (row?.adjustment_days ?? 0))
  );
  return {
    allocated_days: String(allocation),
    adjustment_days: String(row?.adjustment_days ?? 0),
    note: row?.note || "",
  };
};

const isWholeNumber = (text) => /^-?\d+$/.test(text.trim());

const EditBalanceModal = ({ show, row, year, onHide, onSaved }) => {
  const [form, setForm] = useState(formFromRow(null));
  const [initialForm, setInitialForm] = useState(formFromRow(null));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      const values = formFromRow(row);
      setForm(values);
      setInitialForm(values);
      setErrors({});
    }
  }, [show, row]);

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
    setErrors((prev) => ({ ...prev, [field]: null, _general: null }));
  };

  const validate = () => {
    const e = {};
    const allocated = form.allocated_days;
    if (allocated.trim() === "") e.allocated_days = ["عدد أيام الرصيد مطلوب."];
    else if (!isWholeNumber(allocated))
      e.allocated_days = ["عدد أيام الرصيد يجب أن يكون رقماً صحيحاً."];
    else if (Number(allocated) < 0)
      e.allocated_days = ["عدد أيام الرصيد لا يكون سالباً."];
    else if (Number(allocated) > MAX_DAYS)
      e.allocated_days = [`عدد أيام الرصيد لا يتجاوز ${MAX_DAYS} يوماً.`];

    const adjustment = form.adjustment_days;
    if (adjustment.trim() !== "") {
      if (!isWholeNumber(adjustment))
        e.adjustment_days = ["أيام التعديل يجب أن تكون رقماً صحيحاً."];
      else if (Math.abs(Number(adjustment)) > MAX_DAYS)
        e.adjustment_days = [`أيام التعديل بين -${MAX_DAYS} و ${MAX_DAYS}.`];
    }

    if (form.note.trim().length > 255)
      e.note = ["الملاحظة يجب ألا تتجاوز 255 حرفاً."];
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

    const payload = {
      allocated_days: Number(form.allocated_days),
      // Omitted by the server means 0; an emptied box says the same.
      adjustment_days:
        form.adjustment_days.trim() === "" ? 0 : Number(form.adjustment_days),
      note: form.note.trim() || null,
    };

    setSaving(true);
    setErrors({});
    try {
      const response = await api.put(
        `/leave/balances/${row.employee.id}/${year}`,
        payload
      );
      toastNotify(response.data.message, "success");
      onSaved?.(response.data.data);
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors(parsed.errors || { _general: [parsed.message] });
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field) => errors?.[field]?.[0];

  return (
    <Modal
      show={show}
      onHide={handleCancel}
      keyboard={false}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          تعديل الرصيد: {row?.employee?.full_name} — {year}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <Row className="g-3">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="bal-allocated">عدد أيام الرصيد *</Form.Label>
              <Form.Control
                id="bal-allocated"
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_DAYS}
                step={1}
                value={form.allocated_days}
                onChange={(e) => setField("allocated_days", e.target.value)}
                isInvalid={!!fieldError("allocated_days")}
                autoFocus
              />
              {fieldError("allocated_days") && (
                <div className="text-danger small mt-1">
                  {fieldError("allocated_days")}
                </div>
              )}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="bal-adjustment">أيام التعديل</Form.Label>
              <Form.Control
                id="bal-adjustment"
                type="number"
                inputMode="numeric"
                min={-MAX_DAYS}
                max={MAX_DAYS}
                step={1}
                value={form.adjustment_days}
                onChange={(e) => setField("adjustment_days", e.target.value)}
                isInvalid={!!fieldError("adjustment_days")}
              />
              <div className="text-muted small mt-1">
                رقم موجب للترحيل من سنة سابقة، وسالب للخصم.
              </div>
              {fieldError("adjustment_days") && (
                <div className="text-danger small mt-1">
                  {fieldError("adjustment_days")}
                </div>
              )}
            </Col>
            <Col sm={12}>
              <Form.Label htmlFor="bal-note">ملاحظة</Form.Label>
              <Form.Control
                id="bal-note"
                type="text"
                maxLength={255}
                placeholder="مثال: رصيد افتتاحي"
                value={form.note}
                onChange={(e) => setField("note", e.target.value)}
                isInvalid={!!fieldError("note")}
              />
              {fieldError("note") && (
                <div className="text-danger small mt-1">{fieldError("note")}</div>
              )}
            </Col>
          </Row>

          <div className="text-muted fs-11">
            الرصيد المتاح = عدد الأيام + التعديل، ولا يقل عن الأيام المعتمدة لهذه
            السنة.
          </div>

          {errors._general && (
            <Alert variant="danger" className="mb-0 py-2 px-3" role="alert">
              {errors._general[0]}
            </Alert>
          )}

          <Row className="g-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-secondary fw-md w-100"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "حفظ الرصيد"
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

export default EditBalanceModal;
