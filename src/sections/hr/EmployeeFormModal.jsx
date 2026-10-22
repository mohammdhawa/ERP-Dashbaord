import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Col, Form, Modal, Nav, Row, Spinner, Tab } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { confirmDiscardChanges, toastNotify } from "../../utils";
import {
  createEmployee,
  updateEmployee,
  updateEmployeeRecord,
} from "../../redux/actions/employeesActions";
import { hasPermission } from "../../data/permissionsCatalog";
import {
  departmentToOption,
  useResourceOptions,
} from "../departments/useResourceOptions";
import {
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  SALARY_MODE_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  ENGINEERING_RANK_OPTIONS,
  GOVERNORATE_OPTIONS,
  GRADE_OPTIONS,
} from "../../data/hrEnums";
import {
  buildEmployeePayload,
  derivedChildrenCount,
  emptyEmployeeForm,
  getEmployeeFormValues,
  recordFieldAccess,
  untouchedSuggestionRejections,
  validateEmployeeForm,
  EMPLOYEE_CONSTANTS,
} from "./employeePayload";

const {
  ACTIVITY_ENGINEERING,
  ACTIVITY_INDUSTRIAL,
  MARITAL_MARRIED,
  SALARY_MODE_AGREED,
} = EMPLOYEE_CONSTANTS;

// WHY A TABBED MODAL, not a flat column of forty inputs and not a full page:
// the list already opens this modal from a row, so a full-page form would throw
// away the page, filters and scroll position the user came from. Seven labelled
// tabs keep the four required create fields on the first one — a minimal create
// is four inputs and a save, without scrolling past thirty-six others — while
// still reaching every field. The cost of tabs is that a rejected field can sit
// on a tab you cannot see, so a 422 lists the tab each error belongs to and the
// first offending tab is opened automatically.
//
// That "four on the first tab" claim was ASPIRATIONAL until recently: `gender`
// is required on create (see validateEmployeeForm) but was laid out on the
// personal tab, so the minimal create always bounced to a second tab. It now
// sits on الهوية with the other three. If a future field becomes required on
// create, put it on this tab too — FIELD_TAB below is what keeps the error
// routing honest, but it cannot fix a layout that contradicts the contract.
const TABS = [
  { key: "identity", title: "الهوية" },
  { key: "personal", title: "البيانات الشخصية" },
  { key: "contact", title: "التواصل" },
  { key: "military", title: "الخدمة العسكرية" },
  { key: "education", title: "التعليم" },
  { key: "work", title: "العمل" },
  { key: "classification", title: "التصنيف والرواتب" },
];

// Which tab each field lives on, so a server 422 can point at it.
const FIELD_TAB = {
  employee_number: "identity",
  first_name: "identity",
  middle_name: "identity",
  last_name: "identity",
  mother_name: "identity",
  nickname: "identity",
  national_id: "identity",
  // Lives on الهوية with the other three required create fields, not on
  // البيانات الشخصية where it used to sit.
  gender: "identity",

  birth_date: "personal",
  birth_place: "personal",
  origin_governorate: "personal",
  residence_governorate: "personal",
  nationality: "personal",
  second_nationality: "personal",
  marital_status: "personal",
  wives_count: "personal",
  sons_count: "personal",
  daughters_count: "personal",

  phone: "contact",
  phone_secondary: "contact",
  email: "contact",
  address: "contact",

  did_military_service: "military",
  military_discharge_date: "military",

  education_level: "education",
  qualification: "education",
  specialization: "education",
  is_graduated: "education",
  graduation_date: "education",

  department_id: "work",
  job_title_id: "work",
  employment_type: "work",
  workplace: "work",
  hire_date: "work",
  termination_date: "work",
  status: "work",

  activity_type: "classification",
  organizational_grade: "classification",
  experience_level: "classification",
  engineering_rank: "classification",
  industrial_experience_years: "classification",
  has_hazard_pay: "classification",
  has_scarcity_pay: "classification",
  has_dual_role_pay: "classification",
  distinction_grade: "classification",
  salary_mode: "classification",
  agreed_salary: "classification",
  sham_cash_account: "classification",
  payroll_location: "classification",
};

// Tri-state boolean: "" (unset / leave alone), "true", "false". A plain
// checkbox cannot express "not recorded", and submitting false for a field the
// user never touched is a claim the user did not make.
const TRISTATE_OPTIONS = [
  { value: "", label: "غير محدد" },
  { value: "true", label: "نعم" },
  { value: "false", label: "لا" },
];

// Field helpers live at MODULE scope, not inside the component. Defined inline
// they would be a brand-new component type on every render, so React would
// unmount and remount each input on every keystroke and the caret would jump
// out of the box. Module scope keeps the type stable; the changing form state
// reaches them through this context instead of through a closure.
const FieldCtx = React.createContext(null);

// Ties the footer's submit button to the form in the modal body across the
// Modal.Body/Modal.Footer boundary.
const FORM_ID = "employee-form";

// The message carries a stable id so the control it belongs to can point at it
// with aria-describedby. Without that link, moving focus to a rejected field
// announces the label and nothing else — the reason it was rejected is sitting
// right underneath in text a screen reader never reaches.
const errorId = (field) => `emp-${field}-error`;

const Err = ({ field }) => {
  const { fieldError } = React.useContext(FieldCtx);
  return fieldError(field) ? (
    <div id={errorId(field)} className="text-danger small mt-1">
      {fieldError(field)}
    </div>
  ) : null;
};

const Text = ({ field, label, type = "text", dir, ...rest }) => {
  const { form, setField, fieldError } = React.useContext(FieldCtx);
  const invalid = !!fieldError(field);
  return (
    <>
      <Form.Label htmlFor={`emp-${field}`}>{label}</Form.Label>
      <Form.Control
        id={`emp-${field}`}
        type={type}
        dir={dir}
        value={form[field]}
        onChange={(e) => setField(field, e.target.value)}
        isInvalid={invalid}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId(field) : undefined}
        {...rest}
      />
      <Err field={field} />
    </>
  );
};

const Enum = ({
  field,
  label,
  options,
  isDisabled,
  onChange,
  placeholder = "غير محدد",
  hint,
}) => {
  const { form, setField, fieldError } = React.useContext(FieldCtx);
  const invalid = !!fieldError(field);
  return (
    <>
      <Form.Label htmlFor={`emp-${field}`}>{label}</Form.Label>
      <Select
        inputId={`emp-${field}`}
        classNamePrefix="Select2"
        options={options}
        value={options.find((o) => o.value === Number(form[field])) || null}
        onChange={onChange || ((opt) => setField(field, opt ? opt.value : ""))}
        isClearable
        isDisabled={isDisabled}
        placeholder={placeholder}
        menuPosition="fixed"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId(field) : undefined}
      />
      {hint && <div className="text-muted small mt-1">{hint}</div>}
      <Err field={field} />
    </>
  );
};

const Tri = ({ field, label }) => {
  const { form, setField } = React.useContext(FieldCtx);
  return (
    <>
      <Form.Label htmlFor={`emp-${field}`}>{label}</Form.Label>
      <Select
        inputId={`emp-${field}`}
        classNamePrefix="Select2"
        options={TRISTATE_OPTIONS}
        value={
          TRISTATE_OPTIONS.find((o) => o.value === String(form[field] ?? "")) ||
          TRISTATE_OPTIONS[0]
        }
        onChange={(opt) => setField(field, opt ? opt.value : "")}
        menuPosition="fixed"
      />
      <Err field={field} />
    </>
  );
};

const EmployeeFormModal = ({
  open,
  close,
  employee,
  currentPage,
  itemsPerPage,
  filters,
  // Opened from the profile screen there is no list behind the modal, so the
  // save refreshes the single record instead of re-fetching a page nobody is
  // looking at.
  standalone = false,
  onSaved,
}) => {
  const dispatch = useDispatch();
  const { saving } = useSelector((state) => state.employees);
  const { permissions } = useSelector((state) => state.auth);

  // FIELD-LEVEL ACCESS. Thirteen inputs hang off these two flags: the twelve
  // pay/classification keys and national_id. Without access the key is ABSENT
  // from the response, so the input is neither rendered nor submitted —
  // rendering it would show a blank box over a value that exists, and
  // submitting that blank would destroy it.
  //
  // ⚙️ PER RECORD since GAP-3 (2026-09-24): a viewSalary granted over one
  // section shows pay on that section's staff only, so editing, the record's
  // own keys decide; creating, holding the permission is the only signal there
  // is. See recordFieldAccess.
  const { canViewSalary, canViewIdentity } = recordFieldAccess(employee, {
    salary: hasPermission(permissions, "hr.employees.viewSalary"),
    identity: hasPermission(permissions, "hr.employees.viewIdentity"),
  });
  const isEdit = Boolean(employee);

  const canReadDepartments = hasPermission(permissions, "departments.view");
  const canReadJobTitles = hasPermission(permissions, "hr.job_titles.view");

  const departments = useResourceOptions(
    "/departments",
    departmentToOption,
    open && canReadDepartments
  );
  const jobTitlesRaw = useResourceOptions(
    "/hr/job-titles",
    (t) => t,
    open && canReadJobTitles
  );
  const [form, setForm] = useState(emptyEmployeeForm);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState("identity");
  // Suggestions applied from a job title, so the UI can say which values came
  // from the catalogue rather than from the user.
  const [suggested, setSuggested] = useState({});
  // The values this modal opened with, so "did the user change anything?" can
  // be answered without tracking a dirty flag on every field.
  const [initialForm, setInitialForm] = useState(emptyEmployeeForm);
  // Focus target for a server error that names no field (see focusFirstError).
  const generalErrorRef = useRef(null);

  useEffect(() => {
    if (open) {
      const values = getEmployeeFormValues(employee);
      setForm(values);
      setInitialForm(values);
      setErrors({});
      setActiveTab("identity");
      setSuggested({});
    }
  }, [open, employee]);

  const isDirty = useMemo(
    () => Object.keys(form).some((key) => form[key] !== initialForm[key]),
    [form, initialForm]
  );

  // The modal already refuses Escape and backdrop clicks (backdrop="static",
  // keyboard={false}) to protect forty fields of work — but "إلغاء" threw all
  // of it away with no warning, which is the same loss by a different button.
  // An untouched form still closes immediately; only real edits are confirmed.
  const handleCancel = async () => {
    if (!isDirty) {
      close();
      return;
    }
    if (await confirmDiscardChanges()) close();
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
    setSuggested((prev) => ({ ...prev, [field]: false }));
  };

  // NO MANAGER FIELD (2026-09-24). `direct_manager_id` is gone from the API: a
  // manager is not a property of a person here but a consequence of the unit
  // they are in, resolved by the server from the org tree. The profile shows
  // the resolved `manager`; this form moves people by department_id only.

  // Active titles first; an inactive one stays selectable only so an existing
  // record that already holds it can still be saved without silently losing it.
  const jobTitleOptions = useMemo(() => {
    const items = jobTitlesRaw.items || [];
    const sorted = [...items].sort((a, b) => {
      if (Boolean(a.is_active) !== Boolean(b.is_active))
        return a.is_active ? -1 : 1;
      return String(a.name).localeCompare(String(b.name), "ar");
    });
    return sorted.map((t) => ({
      value: t.id,
      label: t.is_active ? t.name : `${t.name} (معطّل)`,
      raw: t,
    }));
  }, [jobTitlesRaw.items]);

  // Selecting a title pre-fills the two default_* values ONLY into inputs the
  // user has left empty. They are suggestions, not constraints: one title is
  // held at different grades by a section head and a division head, so the
  // employee record stays the fact and the user may override either.
  const handleJobTitleChange = (option) => {
    const nextId = option ? option.value : "";
    const t = option?.raw || {};

    // Both state updates are decided HERE, in the event handler, and applied as
    // two plain setState calls. Deriving them inside the setForm updater made
    // setSuggested a side effect of another state update: React treats updater
    // functions as pure and is free to run them twice (StrictMode does exactly
    // that in development) or to discard a run, so the hint state was being set
    // from a code path with no guarantee about how often it executes.
    const suggestions = {};
    if (option && canViewSalary) {
      if (
        form.organizational_grade === "" &&
        t.default_organizational_grade != null
      ) {
        suggestions.organizational_grade = t.default_organizational_grade;
      }
      if (form.activity_type === "" && t.default_activity_type != null) {
        suggestions.activity_type = t.default_activity_type;
      }
    }

    setForm((prev) => ({ ...prev, ...suggestions, job_title_id: nextId }));
    setSuggested((prev) => {
      const next = { ...prev };
      Object.keys(suggestions).forEach((key) => {
        next[key] = true;
      });
      return next;
    });
    setErrors((prev) => ({ ...prev, job_title_id: null }));
  };

  const activity = form.activity_type === "" ? null : Number(form.activity_type);
  const isEngineering = activity === ACTIVITY_ENGINEERING;
  const isIndustrial = activity === ACTIVITY_INDUSTRIAL;
  const isMarried = Number(form.marital_status) === MARITAL_MARRIED;
  const salaryMode = form.salary_mode === "" ? null : Number(form.salary_mode);
  const agreedRequired = salaryMode === SALARY_MODE_AGREED;

  // Changing the activity clears the axis that no longer applies, so a value
  // left over from the previous activity can never be submitted.
  useEffect(() => {
    if (!canViewSalary) return;
    setForm((prev) => {
      const next = { ...prev };
      let changed = false;
      if (!isEngineering && prev.engineering_rank !== "") {
        next.engineering_rank = "";
        changed = true;
      }
      if (!isIndustrial && prev.industrial_experience_years !== "") {
        next.industrial_experience_years = "";
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [isEngineering, isIndustrial, canViewSalary]);

  // Same for wives_count when the employee is not married.
  useEffect(() => {
    if (isMarried) return;
    setForm((prev) =>
      prev.wives_count === "" ? prev : { ...prev, wives_count: "" }
    );
  }, [isMarried]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return; // double-submit guard on top of the disabled button

    const clientErrors = validateEmployeeForm(form, {
      isEdit,
      canViewSalary,
      canViewIdentity,
    });
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      focusFirstError(clientErrors);
      return;
    }

    // `original` makes an edit send a gated key only when it changed — see
    // rule 1 in employeePayload.js for why a transfer needs that.
    const payload = buildEmployeePayload(form, {
      isEdit,
      canViewSalary,
      canViewIdentity,
      original: isEdit ? initialForm : null,
    });

    const save = (body) => {
      if (isEdit && standalone) {
        return dispatch(updateEmployeeRecord(employee.id, body));
      }
      if (isEdit) {
        return dispatch(
          updateEmployee(employee.id, body, currentPage, itemsPerPage, filters)
        );
      }
      return dispatch(createEmployee(body, currentPage, itemsPerPage, filters));
    };

    try {
      try {
        await save(payload);
      } catch (parsed) {
        // CREATE ONLY: the server refused nothing but pay values a job title
        // suggested and the user never touched — the usual reason being a
        // viewSalary grant that does not reach the chosen unit, which the
        // client cannot know in advance. Drop them and save once more rather
        // than make the user clear values they never typed.
        const dropped = !isEdit
          ? untouchedSuggestionRejections(parsed?.errors, suggested)
          : null;
        if (!dropped) throw parsed;

        const cleared = { ...form };
        dropped.forEach((key) => {
          cleared[key] = "";
        });
        setForm(cleared);
        setSuggested((prev) => {
          const next = { ...prev };
          dropped.forEach((key) => {
            next[key] = false;
          });
          return next;
        });
        await save(
          buildEmployeePayload(cleared, {
            isEdit,
            canViewSalary,
            canViewIdentity,
            original: null,
          })
        );
        // Worded as "the server refused them", not as a claim about the
        // caller's grant: an out-of-scope unit is the likely cause, not the
        // only possible one.
        toastNotify(
          "حُفظ الموظف دون قيم التصنيف المقترحة من المسمى الوظيفي، لأن الخادم رفضها لهذه الوحدة (غالباً لأنها خارج نطاق صلاحية الرواتب لديك).",
          "warning"
        );
      }
      onSaved?.();
      close();
    } catch (parsed) {
      // Server 422 mapped back by EXACT field name, so each message lands on
      // the input it belongs to rather than in a generic banner.
      const serverErrors = parsed.errors || { _general: [parsed.message] };
      setErrors(serverErrors);
      focusFirstError(serverErrors);
    }
  };

  // Opens the first tab holding a rejected field AND puts the caret in that
  // field. Switching the tab alone was only half the job: the submit button
  // lives in the footer, so after a rejected save focus stayed on it while the
  // thing that failed was somewhere in a pane the user now had to hunt
  // through — and a screen reader announced nothing at all, because nothing
  // moved. With forty fields across seven tabs that is the difference between
  // "the form told me what is wrong" and "the form refused and went quiet".
  //
  // Every input in this modal carries a predictable id (`emp-<field>`, set by
  // Text/Enum/Tri above; react-select gets it via inputId), which is what makes
  // the lookup possible without a ref per field.
  //
  // The focus is deferred: the destination pane is display:none until React has
  // committed the tab change, and focusing a hidden element silently does
  // nothing. rAF runs after that commit has painted.
  const focusFirstError = (errorBag) => {
    const firstField = Object.keys(errorBag).find(
      (k) => k !== "_general" && FIELD_TAB[k]
    );
    if (!firstField) {
      // A _general-only error has no field to point at, so send focus to the
      // banner instead of leaving it on a button that just did nothing.
      requestAnimationFrame(() => generalErrorRef.current?.focus());
      return;
    }
    setActiveTab(FIELD_TAB[firstField]);
    requestAnimationFrame(() => {
      const el = document.getElementById(`emp-${firstField}`);
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  const fieldError = (field) => errors?.[field]?.[0];

  // Tabs carrying an error get a marker, so the user can see where to look.
  const tabsWithErrors = useMemo(() => {
    const set = new Set();
    Object.keys(errors || {}).forEach((field) => {
      if (errors[field] && FIELD_TAB[field]) set.add(FIELD_TAB[field]);
    });
    return set;
  }, [errors]);

  const ctx = { form, setField, fieldError };

  const title = isEdit
    ? `تعديل بيانات الموظف: ${employee?.full_name || ""}`
    : "إضافة موظف جديد";

  return (
    <Modal
      show={open}
      size="xl"
      // The header's × now runs the same discard guard as "إلغاء" rather than
      // closing straight through it.
      onHide={handleCancel}
      keyboard={false}
      centered
      backdrop="static"
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <FieldCtx.Provider value={ctx}>
          <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
            <Nav variant="tabs" className="mb-3 flex-nowrap overflow-auto">
              {TABS.map((tab) => {
                // The classification tab does not exist at all without
                // viewSalary — not a disabled tab, which would advertise the
                // data as merely out of reach.
                if (tab.key === "classification" && !canViewSalary) return null;
                return (
                  <Nav.Item key={tab.key}>
                    <Nav.Link eventKey={tab.key} className="text-nowrap">
                      {tab.title}
                      {tabsWithErrors.has(tab.key) && (
                        <i className="ri-error-warning-line text-danger ms-1 align-middle"></i>
                      )}
                    </Nav.Link>
                  </Nav.Item>
                );
              })}
            </Nav>

            <Tab.Content>
              {/* ---------------- الهوية ---------------- */}
              <Tab.Pane eventKey="identity">
                <Row className="g-3">
                  <Col sm={12} md={4}>
                    <Text
                      field="first_name"
                      label="الاسم الأول *"
                      maxLength={255}
                      autoFocus
                    />
                  </Col>
                  <Col sm={12} md={4}>
                    <Text field="middle_name" label="اسم الأب *" maxLength={255} />
                  </Col>
                  <Col sm={12} md={4}>
                    <Text field="last_name" label="الكنية *" maxLength={255} />
                  </Col>
                  {/* `gender` is the FOURTH required create field and it lived
                      on the personal tab, so every first create filled this tab,
                      pressed "إضافة" and was bounced to another one. The four
                      starred fields are now the first four controls here. */}
                  <Col sm={12} md={4}>
                    <Enum field="gender" label="الجنس *" options={GENDER_OPTIONS} />
                  </Col>
                  <Col sm={12} md={4}>
                    <Text field="mother_name" label="اسم الأم" maxLength={255} />
                  </Col>
                  <Col sm={12} md={4}>
                    <Text
                      field="nickname"
                      label="اللقب"
                      maxLength={100}
                      placeholder="أبو عبد الرحمن"
                    />
                  </Col>
                  <Col sm={12} md={4}>
                    <Form.Label htmlFor="emp-employee_number">
                      الرقم الوظيفي{" "}
                      <span className="text-muted">
                        {isEdit ? "(لا يمكن إفراغه)" : "(يُنشأ تلقائياً)"}
                      </span>
                    </Form.Label>
                    <Form.Control
                      id="emp-employee_number"
                      type="text"
                      maxLength={50}
                      dir="ltr"
                      placeholder={
                        isEdit ? "" : "اتركه فارغاً للإنشاء التلقائي"
                      }
                      value={form.employee_number}
                      onChange={(e) =>
                        setField("employee_number", e.target.value)
                      }
                      isInvalid={!!fieldError("employee_number")}
                    />
                    <Err field="employee_number" />
                  </Col>
                  {canViewIdentity && (
                    <Col sm={12} md={4}>
                      <Text
                        field="national_id"
                        label="رقم الهوية"
                        maxLength={50}
                        dir="ltr"
                      />
                    </Col>
                  )}
                </Row>
              </Tab.Pane>

              {/* ---------------- البيانات الشخصية ---------------- */}
              <Tab.Pane eventKey="personal">
                <Row className="g-3">
                  <Col sm={12} md={4}>
                    <Text field="birth_date" label="تاريخ الميلاد" type="date" />
                  </Col>
                  <Col sm={12} md={4}>
                    <Text field="birth_place" label="مكان الولادة" maxLength={255} />
                  </Col>
                  <Col sm={12} md={4}>
                    <Enum
                      field="origin_governorate"
                      label="محافظة المنشأ"
                      options={GOVERNORATE_OPTIONS}
                    />
                  </Col>
                  <Col sm={12} md={4}>
                    <Enum
                      field="residence_governorate"
                      label="محافظة الإقامة"
                      options={GOVERNORATE_OPTIONS}
                    />
                  </Col>
                  <Col sm={12} md={4}>
                    <Text
                      field="nationality"
                      label="الجنسية"
                      maxLength={60}
                      placeholder="سوري"
                    />
                  </Col>
                  <Col sm={12} md={4}>
                    <Text
                      field="second_nationality"
                      label="الجنسية الثانية"
                      maxLength={60}
                    />
                  </Col>
                  <Col sm={12} md={4}>
                    <Enum
                      field="marital_status"
                      label="الحالة الاجتماعية"
                      options={MARITAL_STATUS_OPTIONS}
                    />
                  </Col>
                  <Col sm={12} md={4}>
                    <Text
                      field="wives_count"
                      label="عدد الزوجات"
                      type="number"
                      min={0}
                      max={4}
                      disabled={!isMarried}
                    />
                    {!isMarried && (
                      <div className="text-muted small mt-1">
                        يُحدَّد للموظف المتزوج فقط.
                      </div>
                    )}
                  </Col>
                  <Col sm={12} md={4}>
                    <Text
                      field="sons_count"
                      label="عدد الأبناء"
                      type="number"
                      min={0}
                      max={50}
                    />
                  </Col>
                  <Col sm={12} md={4}>
                    <Text
                      field="daughters_count"
                      label="عدد البنات"
                      type="number"
                      min={0}
                      max={50}
                    />
                  </Col>
                  <Col sm={12} md={4}>
                    <Form.Label>عدد الأولاد</Form.Label>
                    <Form.Control
                      type="text"
                      value={derivedChildrenCount(form)}
                      readOnly
                      disabled
                    />
                    <div className="text-muted small mt-1">
                      محسوب تلقائياً من الأبناء والبنات، ولا يُرسل إلى الخادم.
                    </div>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* ---------------- التواصل ---------------- */}
              <Tab.Pane eventKey="contact">
                <Row className="g-3">
                  <Col sm={12} md={6}>
                    <Text
                      field="phone"
                      label="الهاتف"
                      type="tel"
                      maxLength={50}
                      dir="ltr"
                      placeholder="+963900000000"
                    />
                  </Col>
                  <Col sm={12} md={6}>
                    <Text
                      field="phone_secondary"
                      label="هاتف إضافي"
                      type="tel"
                      maxLength={50}
                      dir="ltr"
                    />
                  </Col>
                  <Col sm={12} md={6}>
                    <Text
                      field="email"
                      label="البريد الإلكتروني"
                      type="email"
                      maxLength={255}
                      dir="ltr"
                    />
                  </Col>
                  <Col sm={12}>
                    <Form.Label htmlFor="emp-address">العنوان</Form.Label>
                    <Form.Control
                      id="emp-address"
                      as="textarea"
                      maxLength={1000}
                      style={{ height: "4rem" }}
                      value={form.address}
                      onChange={(e) => setField("address", e.target.value)}
                      isInvalid={!!fieldError("address")}
                    />
                    <Err field="address" />
                  </Col>
                </Row>
              </Tab.Pane>

              {/* ---------------- الخدمة العسكرية ---------------- */}
              <Tab.Pane eventKey="military">
                <Row className="g-3">
                  <Col sm={12} md={6}>
                    <Tri field="did_military_service" label="أدى الخدمة العسكرية" />
                  </Col>
                  <Col sm={12} md={6}>
                    <Text
                      field="military_discharge_date"
                      label="تاريخ التسريح"
                      type="date"
                    />
                  </Col>
                </Row>
              </Tab.Pane>

              {/* ---------------- التعليم ---------------- */}
              <Tab.Pane eventKey="education">
                <Row className="g-3">
                  <Col sm={12} md={6}>
                    <Enum
                      field="education_level"
                      label="المستوى التعليمي"
                      options={EDUCATION_LEVEL_OPTIONS}
                    />
                  </Col>
                  <Col sm={12} md={6}>
                    <Text
                      field="qualification"
                      label="المؤهل العلمي"
                      maxLength={255}
                    />
                  </Col>
                  <Col sm={12} md={6}>
                    <Text field="specialization" label="الاختصاص" maxLength={255} />
                  </Col>
                  <Col sm={12} md={3}>
                    <Tri field="is_graduated" label="متخرج" />
                  </Col>
                  <Col sm={12} md={3}>
                    <Text field="graduation_date" label="تاريخ التخرج" type="date" />
                  </Col>
                </Row>
              </Tab.Pane>

              {/* ---------------- العمل ---------------- */}
              <Tab.Pane eventKey="work">
                <Row className="g-3">
                  <Col sm={12} md={6}>
                    <Form.Label htmlFor="emp-job_title_id">
                      المسمى الوظيفي
                    </Form.Label>
                    {canReadJobTitles && !jobTitlesRaw.error ? (
                      <>
                        <Select
                          inputId="emp-job_title_id"
                          classNamePrefix="Select2"
                          options={jobTitleOptions}
                          value={
                            jobTitleOptions.find(
                              (o) => o.value === Number(form.job_title_id)
                            ) || null
                          }
                          onChange={handleJobTitleChange}
                          isClearable
                          isLoading={jobTitlesRaw.loading}
                          placeholder="بدون مسمى"
                          noOptionsMessage={() => "لا توجد مسميات"}
                          menuPosition="fixed"
                        />
                        {jobTitlesRaw.incomplete && (
                          <div className="text-warning small mt-1">
                            تعذّر تحميل كل المسميات، القائمة غير مكتملة.
                          </div>
                        )}
                      </>
                    ) : (
                      // No hr.job_titles.view: accept the id rather than
                      // inventing a lookup endpoint that does not exist.
                      <>
                        <Form.Control
                          id="emp-job_title_id"
                          type="number"
                          min={1}
                          placeholder="معرّف المسمى الوظيفي"
                          value={form.job_title_id}
                          onChange={(e) =>
                            setField("job_title_id", e.target.value)
                          }
                          isInvalid={!!fieldError("job_title_id")}
                        />
                        <div className="text-muted small mt-1">
                          لا تملك صلاحية عرض المسميات الوظيفية، أدخل المعرّف
                          يدوياً.
                        </div>
                      </>
                    )}
                    <Err field="job_title_id" />
                  </Col>

                  <Col sm={12} md={6}>
                    <Form.Label htmlFor="emp-department_id">القسم</Form.Label>
                    {canReadDepartments && !departments.error ? (
                      <>
                        <Select
                          inputId="emp-department_id"
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
                          isClearable
                          isLoading={departments.loading}
                          placeholder="بدون قسم"
                          noOptionsMessage={() => "لا توجد أقسام"}
                          menuPosition="fixed"
                        />
                        {departments.incomplete && (
                          <div className="text-warning small mt-1">
                            تعذّر تحميل كل الأقسام، القائمة غير مكتملة.
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <Form.Control
                          id="emp-department_id"
                          type="number"
                          min={1}
                          placeholder="معرّف القسم (ID)"
                          value={form.department_id}
                          onChange={(e) =>
                            setField("department_id", e.target.value)
                          }
                          isInvalid={!!fieldError("department_id")}
                        />
                        <div className="text-muted small mt-1">
                          تعذّر تحميل قائمة الأقسام، أدخل المعرّف يدوياً.
                        </div>
                      </>
                    )}
                    <Err field="department_id" />
                    <div className="text-muted small mt-1">
                      المدير المباشر يُحدَّد تلقائياً من الهيكل التنظيمي للوحدة
                      المختارة.
                    </div>
                  </Col>

                  {isEdit && (
                    <Col sm={12}>
                      <Alert
                        variant="info"
                        className="mb-0 py-2 px-3 fs-12 d-flex align-items-start gap-2"
                      >
                        <i className="ri-information-line mt-1"></i>
                        <span>
                          تغيير القسم أو المسمى الوظيفي أو الدرجة التنظيمية من
                          هنا يُسجِّل نقلاً تلقائياً بسبب «نقل داخلي» بتاريخ
                          اليوم. لتسجيل السبب الحقيقي أو تاريخ بأثر رجعي، استخدم
                          تبويب «سجل التعيين» في ملف الموظف.
                        </span>
                      </Alert>
                    </Col>
                  )}

                  <Col sm={12} md={6}>
                    <Enum
                      field="employment_type"
                      label="نوع التوظيف"
                      options={EMPLOYMENT_TYPE_OPTIONS}
                    />
                  </Col>
                  <Col sm={12} md={6}>
                    <Text field="workplace" label="مكان العمل" maxLength={255} />
                  </Col>
                  <Col sm={12} md={6}>
                    <Enum
                      field="status"
                      label="الحالة"
                      options={STATUS_OPTIONS}
                    />
                  </Col>
                  <Col sm={12} md={6}>
                    <Text field="hire_date" label="تاريخ التعيين" type="date" />
                  </Col>
                  <Col sm={12} md={6}>
                    <Text
                      field="termination_date"
                      label="تاريخ انتهاء العمل"
                      type="date"
                    />
                  </Col>
                </Row>
              </Tab.Pane>

              {/* ---------------- التصنيف والرواتب ---------------- */}
              {canViewSalary && (
                <Tab.Pane eventKey="classification">
                  <Row className="g-3">
                    <Col sm={12}>
                      <Alert variant="light" className="mb-0 py-2 px-3 fs-12">
                        محاور التصنيف هي المعايير التي يُحتسب منها الراتب. لا
                        يعرض النظام راتباً محتسباً — «الراتب المتفق عليه» هو
                        المبلغ الوحيد المخزَّن، وذلك ضمن نظام «إتفاق» فقط.
                      </Alert>
                    </Col>

                    <Col sm={12} md={4}>
                      <Enum
                        field="activity_type"
                        label="نوع النشاط"
                        options={ACTIVITY_TYPE_OPTIONS}
                        hint={
                          suggested.activity_type
                            ? "اقتراح من المسمى الوظيفي، يمكن تعديله."
                            : undefined
                        }
                      />
                    </Col>
                    <Col sm={12} md={4}>
                      <Enum
                        field="organizational_grade"
                        label="الدرجة التنظيمية"
                        options={GRADE_OPTIONS}
                        hint={
                          suggested.organizational_grade
                            ? "اقتراح من المسمى الوظيفي، يمكن تعديله."
                            : undefined
                        }
                      />
                    </Col>
                    <Col sm={12} md={4}>
                      <Enum
                        field="experience_level"
                        label="مستوى الخبرة"
                        options={GRADE_OPTIONS}
                      />
                    </Col>

                    <Col sm={12} md={4}>
                      <Enum
                        field="engineering_rank"
                        label="الرتبة الهندسية"
                        options={ENGINEERING_RANK_OPTIONS}
                        isDisabled={!isEngineering}
                        placeholder={
                          isEngineering ? "غير محدد" : "للنشاط الهندسي فقط"
                        }
                        hint={
                          !isEngineering
                            ? "تُحدَّد للموظفين ذوي النشاط الهندسي فقط."
                            : undefined
                        }
                      />
                    </Col>
                    <Col sm={12} md={4}>
                      <Form.Label htmlFor="emp-industrial_experience_years">
                        سنوات الخبرة الصناعية
                      </Form.Label>
                      <Form.Control
                        id="emp-industrial_experience_years"
                        type="number"
                        min={0}
                        max={60}
                        disabled={!isIndustrial}
                        value={form.industrial_experience_years}
                        onChange={(e) =>
                          setField(
                            "industrial_experience_years",
                            e.target.value
                          )
                        }
                        isInvalid={!!fieldError("industrial_experience_years")}
                      />
                      {!isIndustrial && (
                        <div className="text-muted small mt-1">
                          تُحدَّد للموظفين ذوي النشاط الصناعي فقط.
                        </div>
                      )}
                      <Err field="industrial_experience_years" />
                    </Col>
                    <Col sm={12} md={4}>
                      <Text
                        field="distinction_grade"
                        label="درجة التميّز"
                        type="number"
                        min={0}
                        max={255}
                      />
                    </Col>

                    <Col sm={12} md={4}>
                      <Tri field="has_hazard_pay" label="تعويض خطورة" />
                    </Col>
                    <Col sm={12} md={4}>
                      <Tri field="has_scarcity_pay" label="تعويض ندرة" />
                    </Col>
                    <Col sm={12} md={4}>
                      <Tri field="has_dual_role_pay" label="تعويض ازدواج وظيفي" />
                    </Col>

                    <Col sm={12} md={4}>
                      <Enum
                        field="salary_mode"
                        label="نظام الراتب"
                        options={SALARY_MODE_OPTIONS}
                      />
                    </Col>
                    <Col sm={12} md={4}>
                      <Form.Label htmlFor="emp-agreed_salary">
                        الراتب المتفق عليه {agreedRequired && "*"}
                      </Form.Label>
                      <Form.Control
                        id="emp-agreed_salary"
                        // TEXT, not number: the value is a decimal STRING and
                        // a number input would hand it to the browser as a
                        // float and back.
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        placeholder="0.00"
                        disabled={salaryMode !== SALARY_MODE_AGREED}
                        value={form.agreed_salary}
                        onChange={(e) =>
                          setField("agreed_salary", e.target.value)
                        }
                        isInvalid={!!fieldError("agreed_salary")}
                      />
                      <div className="text-muted small mt-1">
                        {salaryMode === SALARY_MODE_AGREED
                          ? "مطلوب ضمن نظام «إتفاق»."
                          : "يُحدَّد ضمن نظام «إتفاق» فقط؛ ضمن «نظام رواتب» يُحتسب الراتب من المعايير."}
                      </div>
                      <Err field="agreed_salary" />
                    </Col>
                    <Col sm={12} md={4}>
                      <Text
                        field="sham_cash_account"
                        label="حساب الشام كاش"
                        maxLength={16}
                        dir="ltr"
                        inputMode="numeric"
                        placeholder="16 رقماً"
                      />
                    </Col>
                    <Col sm={12} md={4}>
                      {/* مكان الراتب — the payroll cost centre. Free text
                          until Finance has a list of them (backend
                          2026-10-14); pay-gated like the rest of this tab. */}
                      <Text
                        field="payroll_location"
                        label="مكان الراتب"
                        maxLength={150}
                        placeholder="مكتب رئيسي - هندسي"
                      />
                    </Col>
                  </Row>
                </Tab.Pane>
              )}
            </Tab.Content>
          </Tab.Container>
          </FieldCtx.Provider>

          {/* role="alert" so the message is announced when it appears, and
              tabIndex={-1} so focusFirstError can move the caret here when the
              server rejects the save without naming a field. */}
          {errors._general && (
            <Alert
              ref={generalErrorRef}
              role="alert"
              tabIndex={-1}
              variant="danger"
              className="mt-3 mb-0 py-2 px-3"
            >
              {errors._general[0]}
            </Alert>
          )}

        </form>
      </Modal.Body>
      {/* The actions live in the FOOTER, outside the scrollable body. Inside it
          they scrolled away with the fields: on the classification tab you had
          to scroll past a dozen inputs to reach Save. The submit button reaches
          the form through the `form` attribute, which is what it is for. */}
      <Modal.Footer>
        <Row className="g-2 w-100 m-0">
          <Col sm={12} md={6}>
            <button
              className="btn btn-secondary fw-md w-100"
              type="submit"
              form={FORM_ID}
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
      </Modal.Footer>
    </Modal>
  );
};

export default EmployeeFormModal;
