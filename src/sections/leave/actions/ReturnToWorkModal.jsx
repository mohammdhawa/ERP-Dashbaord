import React, { useEffect, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../../redux/api";
import { parseApiError } from "../../../utils/apiHelpers";
import { confirmDiscardChanges, toastNotify } from "../../../utils";
import BalanceNote from "./BalanceNote";
import LeaveSummary from "./LeaveSummary";

// العودة إلى العمل — POST /leave/requests/{id}/return-to-work (API doc §16.7).
// The employee came back before an approved leave ended: the leave is cut to
// end the day before, or cancelled when they were back on its first day. The
// approval itself is untouched.
//
// `leave` may be partial (report rows from the attendance screens): only `id`
// is needed, and the date's min/max apply only for the bounds that are known.
// The server still checks the range, so an unbounded field just defers to it.
//
// After success the modal stays open on a result view (the server's message,
// the days returned and the balance it left, as UndoExcuseModal does), and
// `onDone` fires at once so the caller's screen is already current behind it.
// Closing is the user's «إغلاق» → onHide.

const MAX_REASON = 2000;

const todayString = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};

// "Today", pulled into the leave when it falls outside it (a leave that ended
// last week can only be returned from within itself). YYYY-MM-DD strings
// compare correctly as text.
const defaultReturnDate = (leave) => {
  let date = todayString();
  if (leave?.end_date && date > leave.end_date) date = leave.end_date;
  if (leave?.start_date && date < leave.start_date) date = leave.start_date;
  return date;
};

const ReturnToWorkModal = ({ show, leave, onHide, onDone }) => {
  const [returnedOn, setReturnedOn] = useState("");
  const [initialDate, setInitialDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { message, daysReturned, balance } once done

  useEffect(() => {
    if (show) {
      const date = defaultReturnDate(leave);
      setReturnedOn(date);
      setInitialDate(date);
      setReason("");
      setErrors({});
      setResult(null);
    }
    // Reset when it opens or targets another leave — not on every new object
    // identity of the same leave, which would wipe what is being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, leave?.id]);

  const isDirty = reason.trim() !== "" || returnedOn !== initialDate;

  const handleCancel = async () => {
    if (saving) return;
    if (result || !isDirty) {
      onHide();
      return;
    }
    if (await confirmDiscardChanges()) onHide();
  };

  const validate = () => {
    const e = {};
    if (!returnedOn) e.returned_on = ["تاريخ العودة مطلوب."];
    else if (
      (leave?.start_date && returnedOn < leave.start_date) ||
      (leave?.end_date && returnedOn > leave.end_date)
    )
      e.returned_on = ["يجب أن يقع تاريخ العودة ضمن فترة الإجازة."];
    if (reason.trim().length > MAX_REASON)
      e.reason = [`السبب يجب ألا يتجاوز ${MAX_REASON} حرفاً.`];
    return e;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving || result) return;

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    const payload = { returned_on: returnedOn };
    if (reason.trim()) payload.reason = reason.trim();

    setSaving(true);
    setErrors({});
    try {
      const response = await api.post(
        `/leave/requests/${leave.id}/return-to-work`,
        payload
      );
      const data = response.data.data;
      toastNotify(response.data.message, "success");
      setResult({
        message: response.data.message,
        daysReturned: data?.days_returned,
        balance: data?.balance,
      });
      onDone?.(data);
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors(parsed.errors || { _general: [parsed.message] });
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field) => errors?.[field]?.[0];

  // Back on the first day cancels the leave instead of shortening it — say so
  // before the click, since it cannot be undone from here.
  const cancelsLeave =
    Boolean(leave?.start_date) && returnedOn === leave.start_date;

  return (
    <Modal
      show={show}
      onHide={handleCancel}
      keyboard={false}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">العودة إلى العمل</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <LeaveSummary leave={leave} />

          {result ? (
            <>
              <Alert variant="success" className="mb-0 py-2 px-3" role="status">
                {result.message}
                {result.daysReturned > 0 && (
                  <div className="small">
                    أُعيد {result.daysReturned} يوم إلى الرصيد.
                  </div>
                )}
                <BalanceNote balance={result.balance} />
              </Alert>
              <button
                type="button"
                className="btn btn-light fw-md w-100"
                onClick={onHide}
              >
                إغلاق
              </button>
            </>
          ) : (
            <>
              <div>
                <Form.Label htmlFor="rtw-returned-on">تاريخ العودة *</Form.Label>
                <Form.Control
                  id="rtw-returned-on"
                  type="date"
                  min={leave?.start_date || undefined}
                  max={leave?.end_date || undefined}
                  value={returnedOn}
                  onChange={(e) => {
                    setReturnedOn(e.target.value);
                    setErrors((prev) => ({ ...prev, returned_on: null, _general: null }));
                  }}
                  isInvalid={!!fieldError("returned_on")}
                  disabled={saving}
                  autoFocus
                />
                <div className="text-muted small mt-1">
                  تُقصَّر الإجازة لتنتهي في اليوم السابق، وتُحرَّر الأيام التي بعدها
                  للحضور.
                </div>
                {fieldError("returned_on") && (
                  <div className="text-danger small mt-1">
                    {fieldError("returned_on")}
                  </div>
                )}
              </div>

              {cancelsLeave && (
                <Alert variant="warning" className="mb-0 py-2 px-3">
                  العودة في اليوم الأول من الإجازة تُلغي الإجازة بالكامل.
                </Alert>
              )}

              <div>
                <Form.Label htmlFor="rtw-reason">السبب (اختياري)</Form.Label>
                <Form.Control
                  id="rtw-reason"
                  as="textarea"
                  maxLength={MAX_REASON}
                  style={{ height: "5rem" }}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setErrors((prev) => ({ ...prev, reason: null, _general: null }));
                  }}
                  isInvalid={!!fieldError("reason")}
                  disabled={saving}
                />
                {fieldError("reason") && (
                  <div className="text-danger small mt-1">{fieldError("reason")}</div>
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
                    {saving ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      "تسجيل العودة"
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
            </>
          )}
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default ReturnToWorkModal;
