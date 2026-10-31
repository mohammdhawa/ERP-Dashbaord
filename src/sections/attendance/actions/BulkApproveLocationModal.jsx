/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { Alert, Form, Modal, Spinner } from "react-bootstrap";
import api from "../../../redux/api";
import { parseApiError } from "../../../utils/apiHelpers";
import { bulkApprovalSummary, matchingApprovalPayload, selectedApprovalPayload } from "../locationReview";

const SKIP_LABELS = {
  not_found: "السجل غير موجود",
  out_of_scope: "خارج صلاحية المدير",
  rejected: "السجل مرفوض",
  not_assessed: "لم يُقيّم الموقع",
  already_approved: "معتمد مسبقاً",
};

const BulkApproveLocationModal = ({ show, mode, ids, queryFilters, onHide, onDone }) => {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (show) { setNote(""); setError(""); setResult(null); }
  }, [show, mode]);

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (note.length > 2000) { setError("الملاحظة يجب ألا تتجاوز 2000 حرف."); return; }
    const payload = mode === "selected"
      ? selectedApprovalPayload(ids, note)
      : matchingApprovalPayload(queryFilters, note);
    if (mode === "selected" && (!payload.record_ids.length || ids.length > 100)) {
      setError("اختر من 1 إلى 100 سجل."); return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await api.post("/attendance/records/location-review/approve", payload);
      setResult(bulkApprovalSummary(response.data.data));
      onDone?.();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const canRepeat = mode === "matching" && result?.remaining > 0;
  return (
    <Modal show={show} onHide={saving ? undefined : onHide} centered dir="rtl">
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title as="h6">اعتماد مراجعات الموقع</Modal.Title></Modal.Header>
        <Modal.Body>
          <p>{mode === "selected"
            ? `سيُفحص ${ids.length} سجل محدد، ويُعتمد الصالح منها ضمن صلاحيتك.`
            : "سيُعتمد حتى 200 سجل بحالة قيد المعالجة ضمن الفلاتر الحالية وصلاحيتك. يمكن تكرار العملية للدفعات المتبقية."}</p>
          <p className="text-muted small">الاعتماد قرار منفصل عن رفض الحضور. السجلات غير المرفوضة تبقى محسوبة.</p>
          {!result && <Form.Group controlId="bulk-location-note">
            <Form.Label>ملاحظة المدير (اختيارية)</Form.Label>
            <Form.Control as="textarea" rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} disabled={saving} />
          </Form.Group>}
          {result && <Alert variant="info" className="mb-0">
            اعتُمد {result.approved}، وتُخطي {result.skipped}.
            {result.remaining != null && <div>المتبقي ضمن الفلتر: {result.remaining}</div>}
            {result.skippedRows.length > 0 && <ul className="mb-0 mt-2">
              {result.skippedRows.map((item) => <li key={item.id}>#{item.id}: {SKIP_LABELS[item.reason] || item.reason}</li>)}
            </ul>}
          </Alert>}
          {error && <Alert variant="danger" className="mt-3 mb-0">{error}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-light" onClick={onHide} disabled={saving}>إغلاق</button>
          {(!result || canRepeat) && <button type="submit" className="btn btn-success" disabled={saving || (mode === "selected" && !ids.length)}>
            {saving && <Spinner size="sm" className="me-1" />}
            {canRepeat ? "معالجة دفعة أخرى" : "اعتماد"}
          </button>}
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default BulkApproveLocationModal;
