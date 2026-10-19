import React, { useEffect, useState } from "react";
import { Col, Form, Modal, Row, Spinner } from "react-bootstrap";

const COPY = {
  approve: {
    title: "الموافقة على الطلب",
    submit: "موافقة",
    variant: "btn-success",
  },
  reject: {
    title: "رفض الطلب",
    submit: "رفض",
    variant: "btn-danger",
  },
};

// The note on an approve / reject (API doc §15.4: optional, up to 500). The
// parent performs the call and decides when to close; this modal only collects
// the note, shows the saving state and the server's field error. `onSubmit`
// rejects with the parsed API error ({ message, errors }).
const DecisionModal = ({ show, mode, onHide, onSubmit }) => {
  const copy = COPY[mode] || COPY.approve;
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (show) {
      setNote("");
      setErrors({});
    }
  }, [show, mode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      await onSubmit(note.trim());
    } catch (parsed) {
      // The parent has already toasted the message; keep the modal open for a
      // field error so the note can be corrected.
      if (parsed?.errors) setErrors(parsed.errors);
    } finally {
      setSaving(false);
    }
  };

  const noteError = errors?.note?.[0];

  return (
    <Modal
      show={show}
      onHide={saving ? undefined : onHide}
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton={!saving}>
        <Modal.Title as="h6">{copy.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div>
            <Form.Label htmlFor="decision-note">ملاحظة (اختياري)</Form.Label>
            <Form.Control
              id="decision-note"
              as="textarea"
              maxLength={500}
              style={{ height: "6rem" }}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setErrors({});
              }}
              isInvalid={!!noteError}
              autoFocus
            />
            {noteError && (
              <div className="text-danger small mt-1">{noteError}</div>
            )}
          </div>

          <Row className="g-2">
            <Col sm={12} md={6}>
              <button
                className={`btn ${copy.variant} fw-md w-100`}
                type="submit"
                disabled={saving}
              >
                {saving ? <Spinner animation="border" size="sm" /> : copy.submit}
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

export default DecisionModal;
