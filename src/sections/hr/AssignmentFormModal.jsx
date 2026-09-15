import React, { useEffect, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { createAssignment } from "../../redux/actions/assignmentsActions";
import { hasPermission } from "../../data/permissionsCatalog";
import { useResourceOptions } from "../departments/useResourceOptions";
import {
  ASSIGNMENT_REASON_OPTIONS,
  GRADE_OPTIONS,
} from "../../data/hrEnums";
import {
  MODE_KEEP,
  MODE_SET,
  MODE_CLEAR,
  buildAssignmentPayload,
  validateAssignmentForm,
} from "./assignmentPayload";

const departmentToOption = (d) => ({
  value: d.id,
  label: d.name || `قسم #${d.id}`,
});
const jobTitleToOption = (t) => ({
  value: t.id,
  label: t.is_active ? t.name : `${t.name} (معطّل)`,
});

// THE THREE-WAY CHOICE that makes this form different from every other one in
// the app: keep (omit) / set / clear (null). A two-state control cannot express
// it — leaving a select empty would be ambiguous between "unchanged" and
// "remove", and guessing wrong either un-assigns someone from their division or
// silently refuses to. The payload rule itself lives in ./assignmentPayload.

const todayString = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};

const emptyForm = {
  from_date: "",
  reason: "",
  notes: "",
  departmentMode: MODE_KEEP,
  department_id: "",
  jobTitleMode: MODE_KEEP,
  job_title_id: "",
  gradeMode: MODE_KEEP,
  organizational_grade: "",
};

// One three-way control: keep / set / clear.
//
// Module scope, not inline: defined inside the component it would be a new
// component type each render, remounting the react-select it wraps and closing
// its menu on every keystroke in the search box.
const CarryControl = ({
  label,
  modeField,
  currentLabel,
  mode,
  onModeChange,
  error,
  children,
}) => (
  <div className="border rounded p-3 h-100">
    <div className="fw-semibold mb-1">{label}</div>
    <div className="text-muted fs-11 mb-2">الحالي: {currentLabel || "بدون"}</div>
    <div className="d-flex flex-column gap-1 mb-2">
      <Form.Check
        type="radio"
        id={`${modeField}-keep`}
        name={modeField}
        label="بدون تغيير (يُرحَّل الحالي)"
        checked={mode === MODE_KEEP}
        onChange={() => onModeChange(MODE_KEEP)}
      />
      <Form.Check
        type="radio"
        id={`${modeField}-set`}
        name={modeField}
        label="تغيير إلى"
        checked={mode === MODE_SET}
        onChange={() => onModeChange(MODE_SET)}
      />
      <Form.Check
        type="radio"
        id={`${modeField}-clear`}
        name={modeField}
        label="إزالة (بدون)"
        checked={mode === MODE_CLEAR}
        onChange={() => onModeChange(MODE_CLEAR)}
      />
    </div>
    {mode === MODE_SET && children}
    {error && <div className="text-danger small mt-1">{error}</div>}
  </div>
);

const AssignmentFormModal = ({
  open,
  close,
  employee,
  currentAssignment,
  page,
  itemsPerPage,
}) => {
  const dispatch = useDispatch();
  const { saving } = useSelector((state) => state.assignments);
  const { permissions } = useSelector((state) => state.auth);

  const canReadDepartments = hasPermission(permissions, "departments.view");
  const canReadJobTitles = hasPermission(permissions, "hr.job_titles.view");

  const departments = useResourceOptions(
    "/departments",
    departmentToOption,
    open && canReadDepartments
  );
  const jobTitles = useResourceOptions(
    "/hr/job-titles",
    jobTitleToOption,
    open && canReadJobTitles
  );

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [open]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  // Recomputed every render, NOT memoised on mount. A tab left open
  // overnight otherwise keeps yesterday as both the input max and the
  // future-date boundary, and rejects today's date as being in the
  // future. The call is a Date and three string ops.
  const today = todayString();

  // A posting dated on or before the current one's start AMENDS it in place
  // rather than stacking a new row, so the user is told before they save.
  const amends =
    form.from_date &&
    currentAssignment?.from_date &&
    form.from_date <= currentAssignment.from_date;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const clientErrors = validateAssignmentForm(form, today);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    const payload = buildAssignmentPayload(form);

    try {
      await dispatch(
        createAssignment(employee.id, payload, page, itemsPerPage)
      );
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
      onHide={() => close(false)}
      keyboard={false}
      centered
      backdrop="static"
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">تسجيل تعيين أو نقل</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <Alert variant="light" className="mb-0 py-2 px-3 fs-12">
            يُغلق هذا التسجيل التعيين الحالي في اليوم السابق لتاريخ البدء، ثم
            يفتح تعييناً جديداً ويُحدِّث بيانات الموظف لتطابقه. الحقول التي
            تتركها «بدون تغيير» تُرحَّل كما هي؛ اختيار «إزالة» إجراء متعمّد
            ومنفصل يعني «بدون وحدة».
          </Alert>

          {amends && (
            <Alert variant="warning" className="mb-0 py-2 px-3 fs-12">
              التاريخ المُدخل يسبق أو يساوي بداية التعيين الحالي
              {currentAssignment?.from_date
                ? ` (${currentAssignment.from_date})`
                : ""}
              ، لذلك سيُعدَّل التعيين الحالي في مكانه بدلاً من إضافة سجل جديد.
            </Alert>
          )}

          <Row className="g-3">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="asg-from-date">تاريخ البدء *</Form.Label>
              <Form.Control
                id="asg-from-date"
                type="date"
                max={today}
                value={form.from_date}
                onChange={(e) => setField("from_date", e.target.value)}
                isInvalid={!!fieldError("from_date")}
              />
              <div className="text-muted small mt-1">
                يمكن أن يكون بأثر رجعي، ولا يمكن أن يكون في المستقبل.
              </div>
              {fieldError("from_date") && (
                <div className="text-danger small mt-1">
                  {fieldError("from_date")}
                </div>
              )}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="asg-reason">السبب *</Form.Label>
              <Select
                inputId="asg-reason"
                classNamePrefix="Select2"
                options={ASSIGNMENT_REASON_OPTIONS}
                value={
                  ASSIGNMENT_REASON_OPTIONS.find(
                    (o) => o.value === Number(form.reason)
                  ) || null
                }
                onChange={(opt) => setField("reason", opt ? opt.value : "")}
                isClearable
                placeholder="اختر السبب"
                menuPosition="fixed"
              />
              <div className="text-muted small mt-1">
                لا يوجد سبب افتراضي — السبب هو ما يميّز الترقية عن إعادة
                الهيكلة في السجل.
              </div>
              {fieldError("reason") && (
                <div className="text-danger small mt-1">
                  {fieldError("reason")}
                </div>
              )}
            </Col>
          </Row>

          <Row className="g-3">
            <Col sm={12} md={4}>
              <CarryControl
                label="الوحدة التنظيمية"
                modeField="departmentMode"
                mode={form.departmentMode}
                onModeChange={(m) => setField("departmentMode", m)}
                error={fieldError("department_id")}
                currentLabel={
                  currentAssignment?.department?.name ||
                  employee?.department?.name
                }
              >
                {canReadDepartments && !departments.error ? (
                  <Select
                    inputId="asg-department"
                    classNamePrefix="Select2"
                    options={departments.options}
                    value={
                      departments.options.find(
                        (o) => o.value === Number(form.department_id)
                      ) || null
                    }
                    onChange={(opt) =>
                      setField("department_id", opt ? opt.value : "")
                    }
                    isLoading={departments.loading}
                    placeholder="اختر الوحدة"
                    menuPosition="fixed"
                  />
                ) : (
                  <Form.Control
                    type="number"
                    min={1}
                    placeholder="معرّف القسم"
                    value={form.department_id}
                    onChange={(e) => setField("department_id", e.target.value)}
                  />
                )}
              </CarryControl>
            </Col>

            <Col sm={12} md={4}>
              <CarryControl
                label="المسمى الوظيفي"
                modeField="jobTitleMode"
                mode={form.jobTitleMode}
                onModeChange={(m) => setField("jobTitleMode", m)}
                error={fieldError("job_title_id")}
                currentLabel={
                  currentAssignment?.job_title?.name ||
                  employee?.job_title?.name
                }
              >
                {canReadJobTitles && !jobTitles.error ? (
                  <Select
                    inputId="asg-job-title"
                    classNamePrefix="Select2"
                    options={jobTitles.options}
                    value={
                      jobTitles.options.find(
                        (o) => o.value === Number(form.job_title_id)
                      ) || null
                    }
                    onChange={(opt) =>
                      setField("job_title_id", opt ? opt.value : "")
                    }
                    isLoading={jobTitles.loading}
                    placeholder="اختر المسمى"
                    menuPosition="fixed"
                  />
                ) : (
                  <Form.Control
                    type="number"
                    min={1}
                    placeholder="معرّف المسمى"
                    value={form.job_title_id}
                    onChange={(e) => setField("job_title_id", e.target.value)}
                  />
                )}
              </CarryControl>
            </Col>

            {/* Ungated: hr.assignments.create is the control, and a promotion
                is usually a grade change and nothing else. */}
            <Col sm={12} md={4}>
              <CarryControl
                label="الدرجة التنظيمية"
                modeField="gradeMode"
                mode={form.gradeMode}
                onModeChange={(m) => setField("gradeMode", m)}
                error={fieldError("organizational_grade")}
                // From the ASSIGNMENT, not the employee. organizational_grade
                // is gated by hr.employees.viewSalary on the employee record
                // and is simply absent without it, so reading it there showed
                // "بدون" to an assignment administrator who is fully entitled
                // to see the grade — the assignment resource exposes it
                // ungated, which is why history and submission already use it.
                currentLabel={
                  currentAssignment?.organizational_grade != null
                    ? String(currentAssignment.organizational_grade)
                    : null
                }
              >
                <Select
                  inputId="asg-grade"
                  classNamePrefix="Select2"
                  options={GRADE_OPTIONS}
                  value={
                    GRADE_OPTIONS.find(
                      (o) => o.value === Number(form.organizational_grade)
                    ) || null
                  }
                  onChange={(opt) =>
                    setField("organizational_grade", opt ? opt.value : "")
                  }
                  placeholder="اختر الدرجة"
                  menuPosition="fixed"
                />
              </CarryControl>
            </Col>
          </Row>

          <div>
            <Form.Label htmlFor="asg-notes">ملاحظات</Form.Label>
            <Form.Control
              id="asg-notes"
              as="textarea"
              maxLength={2000}
              style={{ height: "4rem" }}
              placeholder="مثال: قرار رقم 41"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
            {fieldError("notes") && (
              <div className="text-danger small mt-1">{fieldError("notes")}</div>
            )}
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
                {saving ? <Spinner animation="border" size="sm" /> : "تسجيل"}
              </button>
            </Col>
            <Col sm={12} md={6}>
              <button
                type="button"
                className="btn btn-light fw-md w-100"
                onClick={() => close(false)}
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

export default AssignmentFormModal;
