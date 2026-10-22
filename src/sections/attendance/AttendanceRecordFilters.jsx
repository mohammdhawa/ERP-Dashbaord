import React, { useEffect, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import Select from "react-select";
import { useSelector } from "react-redux";
import EmployeePicker from "../../components/EmployeePicker";
import { RECORDS_SORT_KEYS } from "../../redux/actions/attendanceParams";
import { hasPermission } from "../../data/permissionsCatalog";
import {
  RECORD_TYPE_OPTIONS,
  REJECTION_REASON_OPTIONS,
} from "../../data/attendanceEnums";
import {
  departmentToOption,
  useResourceOptions,
} from "../departments/useResourceOptions";
import {
  DATE_MODES,
  MAX_YEAR,
  MIN_YEAR,
  MONTH_OPTIONS,
  isValidYear,
} from "./recordFilters";
import { MAX_SEARCH, isPositiveId } from "../../utils/filterValues";

// فلاتر سجلات الحضور (API doc §13.1). Controlled by the screen, which owns the
// filter object, the URL and the fetch; this only edits it.
//
// `problem` is dateProblem()'s verdict. While it is set the list is not
// requested, so it is shown here, beside the inputs that caused it.

const SORT_LABELS = {
  recorded_at: "وقت التسجيل",
  date: "التاريخ",
  type: "النوع",
  status: "الحالة",
  work_hours: "ساعات العمل",
  created_at: "وقت الاستلام",
  rejected_at: "وقت الرفض",
  id: "رقم السجل",
  employee_name: "اسم الموظف",
  employee_number: "الرقم الوظيفي",
};
// Both directions of every key, as the employees list offers them.
const SORT_OPTIONS = RECORDS_SORT_KEYS.flatMap((key) => [
  { value: key, label: `${SORT_LABELS[key]} ↑` },
  { value: `-${key}`, label: `${SORT_LABELS[key]} ↓` },
]);

const TRI_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "1", label: "نعم" },
  { value: "0", label: "لا" },
];

const AttendanceRecordFilters = ({
  filters,
  defaults,
  onChange,
  onReset,
  problem,
}) => {
  const { permissions } = useSelector((state) => state.auth);
  const canReadDepartments = hasPermission(permissions, "departments.view");

  const departments = useResourceOptions(
    "/departments",
    departmentToOption,
    canReadDepartments
  );

  // `search` is debounced and `year` committed only once it is a valid year
  // (a half-typed "20" would be a 422); every other control commits at once.
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [yearDraft, setYearDraft] = useState(filters.year);
  useEffect(() => setSearchDraft(filters.search), [filters.search]);
  useEffect(() => setYearDraft(filters.year), [filters.year]);

  useEffect(() => {
    if (searchDraft === filters.search) return undefined;
    const timer = setTimeout(() => onChange({ search: searchDraft }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  useEffect(() => {
    if (yearDraft === filters.year) return;
    if (isValidYear(yearDraft)) onChange({ year: String(Number(yearDraft)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearDraft]);

  const yearInvalid = !isValidYear(yearDraft);

  const pickDept = departments.options.find(
    (o) => o.value === Number(filters.department_id)
  );
  const monthOption = MONTH_OPTIONS.find(
    (o) => o.value === String(Number(filters.month))
  );

  // Typed-but-uncommitted text counts: «مسح الفلاتر» must be there for it too.
  const hasAnyFilter =
    Object.keys(defaults).some((key) => filters[key] !== defaults[key]) ||
    searchDraft !== defaults.search ||
    yearDraft !== defaults.year;

  const reset = () => {
    // The drafts are plain local state: a reset that left them would show the
    // old text over a cleared filter (and an invalid year over a valid one).
    setSearchDraft(defaults.search);
    setYearDraft(defaults.year);
    onReset();
  };

  const setMode = (mode) => {
    // An abandoned half-typed year must not follow the user into the next mode.
    setYearDraft(filters.year);
    onChange({ mode });
  };

  const triSelect = (key, label, id) => (
    <Col sm={6} md={4} lg={2}>
      <Form.Label htmlFor={id} className="fs-12 mb-1">
        {label}
      </Form.Label>
      <Form.Select
        id={id}
        value={filters[key]}
        onChange={(e) => onChange({ [key]: e.target.value })}
      >
        {TRI_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Form.Select>
    </Col>
  );

  return (
    <div className="mb-3">
      <Row className="g-2 mb-2 align-items-end">
        <Col xs="auto">
          <div className="fs-12 mb-1" id="rec-f-mode-label">
            عرض
          </div>
          <div
            className="btn-group"
            role="group"
            aria-labelledby="rec-f-mode-label"
          >
            {DATE_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`btn ${
                  filters.mode === m.value ? "btn-primary" : "btn-outline-primary"
                }`}
                aria-pressed={filters.mode === m.value}
                onClick={() => setMode(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Col>

        {filters.mode === "day" && (
          <Col sm={6} md={3} lg={2}>
            <Form.Label htmlFor="rec-f-date" className="fs-12 mb-1">
              اليوم
            </Form.Label>
            <Form.Control
              id="rec-f-date"
              type="date"
              value={filters.date}
              onChange={(e) => onChange({ date: e.target.value })}
              isInvalid={Boolean(problem)}
            />
          </Col>
        )}

        {filters.mode === "range" && (
          <>
            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="rec-f-from" className="fs-12 mb-1">
                من تاريخ
              </Form.Label>
              <Form.Control
                id="rec-f-from"
                type="date"
                value={filters.from}
                onChange={(e) => onChange({ from: e.target.value })}
                isInvalid={Boolean(problem)}
              />
            </Col>
            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="rec-f-to" className="fs-12 mb-1">
                إلى تاريخ
              </Form.Label>
              <Form.Control
                id="rec-f-to"
                type="date"
                value={filters.to}
                onChange={(e) => onChange({ to: e.target.value })}
                isInvalid={Boolean(problem)}
              />
            </Col>
          </>
        )}

        {filters.mode === "month" && (
          <>
            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="rec-f-month" className="fs-12 mb-1">
                الشهر
              </Form.Label>
              <Select
                inputId="rec-f-month"
                classNamePrefix="Select2"
                options={MONTH_OPTIONS}
                value={monthOption || null}
                onChange={(opt) => opt && onChange({ month: opt.value })}
                isSearchable={false}
                menuPosition="fixed"
              />
            </Col>
            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="rec-f-year" className="fs-12 mb-1">
                السنة
              </Form.Label>
              <Form.Control
                id="rec-f-year"
                type="number"
                min={MIN_YEAR}
                max={MAX_YEAR}
                value={yearDraft}
                onChange={(e) => setYearDraft(e.target.value)}
                isInvalid={yearInvalid}
              />
            </Col>
          </>
        )}

        {hasAnyFilter && (
          <Col xs="auto" className="ms-auto">
            <button
              type="button"
              className="btn btn-light btn-wave"
              onClick={reset}
            >
              <i className="ri-filter-off-line align-middle me-1"></i>
              مسح الفلاتر
            </button>
          </Col>
        )}
      </Row>

      {(problem || (filters.mode === "month" && yearInvalid)) && (
        <div className="text-danger fs-13 mb-2" role="alert">
          {problem ||
            `السنة يجب أن تكون بين ${MIN_YEAR} و${MAX_YEAR}.`}
        </div>
      )}

      <Row className="g-2 align-items-end">
        <Col sm={6} md={4} lg={2}>
          <Form.Label htmlFor="rec-f-type" className="fs-12 mb-1">
            النوع
          </Form.Label>
          <Form.Select
            id="rec-f-type"
            value={filters.type}
            onChange={(e) => onChange({ type: e.target.value })}
          >
            <option value="">الكل</option>
            {RECORD_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </Form.Select>
        </Col>

        {triSelect("missing_checkout", "انصراف مفقود", "rec-f-missing")}
        {triSelect("is_corrected", "مصحَّح", "rec-f-corrected")}
        {triSelect("rejected", "مرفوض", "rec-f-rejected")}

        {filters.rejected === "1" && (
          <Col sm={6} md={4} lg={4}>
            <Form.Label htmlFor="rec-f-reason" className="fs-12 mb-1">
              سبب الرفض
            </Form.Label>
            <Form.Select
              id="rec-f-reason"
              value={filters.rejection_reason}
              onChange={(e) => onChange({ rejection_reason: e.target.value })}
            >
              <option value="">الكل</option>
              {REJECTION_REASON_OPTIONS.map((o) => (
                <option key={o.value} value={String(o.value)}>
                  {o.label}
                </option>
              ))}
            </Form.Select>
          </Col>
        )}
      </Row>

      <Row className="g-2 mt-0 align-items-end">
        {/* Renders nothing without hr.employees.view; the search box is then
            the way to find a person. */}
        {hasPermission(permissions, "hr.employees.view") && (
          <Col sm={6} md={4} lg={3}>
            <Form.Label htmlFor="rec-f-employee" className="fs-12 mb-1">
              الموظف
            </Form.Label>
            <EmployeePicker
              inputId="rec-f-employee"
              placeholder="الكل"
              value={filters.employee_id}
              onChange={(id) => onChange({ employee_id: id })}
            />
          </Col>
        )}

        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor="rec-f-dept" className="fs-12 mb-1">
            القسم
          </Form.Label>
          {canReadDepartments && !departments.error ? (
            <Select
              inputId="rec-f-dept"
              classNamePrefix="Select2"
              options={departments.options}
              value={pickDept || null}
              onChange={(opt) =>
                onChange({ department_id: opt ? opt.value : "" })
              }
              isClearable
              isLoading={departments.loading}
              placeholder="الكل"
              noOptionsMessage={() => "لا توجد أقسام"}
              menuPosition="fixed"
            />
          ) : (
            <Form.Control
              id="rec-f-dept"
              type="number"
              min={1}
              placeholder="معرّف القسم"
              value={filters.department_id}
              onChange={(e) => onChange({ department_id: e.target.value })}
              isInvalid={
                filters.department_id !== "" && !isPositiveId(filters.department_id)
              }
            />
          )}
        </Col>

        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor="rec-f-search" className="fs-12 mb-1">
            بحث
          </Form.Label>
          <Form.Control
            id="rec-f-search"
            type="search"
            maxLength={MAX_SEARCH}
            placeholder="الاسم أو الرقم الوظيفي"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </Col>

        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor="rec-f-sort" className="fs-12 mb-1">
            الترتيب
          </Form.Label>
          <Select
            inputId="rec-f-sort"
            classNamePrefix="Select2"
            options={SORT_OPTIONS}
            value={SORT_OPTIONS.find((o) => o.value === filters.sort) || null}
            onChange={(opt) => onChange({ sort: opt ? opt.value : "" })}
            isClearable
            placeholder="الأحدث أولاً"
            menuPosition="fixed"
          />
        </Col>
      </Row>
    </div>
  );
};

export default AttendanceRecordFilters;
