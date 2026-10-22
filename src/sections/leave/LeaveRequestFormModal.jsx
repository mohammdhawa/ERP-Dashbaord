import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../redux/api";
import {
  buildLeaveRequestForm,
  validateAttachments,
} from "../../redux/actions/leaveParams";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDiscardChanges, toastNotify } from "../../utils";
import BalanceNote from "./actions/BalanceNote";

// طلب إجازة — POST /me/leave-requests (API doc §16.3). The employee's own
// request; it goes through the approvals engine on a chain the SERVER resolves
// (no approver is chosen here). Shaped after ExcuseFormModal, minus the
// employee picker and the force flow: an employee's request is never forced.
//
// Types come from GET /leave/types?for=requests, read each time the modal
// opens so a type HR retired meanwhile is not offered. The reason and the
// files are required exactly when the chosen type says so
// (requires_reason / requires_attachment); the server re-checks both.
//
// `balance` is the card's figures for the year it shows, used only for the
// hint under a deducting type.

const MAX_REASON = 2000;

const EMPTY = { leave_type_id: "", start_date: "", end_date: "", reason: "" };

const LeaveRequestFormModal = ({ show, onHide, onSaved, balance }) => {
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  // Bumped to remount the file input, which cannot be cleared through React.
  const [fileInputKey, setFileInputKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [types, setTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesError, setTypesError] = useState(null);
  const typesSeq = useRef(0);

  const loadTypes = useCallback(async () => {
    const mine = ++typesSeq.current;
    setTypesLoading(true);
    setTypesError(null);
    try {
      const response = await api.get("/leave/types", {
        params: { for: "requests" },
      });
      if (mine !== typesSeq.current) return;
      setTypes(response.data.data || []);
    } catch (err) {
      if (mine !== typesSeq.current) return;
      setTypesError(parseApiError(err).message);
    } finally {
      if (mine === typesSeq.current) setTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (show) {
      setForm(EMPTY);
      setFiles([]);
      setFileInputKey((k) => k + 1);
      setErrors({});
      loadTypes();
    } else {
      // A read still in flight must not land in a closed modal.
      typesSeq.current += 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const isDirty =
    files.length > 0 || Object.keys(form).some((key) => form[key] !== EMPTY[key]);

  const handleCancel = async () => {
    if (saving) return;
    if (!isDirty) {
      onHide();
      return;
    }
    if (await confirmDiscardChanges()) onHide();
  };

  const touch = (field) =>
    setErrors((prev) => ({ ...prev, [field]: null, _general: null }));

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    touch(field);
  };

  const selectedType = types.find((t) => String(t.id) === String(form.leave_type_id));
  const reasonRequired = Boolean(selectedType?.requires_reason);
  const attachmentRequired = Boolean(selectedType?.requires_attachment);

  const onFilesChange = (event) => {
    const picked = Array.from(event.target.files || []);
    const problem = validateAttachments(picked);
    setFiles(problem ? [] : picked);
    setErrors((prev) => ({
      ...prev,
      attachments: problem ? [problem] : null,
      _general: null,
    }));
    // A refused pick is cleared from the input too, or the same files could
    // not be picked again after fixing them.
    if (problem) event.target.value = "";
  };

  const validate = () => {
    const e = {};
    if (!form.leave_type_id) e.leave_type_id = ["نوع الإجازة مطلوب."];
    if (!form.start_date) e.start_date = ["تاريخ البداية مطلوب."];
    if (!form.end_date) e.end_date = ["تاريخ النهاية مطلوب."];
    else if (form.start_date && form.end_date < form.start_date)
      e.end_date = ["تاريخ النهاية يجب ألا يسبق تاريخ البداية."];
    const reason = form.reason.trim();
    if (reasonRequired && !reason) e.reason = ["نوع الإجازة المختار يتطلب ذكر السبب."];
    else if (reason.length > MAX_REASON)
      e.reason = [`السبب يجب ألا يتجاوز ${MAX_REASON} حرفاً.`];
    const fileProblem = validateAttachments(files, { required: attachmentRequired });
    if (fileProblem) e.attachments = [fileProblem];
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
    try {
      // The default JSON content type would make axios flatten the FormData to
      // JSON and drop the files; naming multipart lets the browser add the
      // boundary.
      const response = await api.post(
        "/me/leave-requests",
        buildLeaveRequestForm({ ...form, attachments: files }),
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toastNotify(response.data.message, "success");
      // { leave_request, balance } — the balance is for the request's start year.
      onSaved?.(response.data.data);
    } catch (err) {
      const parsed = parseApiError(err);
      // A 422 field bag where there is one; every other refusal (a full
      // balance, an overlap, a vacant manager post) is a message on its own.
      setErrors(parsed.errors || { _general: [parsed.message] });
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field) => errors?.[field]?.[0];
  // Laravel reports a bad file as attachments.N; show the first of any.
  const attachmentsError =
    fieldError("attachments") ||
    Object.keys(errors || {})
      .filter((key) => key.startsWith("attachments.") && errors[key]?.[0])
      .map((key) => errors[key][0])[0];

  return (
    <Modal
      show={show}
      size="lg"
      onHide={handleCancel}
      keyboard={false}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">طلب إجازة</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <Row className="g-3">
            <Col sm={12}>
              <Form.Label htmlFor="lr-type">نوع الإجازة *</Form.Label>
              <Form.Select
                id="lr-type"
                value={form.leave_type_id}
                onChange={(e) => setField("leave_type_id", e.target.value)}
                isInvalid={!!fieldError("leave_type_id")}
                disabled={saving || typesLoading || Boolean(typesError)}
              >
                <option value="">
                  {typesLoading ? "جارٍ التحميل..." : "اختر النوع"}
                </option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name_ar}
                  </option>
                ))}
              </Form.Select>
              {typesError && (
                <div role="alert" className="mt-1">
                  <span className="text-danger small">{typesError}</span>{" "}
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={loadTypes}
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}
              {selectedType && (
                <div className="text-muted small mt-1">
                  {selectedType.deducts_balance
                    ? "يُخصم من رصيد إجازاتك."
                    : "لا يُخصم من رصيد إجازاتك."}
                </div>
              )}
              {selectedType?.deducts_balance && <BalanceNote balance={balance} />}
              {fieldError("leave_type_id") && (
                <div className="text-danger small mt-1">
                  {fieldError("leave_type_id")}
                </div>
              )}
            </Col>

            <Col sm={12} md={6}>
              <Form.Label htmlFor="lr-start">من *</Form.Label>
              <Form.Control
                id="lr-start"
                type="date"
                value={form.start_date}
                onChange={(e) => setField("start_date", e.target.value)}
                isInvalid={!!fieldError("start_date")}
                disabled={saving}
              />
              {fieldError("start_date") && (
                <div className="text-danger small mt-1">
                  {fieldError("start_date")}
                </div>
              )}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="lr-end">إلى *</Form.Label>
              <Form.Control
                id="lr-end"
                type="date"
                min={form.start_date || undefined}
                value={form.end_date}
                onChange={(e) => setField("end_date", e.target.value)}
                isInvalid={!!fieldError("end_date")}
                disabled={saving}
              />
              {fieldError("end_date") && (
                <div className="text-danger small mt-1">
                  {fieldError("end_date")}
                </div>
              )}
            </Col>

            <Col sm={12}>
              <Form.Label htmlFor="lr-reason">
                السبب{reasonRequired ? " *" : ""}
              </Form.Label>
              <Form.Control
                id="lr-reason"
                as="textarea"
                maxLength={MAX_REASON}
                style={{ height: "5rem" }}
                value={form.reason}
                onChange={(e) => setField("reason", e.target.value)}
                isInvalid={!!fieldError("reason")}
                disabled={saving}
              />
              {fieldError("reason") && (
                <div className="text-danger small mt-1">{fieldError("reason")}</div>
              )}
            </Col>

            <Col sm={12}>
              <Form.Label htmlFor="lr-files">
                المرفقات{attachmentRequired ? " *" : " (اختياري)"}
              </Form.Label>
              <Form.Control
                key={fileInputKey}
                id="lr-files"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={onFilesChange}
                isInvalid={!!attachmentsError}
                disabled={saving}
              />
              <div className="text-muted small mt-1">
                حتى 5 ملفات (PDF أو JPG أو PNG)، بحجم أقصاه 10 ميغابايت للملف.
                اختيار ملفات جديدة يستبدل السابقة.
              </div>
              {attachmentsError && (
                <div className="text-danger small mt-1">{attachmentsError}</div>
              )}
            </Col>
          </Row>

          <div className="text-muted fs-11">
            يُرسل الطلب إلى مديرك المباشر ثم إلى الموارد البشرية، وتجده في
            قائمة طلباتك فور تقديمه.
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
                {saving ? <Spinner animation="border" size="sm" /> : "تقديم الطلب"}
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

export default LeaveRequestFormModal;
