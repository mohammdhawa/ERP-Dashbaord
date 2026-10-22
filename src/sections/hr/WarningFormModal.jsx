import React, { useEffect, useMemo, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import {
  createWarning,
  updateWarning,
} from "../../redux/actions/warningsActions";
import { hasPermission } from "../../data/permissionsCatalog";
import { useResourceOptions } from "../departments/useResourceOptions";
import { confirmDiscardChanges } from "../../utils";

// `issued_by` is an EMPLOYEE id, not a user id: a line manager may have no
// login at all, so the picker is over /hr/employees and never over the user
// accounts list.
const employeeToOption = (e) => ({
  value: e.id,
  label: e.employee_number
    ? `${e.full_name || `موظف #${e.id}`} — ${e.employee_number}`
    : e.full_name || `موظف #${e.id}`,
});

const todayString = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};

const emptyForm = {
  type: "",
  issued_on: "",
  number: "",
  issued_by: "",
  notes: "",
};

const WarningFormModal = ({
  open,
  close,
  employee,
  warning,
  page,
  itemsPerPage,
}) => {
  const dispatch = useDispatch();
  const { saving } = useSelector((state) => state.warnings);
  const { permissions } = useSelector((state) => state.auth);
  const isEdit = Boolean(warning);

  const canReadEmployees = hasPermission(permissions, "hr.employees.view");
  const issuers = useResourceOptions(
    "/hr/employees",
    employeeToOption,
    open && canReadEmployees
  );

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [initialForm, setInitialForm] = useState(emptyForm);

  useEffect(() => {
    if (open) {
      const values = warning
        ? {
            type: warning.type || "",
            issued_on: warning.issued_on || "",
            number: warning.number || "",
            issued_by: warning.issued_by ?? "",
            notes: warning.notes || "",
          }
        : emptyForm;
      setForm(values);
      setInitialForm(values);
      setErrors({});
    }
  }, [open, warning]);

  const isDirty = useMemo(
    () => Object.keys(form).some((key) => form[key] !== initialForm[key]),
    [form, initialForm]
  );

  // Closing discards a disciplinary record someone was mid-way through writing,
  // including its notes field. Untouched forms still close instantly.
  const handleCancel = async () => {
    if (!isDirty) {
      close(false);
      return;
    }
    if (await confirmDiscardChanges()) close(false);
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  // Recomputed every render, NOT memoised on mount. A tab left open
  // overnight otherwise keeps yesterday as both the input max and the
  // future-date boundary, and rejects today's date as being in the
  // future. The call is a Date and three string ops.
  const today = todayString();

  const validate = () => {
    const e = {};
    if (!form.type.trim()) e.type = ["نوع الإنذار مطلوب."];
    if (!form.issued_on) e.issued_on = ["تاريخ الإصدار مطلوب."];
    else if (form.issued_on > today)
      e.issued_on = ["لا يمكن أن يكون تاريخ الإصدار في المستقبل."];
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

    // `sequence` is computed server-side from the live rows and is NEVER sent.
    const payload = {
      type: form.type.trim(),
      issued_on: form.issued_on,
      number: form.number.trim() || null,
      issued_by: form.issued_by === "" ? null : Number(form.issued_by),
      notes: form.notes.trim() || null,
    };

    try {
      if (isEdit) {
        // NOT nested: the warning is addressed at /hr/warnings/{id}.
        await dispatch(
          updateWarning(warning.id, payload, employee.id, page, itemsPerPage)
        );
      } else {
        await dispatch(
          createWarning(employee.id, payload, page, itemsPerPage)
        );
      }
      close(true);
    } catch (parsed) {
      setErrors(parsed.errors || { _general: [parsed.message] });
    }
  };

  const fieldError = (field) => errors?.[field]?.[0];

  return (
    <Modal
      show={open}
      size="lg"
      onHide={handleCancel}
      keyboard={false}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          {isEdit ? "تعديل الإنذار" : "إصدار إنذار"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <Row className="g-3">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="wrn-type">نوع الإنذار *</Form.Label>
              <Form.Control
                id="wrn-type"
                type="text"
                maxLength={255}
                placeholder="مثال: تأخر متكرر"
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
                isInvalid={!!fieldError("type")}
                autoFocus
              />
              {fieldError("type") && (
                <div className="text-danger small mt-1">
                  {fieldError("type")}
                </div>
              )}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="wrn-issued-on">تاريخ الإصدار *</Form.Label>
              <Form.Control
                id="wrn-issued-on"
                type="date"
                max={today}
                value={form.issued_on}
                onChange={(e) => setField("issued_on", e.target.value)}
                isInvalid={!!fieldError("issued_on")}
              />
              {fieldError("issued_on") && (
                <div className="text-danger small mt-1">
                  {fieldError("issued_on")}
                </div>
              )}
            </Col>

            <Col sm={12} md={6}>
              <Form.Label htmlFor="wrn-number">رقم كتاب الإنذار</Form.Label>
              <Form.Control
                id="wrn-number"
                type="text"
                maxLength={50}
                dir="ltr"
                placeholder="W-2026-14"
                value={form.number}
                onChange={(e) => setField("number", e.target.value)}
                isInvalid={!!fieldError("number")}
              />
              {fieldError("number") && (
                <div className="text-danger small mt-1">
                  {fieldError("number")}
                </div>
              )}
            </Col>

            <Col sm={12} md={6}>
              <Form.Label htmlFor="wrn-issued-by">جهة الإصدار</Form.Label>
              {canReadEmployees && !issuers.error ? (
                <Select
                  inputId="wrn-issued-by"
                  classNamePrefix="Select2"
                  options={issuers.options}
                  value={
                    issuers.options.find(
                      (o) => o.value === Number(form.issued_by)
                    ) || null
                  }
                  onChange={(opt) => setField("issued_by", opt ? opt.value : "")}
                  isClearable
                  isLoading={issuers.loading}
                  placeholder="اختر الموظف المُصدِر"
                  noOptionsMessage={() => "لا يوجد موظفون"}
                  menuPosition="fixed"
                />
              ) : (
                <>
                  <Form.Control
                    id="wrn-issued-by"
                    type="number"
                    min={1}
                    placeholder="معرّف الموظف"
                    value={form.issued_by}
                    onChange={(e) => setField("issued_by", e.target.value)}
                    isInvalid={!!fieldError("issued_by")}
                  />
                  <div className="text-muted small mt-1">
                    تعذّر تحميل قائمة الموظفين، أدخل المعرّف يدوياً.
                  </div>
                </>
              )}
              <div className="text-muted small mt-1">
                المُصدِر موظف وليس حساب مستخدم — قد لا يملك المدير حساباً على
                النظام.
              </div>
              {fieldError("issued_by") && (
                <div className="text-danger small mt-1">
                  {fieldError("issued_by")}
                </div>
              )}
            </Col>

            <Col sm={12}>
              <Form.Label htmlFor="wrn-notes">ملاحظات</Form.Label>
              <Form.Control
                id="wrn-notes"
                as="textarea"
                maxLength={5000}
                style={{ height: "5rem" }}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                isInvalid={!!fieldError("notes")}
              />
              {fieldError("notes") && (
                <div className="text-danger small mt-1">
                  {fieldError("notes")}
                </div>
              )}
            </Col>
          </Row>

          <div className="text-muted fs-11">
            تسلسل الإنذار يحتسبه النظام من الإنذارات السارية، ولا يُرسل من هنا.
          </div>

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
                  "تسجيل الإنذار"
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

export default WarningFormModal;
