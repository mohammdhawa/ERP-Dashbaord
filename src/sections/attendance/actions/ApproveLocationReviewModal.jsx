/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { Alert, Form, Modal, Spinner } from "react-bootstrap";
import api from "../../../redux/api";
import { parseApiError } from "../../../utils/apiHelpers";
import { toastNotify } from "../../../utils";
import LocationReviewEvidence from "../LocationReviewEvidence";

const ApproveLocationReviewModal = ({ show, record, onHide, onDone }) => {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (show) { setNote(""); setError(""); }
  }, [show, record?.id]);

  const submit = async (event) => {
    event.preventDefault();
    if (!record || saving) return;
    if (note.length > 2000) { setError("الملاحظة يجب ألا تتجاوز 2000 حرف."); return; }
    setSaving(true);
    setError("");
    try {
      const response = await api.patch(`/attendance/records/${record.id}/location-review/approve`, note.trim() ? { note: note.trim() } : {});
      toastNotify(response.data.message, "success");
      onDone?.();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={saving ? undefined : onHide} centered dir="rtl">
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title as="h6">اعتماد مراجعة موقع الحضور</Modal.Title></Modal.Header>
        <Modal.Body>
          {record && <div className="border rounded p-2 mb-3">
            <strong>{record.employee?.full_name || `#${record.employee_id}`}</strong>
            <div className="text-muted fs-12">{record.type_label}</div>
            <LocationReviewEvidence review={record.location_review} record={record} />
          </div>}
          <Form.Group controlId="approve-location-note">
            <Form.Label>ملاحظة المدير (اختيارية)</Form.Label>
            <Form.Control as="textarea" rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} disabled={saving} />
          </Form.Group>
          <p className="text-muted small mt-2 mb-0">يبقى التسجيل محسوباً في الحضور ما لم يُرفض بصورة منفصلة.</p>
          {error && <Alert variant="danger" className="mt-3 mb-0">{error}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-light" onClick={onHide} disabled={saving}>إلغاء</button>
          <button type="submit" className="btn btn-success" disabled={saving || !record}>
            {saving && <Spinner size="sm" className="me-1" />} اعتماد
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ApproveLocationReviewModal;
