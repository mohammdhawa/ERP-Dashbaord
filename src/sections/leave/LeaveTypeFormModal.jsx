import React, { useEffect, useMemo, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDiscardChanges, toastNotify } from "../../utils";

// Create / edit one leave type (API doc §16.1).
//
// CREATE sends every field. EDIT sends only what changed: a PATCH that repeats
// untouched values buys nothing and, for the two unique names, can trip a
// uniqueness check against the row's own value on a stale copy. `code` is
// read-only on edit — a type keeps its own code for life, because legacy text
// and reports resolve the type by it.

const CODE_PATTERN = /^[a-z0-9_]+$/;

const emptyForm = {
  code: "",
  name_ar: "",
  name_en: "",
  deducts_balance: false,
  for_requests: true,
  for_excuses: true,
  requires_reason: false,
  requires_attachment: false,
  is_active: true,
};

const formFromType = (type) =>
  type
    ? {
        code: type.code || "",
        name_ar: type.name_ar || "",
        name_en: type.name_en || "",
        deducts_balance: Boolean(type.deducts_balance),
        for_requests: Boolean(type.for_requests),
        for_excuses: Boolean(type.for_excuses),
        requires_reason: Boolean(type.requires_reason),
        requires_attachment: Boolean(type.requires_attachment),
        is_active: Boolean(type.is_active),
      }
    : emptyForm;

// name_en is nullable: an emptied box means "no English name", not "".
const normalise = (form) => ({
  code: form.code.trim(),
  name_ar: form.name_ar.trim(),
  name_en: form.name_en.trim() || null,
  deducts_balance: Boolean(form.deducts_balance),
  for_requests: Boolean(form.for_requests),
  for_excuses: Boolean(form.for_excuses),
  requires_reason: Boolean(form.requires_reason),
  requires_attachment: Boolean(form.requires_attachment),
  is_active: Boolean(form.is_active),
});

const SWITCHES = [
  { field: "for_requests", label: "متاح في طلبات الموظفين" },
  { field: "for_excuses", label: "متاح في أعذار الموارد البشرية" },
  { field: "requires_reason", label: "يتطلب سبباً" },
  { field: "requires_attachment", label: "يتطلب مرفقاً" },
];

const LeaveTypeFormModal = ({ show, type = null, onHide, onSaved }) => {
  const isEdit = Boolean(type);

  const [form, setForm] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      const values = formFromType(type);
      setForm(values);
      setInitialForm(values);
      setErrors({});
    }
  }, [show, type]);

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
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const next = normalise(form);
    const clientErrors = {};
    if (!isEdit) {
      if (!next.code) clientErrors.code = ["الرمز مطلوب."];
      else if (next.code.length > 50)
        clientErrors.code = ["الرمز يجب ألا يتجاوز 50 حرفاً."];
      else if (!CODE_PATTERN.test(next.code))
        clientErrors.code = [
          "الرمز يجب أن يتكون من أحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط.",
        ];
    }
    if (!next.name_ar) clientErrors.name_ar = ["الاسم بالعربية مطلوب."];
    else if (next.name_ar.length > 100)
      clientErrors.name_ar = ["الاسم بالعربية يجب ألا يتجاوز 100 حرف."];
    if (next.name_en && next.name_en.length > 100)
      clientErrors.name_en = ["الاسم بالإنجليزية يجب ألا يتجاوز 100 حرف."];
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    let payload = next;
    if (isEdit) {
      const before = normalise(initialForm);
      payload = {};
      // `code` is never sent on edit, changed or not.
      Object.keys(next).forEach((key) => {
        if (key !== "code" && next[key] !== before[key]) payload[key] = next[key];
      });
      if (Object.keys(payload).length === 0) {
        onHide();
        return;
      }
    }

    setSaving(true);
    setErrors({});
    try {
      const response = isEdit
        ? await api.patch(`/leave/types/${type.id}`, payload)
        : await api.post("/leave/types", payload);
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

  const renderSwitch = ({ field, label }) => (
    <Col sm={12} md={6} key={field}>
      <Form.Check
        type="switch"
        id={`lt-${field}`}
        label={label}
        checked={form[field]}
        onChange={(e) => setField(field, e.target.checked)}
      />
      {fieldError(field) && (
        <div className="text-danger small mt-1">{fieldError(field)}</div>
      )}
    </Col>
  );

  return (
    <Modal
      show={show}
      size="lg"
      onHide={handleCancel}
      keyboard={false}
      centered
      backdrop="static"
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          {isEdit ? `تعديل نوع الإجازة: ${type?.name_ar}` : "إضافة نوع إجازة"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <Row className="g-3">
            <Col sm={12} md={4}>
              <Form.Label htmlFor="lt-code">الرمز {!isEdit && "*"}</Form.Label>
              <Form.Control
                id="lt-code"
                type="text"
                dir="ltr"
                maxLength={50}
                placeholder="study_leave"
                value={form.code}
                onChange={(e) => setField("code", e.target.value)}
                isInvalid={!!fieldError("code")}
                readOnly={isEdit}
                disabled={isEdit}
                autoFocus={!isEdit}
              />
              {isEdit ? (
                <div className="text-muted small mt-1">
                  لا يتغيّر رمز النوع بعد إنشائه.
                </div>
              ) : (
                <div className="text-muted small mt-1">
                  أحرف إنجليزية صغيرة وأرقام وشرطة سفلية.
                </div>
              )}
              {fieldError("code") && (
                <div className="text-danger small mt-1">{fieldError("code")}</div>
              )}
            </Col>
            <Col sm={12} md={4}>
              <Form.Label htmlFor="lt-name-ar">الاسم بالعربية *</Form.Label>
              <Form.Control
                id="lt-name-ar"
                type="text"
                maxLength={100}
                value={form.name_ar}
                onChange={(e) => setField("name_ar", e.target.value)}
                isInvalid={!!fieldError("name_ar")}
                autoFocus={isEdit}
              />
              {fieldError("name_ar") && (
                <div className="text-danger small mt-1">
                  {fieldError("name_ar")}
                </div>
              )}
            </Col>
            <Col sm={12} md={4}>
              <Form.Label htmlFor="lt-name-en">الاسم بالإنجليزية</Form.Label>
              <Form.Control
                id="lt-name-en"
                type="text"
                dir="ltr"
                maxLength={100}
                value={form.name_en}
                onChange={(e) => setField("name_en", e.target.value)}
                isInvalid={!!fieldError("name_en")}
              />
              {fieldError("name_en") && (
                <div className="text-danger small mt-1">
                  {fieldError("name_en")}
                </div>
              )}
            </Col>

            <Col sm={12}>
              <Form.Check
                type="switch"
                id="lt-deducts_balance"
                label="يُخصم من رصيد الإجازات"
                checked={form.deducts_balance}
                onChange={(e) => setField("deducts_balance", e.target.checked)}
              />
              <div className="text-muted small mt-1">
                تغيير هذا الخيار لا يغيّر الإجازات المقدَّمة سابقاً؛ فكل إجازة
                تحتفظ بالسياسة التي قُدِّمت بموجبها.
              </div>
              {fieldError("deducts_balance") && (
                <div className="text-danger small mt-1">
                  {fieldError("deducts_balance")}
                </div>
              )}
            </Col>

            {SWITCHES.map(renderSwitch)}
            {renderSwitch({ field: "is_active", label: "فعّال" })}
          </Row>

          {errors._general && (
            <Alert variant="danger" className="mb-0 py-2 px-3">
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
                ) : isEdit ? (
                  "حفظ التعديلات"
                ) : (
                  "إضافة"
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

export default LeaveTypeFormModal;
