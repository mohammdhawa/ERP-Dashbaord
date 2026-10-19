import React, { useEffect, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../../redux/api";
import { parseApiError } from "../../../utils/apiHelpers";
import { confirmDiscardChanges, toastNotify } from "../../../utils";
import { formatAbsolute } from "../../system/auditFormat";
import { REJECTION_REASON_OPTIONS } from "../../../data/attendanceEnums";
import { validateReject } from "../../../redux/actions/attendanceParams";

// رفض التسجيل — PATCH /attendance/records/{id}/reject (API doc §13.4). The
// record stays as evidence and stops counting; refusing a check-in takes that
// day's check-out down with it, which is why the caller gets every affected row
// back in `rejected_records` and can redraw the day. The employee is notified.

const MAX_NOTE = 500;
const NOTE_REQUIRED_REASON = 3;

const RejectRecordModal = ({ show, record, onHide, onDone }) => {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setReason("");
      setNote("");
      setErrors({});
    }
    // Reset on open / another record, not on a new object identity of the same
    // one (which would wipe what is being typed).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, record?.id]);

  const isDirty = reason !== "" || note.trim() !== "";

  const handleCancel = async () => {
    if (saving) return;
    if (!isDirty) {
      onHide();
      return;
    }
    if (await confirmDiscardChanges()) onHide();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const clientErrors = validateReject({ reason, note });
    if (Object.keys(clientErrors).length > 0) {
      // validateReject speaks one message per field; the bag is field -> [msg].
      setErrors(
        Object.fromEntries(
          Object.entries(clientErrors).map(([field, msg]) => [field, [msg]])
        )
      );
      return;
    }

    const payload = { reason: Number(reason) };
    if (note.trim()) payload.note = note.trim();

    setSaving(true);
    setErrors({});
    let data;
    let message;
    try {
      const response = await api.patch(
        `/attendance/records/${record.id}/reject`,
        payload
      );
      data = response.data.data;
      message = response.data.message;
    } catch (err) {
      const parsed = parseApiError(err);
      // An errors bag that names no field of this form would show nothing.
      const shown = parsed.errors && ["reason", "note"].some((f) => parsed.errors[f]);
      setErrors(shown ? parsed.errors : { _general: [parsed.message] });
      return;
    } finally {
      setSaving(false);
    }
    // After the try/catch: a throwing callback is the caller's bug, not a
    // network failure to show under the form.
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
        <Modal.Title as="h6">رفض التسجيل</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          {record && (
            <div className="border rounded p-2 small">
              <div className="fw-semibold">{record.employee?.full_name}</div>
              <div className="text-muted">
                {record.type_label}
                {record.recorded_at && (
                  <>
                    {" — "}
                    <span dir="ltr">{formatAbsolute(record.recorded_at)}</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <Form.Label as="div">سبب الرفض *</Form.Label>
            {REJECTION_REASON_OPTIONS.map((option) => (
              <Form.Check
                key={option.value}
                type="radio"
                id={`reject-reason-${option.value}`}
                name="reject-reason"
                label={option.label}
                value={option.value}
                checked={String(reason) === String(option.value)}
                onChange={() => {
                  setReason(String(option.value));
                  setErrors((prev) => ({ ...prev, reason: null, note: null, _general: null }));
                }}
                disabled={saving}
              />
            ))}
            {fieldError("reason") && (
              <div className="text-danger small mt-1">{fieldError("reason")}</div>
            )}
          </div>

          <div>
            <Form.Label htmlFor="reject-note">
              {Number(reason) === NOTE_REQUIRED_REASON
                ? "الملاحظة *"
                : "الملاحظة (اختياري)"}
            </Form.Label>
            <Form.Control
              id="reject-note"
              as="textarea"
              style={{ height: "5rem" }}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setErrors((prev) => ({ ...prev, note: null, _general: null }));
              }}
              isInvalid={!!fieldError("note")}
              disabled={saving}
            />
            <div className="text-muted small mt-1">
              تُرسَل مع الإشعار إلى الموظف. الحد الأقصى {MAX_NOTE} حرف.
            </div>
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
                className="btn btn-danger fw-md w-100"
                type="submit"
                disabled={saving}
              >
                {saving ? <Spinner animation="border" size="sm" /> : "رفض التسجيل"}
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

export default RejectRecordModal;
