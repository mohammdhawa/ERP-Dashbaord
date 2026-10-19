import React, { useEffect, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../../redux/api";
import { parseApiError } from "../../../utils/apiHelpers";
import { confirmDiscardChanges, toastNotify } from "../../../utils";
import { formatAbsolute, parseServerTimestamp } from "../../system/auditFormat";
import { buildCheckoutCorrection } from "../../../redux/actions/attendanceParams";

// تصحيح الانصراف — PATCH /attendance/records/{id}/checkout (API doc §13.3).
// `{id}` is the day's CHECK-IN; the server writes a check-out row for it
// (marked as corrected, with the note) and clears the missing-check-out flag.
// The server's 422s (not a check-in, already has a check-out, check-out before
// check-in) are shown as the form's general error.

const MAX_NOTE = 500;

// The check-in's own day, read off the ISO string as sent (Damascus) — never
// through `new Date()`, which would move it into the browser's zone.
const checkInDay = (recordedAt) =>
  parseServerTimestamp(recordedAt)?.date ?? String(recordedAt ?? "").slice(0, 10);

const CorrectCheckoutModal = ({ show, checkIn, onHide, onDone }) => {
  const [date, setDate] = useState("");
  const [initialDate, setInitialDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      const day = checkInDay(checkIn?.recorded_at);
      setDate(day);
      setInitialDate(day);
      setTime("");
      setNote("");
      setErrors({});
    }
    // Reset on open / another check-in only (see RejectRecordModal).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, checkIn?.id]);

  const isDirty = time !== "" || note.trim() !== "" || date !== initialDate;

  const handleCancel = async () => {
    if (saving) return;
    if (!isDirty) {
      onHide();
      return;
    }
    if (await confirmDiscardChanges()) onHide();
  };

  const validate = () => {
    const e = {};
    if (!date) e.date = ["تاريخ الانصراف مطلوب."];
    if (!time) e.time = ["وقت الانصراف مطلوب."];
    if (note.trim().length > MAX_NOTE)
      e.note = [`الملاحظة يجب ألا تتجاوز ${MAX_NOTE} حرف.`];
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
    setErrors({});
    let data;
    let message;
    try {
      const response = await api.patch(
        `/attendance/records/${checkIn.id}/checkout`,
        buildCheckoutCorrection({ date, time, note })
      );
      data = response.data.data;
      message = response.data.message;
    } catch (err) {
      const parsed = parseApiError(err);
      // The server names the field `checked_out_at`; the form splits it in two.
      const bag = parsed.errors ? { ...parsed.errors } : null;
      if (bag?.checked_out_at) {
        bag.time = bag.checked_out_at;
        delete bag.checked_out_at;
      }
      // An errors bag that names no field of this form would show nothing.
      const shown = bag && ["date", "time", "note"].some((f) => bag[f]);
      setErrors(shown ? bag : { _general: [parsed.message] });
      return;
    } finally {
      setSaving(false);
    }
    // After the try/catch: a throwing callback is not a network failure.
    toastNotify(message, "success");
    onDone?.(data);
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
        <Modal.Title as="h6">تصحيح الانصراف</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          {checkIn && (
            <div className="border rounded p-2 small">
              <div className="fw-semibold">{checkIn.employee?.full_name}</div>
              {checkIn.recorded_at && (
                <div className="text-muted">
                  الحضور: <span dir="ltr">{formatAbsolute(checkIn.recorded_at)}</span>
                </div>
              )}
            </div>
          )}

          <Row className="g-3">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="checkout-date">تاريخ الانصراف *</Form.Label>
              <Form.Control
                id="checkout-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setErrors((prev) => ({ ...prev, date: null, time: null, _general: null }));
                }}
                isInvalid={!!fieldError("date")}
                disabled={saving}
              />
              {fieldError("date") && (
                <div className="text-danger small mt-1">{fieldError("date")}</div>
              )}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="checkout-time">وقت الانصراف *</Form.Label>
              <Form.Control
                id="checkout-time"
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setErrors((prev) => ({ ...prev, time: null, _general: null }));
                }}
                isInvalid={!!fieldError("time")}
                disabled={saving}
                autoFocus
              />
              {fieldError("time") && (
                <div className="text-danger small mt-1">{fieldError("time")}</div>
              )}
            </Col>
          </Row>
          <div className="text-muted small mt-n2">بتوقيت دمشق.</div>

          <div>
            <Form.Label htmlFor="checkout-note">الملاحظة (اختياري)</Form.Label>
            <Form.Control
              id="checkout-note"
              as="textarea"
              maxLength={MAX_NOTE}
              style={{ height: "5rem" }}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setErrors((prev) => ({ ...prev, note: null, _general: null }));
              }}
              isInvalid={!!fieldError("note")}
              disabled={saving}
            />
            {fieldError("note") && (
              <div className="text-danger small mt-1">{fieldError("note")}</div>
            )}
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
                {saving ? <Spinner animation="border" size="sm" /> : "تسجيل الانصراف"}
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

export default CorrectCheckoutModal;
