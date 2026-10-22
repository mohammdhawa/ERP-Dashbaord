import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../../redux/api";
import EmployeePicker from "../../../components/EmployeePicker";
import { hasPermission } from "../../../data/permissionsCatalog";
import { useSelector } from "react-redux";
import {
  buildExcuseForm,
  excuseEndProblem,
  isForceableExcuseRefusal,
  validateAttachments,
} from "../../../redux/actions/leaveParams";
import { todayInDamascus } from "../../attendance/recordFilters";
import { parseApiError } from "../../../utils/apiHelpers";
import { confirmDiscardChanges, toastNotify } from "../../../utils";

// تسجيل عذر — POST /leave/excuses (API doc §16.5). HR records an absence that
// already happened; it is approved at once, with no chain. Since 2026-10-20 the
// server refuses an end date after today, so the date inputs stop at today
// and the form says so before sending.
//
// THE FORCE FLOW. A deducting type past the employee's balance is refused with
// a 422 that HR may override. That one refusal (isForceableExcuseRefusal) is
// shown inline with «تسجيل رغم ذلك» / «إلغاء»; confirming resends the SAME
// form with force. Every other refusal — including «للموظف حضور مسجّل في بعض
// هذه الأيام…», which force never overrides — is an ordinary error and never
// offers it. Editing any field withdraws the prompt: it was about the values
// that were refused.
//
// `initial` ({ employee_id?, start_date?, end_date? }) prefills from the screen
// that opened the modal. Without hr.employees.view there is no picker, so the
// form is only usable with an employee prefilled.

const MAX_REASON = 2000;

const emptyForm = (initial) => ({
  employee_id: initial?.employee_id ?? "",
  leave_type_id: "",
  start_date: initial?.start_date || "",
  end_date: initial?.end_date || "",
  reason: "",
});

const ExcuseFormModal = ({ show, onHide, onSaved, initial }) => {
  const { permissions } = useSelector((state) => state.auth);
  const hasPicker = hasPermission(permissions, "hr.employees.view");

  const [form, setForm] = useState(emptyForm(initial));
  const [initialForm, setInitialForm] = useState(emptyForm(initial));
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [forcePrompt, setForcePrompt] = useState(null); // the server's message
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
        params: { for: "excuses" },
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
      const values = emptyForm(initial);
      setForm(values);
      setInitialForm(values);
      setFiles([]);
      setErrors({});
      setForcePrompt(null);
      loadTypes();
    } else {
      // A read still in flight must not land in a closed modal.
      typesSeq.current += 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, initial?.employee_id, initial?.start_date, initial?.end_date]);

  const isDirty =
    files.length > 0 ||
    Object.keys(form).some((key) => form[key] !== initialForm[key]);

  const handleCancel = async () => {
    if (saving) return;
    if (!isDirty) {
      onHide();
      return;
    }
    if (await confirmDiscardChanges()) onHide();
  };

  const touch = (field) => {
    setErrors((prev) => ({ ...prev, [field]: null, _general: null }));
    setForcePrompt(null);
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    touch(field);
  };

  const selectedType = types.find((t) => String(t.id) === String(form.leave_type_id));
  const reasonRequired = Boolean(selectedType?.requires_reason);

  const onFilesChange = (event) => {
    const picked = Array.from(event.target.files || []);
    const problem = validateAttachments(picked);
    setFiles(problem ? [] : picked);
    setErrors((prev) => ({ ...prev, attachments: problem ? [problem] : null }));
    setForcePrompt(null);
    // A refused pick is cleared from the input too, or the same files could
    // not be picked again after fixing them.
    if (problem) event.target.value = "";
  };

  const validate = () => {
    const e = {};
    if (form.employee_id === "" || form.employee_id === null)
      e.employee_id = ["الموظف مطلوب."];
    if (!form.leave_type_id) e.leave_type_id = ["نوع العذر مطلوب."];
    if (!form.start_date) e.start_date = ["تاريخ البداية مطلوب."];
    if (!form.end_date) e.end_date = ["تاريخ النهاية مطلوب."];
    else if (form.start_date && form.end_date < form.start_date)
      e.end_date = ["تاريخ النهاية يجب ألا يسبق تاريخ البداية."];
    else if (excuseEndProblem(form.end_date, todayInDamascus()))
      e.end_date = [excuseEndProblem(form.end_date, todayInDamascus())];
    const reason = form.reason.trim();
    if (reasonRequired && !reason) e.reason = ["نوع العذر المختار يتطلب ذكر السبب."];
    else if (reason.length > MAX_REASON)
      e.reason = [`السبب يجب ألا يتجاوز ${MAX_REASON} حرفاً.`];
    const fileProblem = validateAttachments(files);
    if (fileProblem) e.attachments = [fileProblem];
    return e;
  };

  const submit = async ({ force }) => {
    setSaving(true);
    setErrors({});
    setForcePrompt(null);
    try {
      // The default JSON content type would make axios flatten the FormData to
      // JSON and drop the files; naming multipart lets the browser add the
      // boundary.
      const response = await api.post(
        "/leave/excuses",
        buildExcuseForm({ ...form, attachments: files }, { force }),
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toastNotify(response.data.message, "success");
      onSaved?.(response.data.data);
    } catch (err) {
      const parsed = parseApiError(err);
      if (!force && isForceableExcuseRefusal(parsed)) {
        setForcePrompt(parsed.message);
      } else {
        // A 422 field bag where there is one; otherwise the message on its own.
        // A refusal on a forced resend is plain too — force is not offered twice.
        setErrors(parsed.errors || { _general: [parsed.message] });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (saving || forcePrompt) return;

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    submit({ force: false });
  };

  const fieldError = (field) => errors?.[field]?.[0];
  // Laravel reports a bad file as attachments.N; show the first of any.
  const attachmentsError =
    fieldError("attachments") ||
    Object.keys(errors || {})
      .filter((key) => key.startsWith("attachments.") && errors[key]?.[0])
      .map((key) => errors[key][0])[0];

  const noEmployee = !hasPicker && !initial?.employee_id;

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
        <Modal.Title as="h6">تسجيل عذر</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <Row className="g-3">
            <Col sm={12}>
              <Form.Label htmlFor="exc-employee">الموظف *</Form.Label>
              {hasPicker ? (
                <EmployeePicker
                  inputId="exc-employee"
                  value={form.employee_id}
                  onChange={(value) => setField("employee_id", value)}
                  isDisabled={saving}
                />
              ) : initial?.employee_id ? (
                <div>موظف #{initial.employee_id}</div>
              ) : (
                <Alert variant="warning" className="mb-0 py-2 px-3">
                  لا تملك صلاحية عرض الموظفين لاختيار موظف؛ افتح هذا النموذج
                  من شاشة الموظف أو من سجل الحضور.
                </Alert>
              )}
              {fieldError("employee_id") && (
                <div className="text-danger small mt-1">
                  {fieldError("employee_id")}
                </div>
              )}
            </Col>

            <Col sm={12}>
              <Form.Label htmlFor="exc-type">نوع العذر *</Form.Label>
              <Form.Select
                id="exc-type"
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
                    ? "يُخصم من رصيد إجازات الموظف."
                    : "لا يُخصم من رصيد إجازات الموظف."}
                </div>
              )}
              {fieldError("leave_type_id") && (
                <div className="text-danger small mt-1">
                  {fieldError("leave_type_id")}
                </div>
              )}
            </Col>

            <Col sm={12} md={6}>
              <Form.Label htmlFor="exc-start">من *</Form.Label>
              <Form.Control
                id="exc-start"
                type="date"
                // An excuse covers days that already happened (§16.5).
                max={todayInDamascus()}
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
              <Form.Label htmlFor="exc-end">إلى *</Form.Label>
              <Form.Control
                id="exc-end"
                type="date"
                min={form.start_date || undefined}
                max={todayInDamascus()}
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
              <Form.Label htmlFor="exc-reason">
                السبب{reasonRequired ? " *" : ""}
              </Form.Label>
              <Form.Control
                id="exc-reason"
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
              <Form.Label htmlFor="exc-files">المرفقات (اختياري)</Form.Label>
              <Form.Control
                id="exc-files"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
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
            يُعتمد العذر فوراً دون مسار اعتماد، ويُخطَر الموظف به.
          </div>

          {forcePrompt && (
            <Alert variant="warning" className="mb-0 py-2 px-3" role="alert">
              <div className="mb-2">{forcePrompt}</div>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-warning btn-sm"
                  onClick={() => submit({ force: true })}
                  disabled={saving}
                >
                  تسجيل رغم ذلك
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setForcePrompt(null)}
                  disabled={saving}
                >
                  إلغاء
                </button>
              </div>
            </Alert>
          )}

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
                disabled={saving || noEmployee || Boolean(forcePrompt)}
              >
                {saving ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "تسجيل العذر"
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

export default ExcuseFormModal;
