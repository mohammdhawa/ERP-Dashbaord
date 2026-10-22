import React, { useEffect, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../../redux/api";
import { parseApiError } from "../../../utils/apiHelpers";
import { confirmDiscardChanges, toastNotify } from "../../../utils";
import BalanceNote from "./BalanceNote";
import LeaveSummary from "./LeaveSummary";

// التراجع عن العذر — DELETE /leave/excuses/{id} (API doc §16.6). For an excuse
// HR filed in error; the row is kept as cancelled, the days become absences
// again and a deducted day returns to the balance.
//
// `leave` may be partial (see LeaveSummary): only `id` is needed.
//
// After success the modal stays open on a result view (the server's message and
// the balance it left), and `onDone` fires at once so the caller's screen is
// already current behind it. Closing is the user's «إغلاق» → onHide.

const MAX_REASON = 2000;

const UndoExcuseModal = ({ show, leave, onHide, onDone }) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { message, balance } once done

  useEffect(() => {
    if (show) {
      setReason("");
      setError(null);
      setResult(null);
    }
  }, [show, leave?.id]);

  const isDirty = reason.trim() !== "";

  const handleCancel = async () => {
    if (saving) return;
    if (result || !isDirty) {
      onHide();
      return;
    }
    if (await confirmDiscardChanges()) onHide();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving || result) return;

    const text = reason.trim();
    if (text.length > MAX_REASON) {
      setError(`السبب يجب ألا يتجاوز ${MAX_REASON} حرفاً.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // axios sends a DELETE body through `data`; an empty reason is left out
      // rather than sent blank.
      const response = await api.delete(`/leave/excuses/${leave.id}`, {
        data: text ? { reason: text } : {},
      });
      const data = response.data.data;
      toastNotify(response.data.message, "success");
      setResult({ message: response.data.message, balance: data?.balance });
      onDone?.(data);
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.errors?.reason?.[0] || parsed.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleCancel}
      keyboard={false}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">التراجع عن العذر</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <LeaveSummary leave={leave} />

          {result ? (
            <>
              <Alert variant="success" className="mb-0 py-2 px-3" role="status">
                {result.message}
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
                <Form.Label htmlFor="undo-excuse-reason">السبب (اختياري)</Form.Label>
                <Form.Control
                  id="undo-excuse-reason"
                  as="textarea"
                  maxLength={MAX_REASON}
                  style={{ height: "5rem" }}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError(null);
                  }}
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div className="text-muted fs-11">
                يعود الغياب كما كان، ويُعاد اليوم المخصوم إلى الرصيد، ويُخطَر
                الموظف. يبقى السجل محفوظاً بحالة «ملغاة».
              </div>

              {error && (
                <Alert variant="danger" className="mb-0 py-2 px-3" role="alert">
                  {error}
                </Alert>
              )}

              <Row className="g-2">
                <Col sm={12} md={6}>
                  <button
                    className="btn btn-danger fw-md w-100"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      "التراجع عن العذر"
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

export default UndoExcuseModal;
