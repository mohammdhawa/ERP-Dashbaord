import React, { useEffect, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import Select from "react-select";
import { useSelector } from "react-redux";
import { hasPermission } from "../../data/permissionsCatalog";
import { STATUS_OPTIONS, ACTIVITY_TYPE_OPTIONS } from "../../data/hrEnums";
import { useResourceOptions } from "../departments/useResourceOptions";
import { EMPLOYEE_SORT_KEYS } from "../../redux/actions/employeesActions";

// SERVER-SIDE filter toolbar. Every control here maps to a documented query
// parameter; nothing is filtered in the browser. Only these six are sent:
// status, department_id, job_title_id, activity_type, search, sort.

const departmentToOption = (d) => ({
  value: d.id,
  label: d.name || `قسم #${d.id}`,
});
const jobTitleToOption = (t) => ({ value: t.id, label: t.name });

// Each sort key, ascending and descending. `full_name` is absent on purpose:
// it is a computed accessor the server cannot sort on, and asking for it is a
// 422 rather than a fallback to something sensible.
const SORT_LABELS = {
  employee_number: "الرقم الوظيفي",
  first_name: "الاسم الأول",
  last_name: "الكنية",
  hire_date: "تاريخ التعيين",
  created_at: "تاريخ الإضافة",
};
const SORT_OPTIONS = EMPLOYEE_SORT_KEYS.flatMap((key) => [
  { value: key, label: `${SORT_LABELS[key]} ↑` },
  { value: `-${key}`, label: `${SORT_LABELS[key]} ↓` },
]);

const EmployeeFilters = ({ filters, onChange, onReset }) => {
  const { permissions } = useSelector((state) => state.auth);

  const canReadDepartments = hasPermission(permissions, "departments.view");
  const canReadJobTitles = hasPermission(permissions, "hr.job_titles.view");
  // activity_type is one of the classification axes gated by viewSalary. A
  // caller who cannot READ the axis has no business filtering on it either —
  // the result set would leak exactly the value the gate hides.
  const canViewSalary = hasPermission(permissions, "hr.employees.viewSalary");

  const departments = useResourceOptions(
    "/departments",
    departmentToOption,
    canReadDepartments
  );
  const jobTitles = useResourceOptions(
    "/hr/job-titles",
    jobTitleToOption,
    canReadJobTitles
  );

  // `search` is debounced locally so typing does not fire a request per
  // keystroke; every other control commits immediately.
  const [searchDraft, setSearchDraft] = useState(filters.search || "");
  useEffect(() => {
    setSearchDraft(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    const draft = searchDraft;
    if (draft === (filters.search || "")) return undefined;
    const timer = setTimeout(() => onChange({ search: draft }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const hasAnyFilter =
    filters.status !== "" ||
    filters.department_id !== "" ||
    filters.job_title_id !== "" ||
    filters.activity_type !== "" ||
    (filters.search || "") !== "" ||
    (filters.sort || "") !== "";

  const pick = (options, value) =>
    options.find((o) => o.value === Number(value)) || null;

  return (
    <Row className="g-2 mb-3 align-items-end">
      <Col sm={12} md={4} lg={3}>
        <Form.Label htmlFor="emp-search" className="fs-12 mb-1">
          بحث
        </Form.Label>
        <Form.Control
          id="emp-search"
          type="search"
          placeholder="الاسم أو الرقم الوظيفي أو الرقم القديم"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
        />
      </Col>

      <Col sm={6} md={4} lg={2}>
        <Form.Label htmlFor="emp-f-status" className="fs-12 mb-1">
          الحالة
        </Form.Label>
        <Select
          inputId="emp-f-status"
          classNamePrefix="Select2"
          options={STATUS_OPTIONS}
          value={pick(STATUS_OPTIONS, filters.status)}
          onChange={(opt) => onChange({ status: opt ? opt.value : "" })}
          isClearable
          placeholder="الكل"
          menuPosition="fixed"
        />
      </Col>

      <Col sm={6} md={4} lg={2}>
        <Form.Label htmlFor="emp-f-dept" className="fs-12 mb-1">
          القسم
        </Form.Label>
        {canReadDepartments && !departments.error ? (
          <Select
            inputId="emp-f-dept"
            classNamePrefix="Select2"
            options={departments.options}
            value={pick(departments.options, filters.department_id)}
            onChange={(opt) => onChange({ department_id: opt ? opt.value : "" })}
            isClearable
            isLoading={departments.loading}
            placeholder="الكل"
            noOptionsMessage={() => "لا توجد أقسام"}
            menuPosition="fixed"
          />
        ) : (
          <Form.Control
            id="emp-f-dept"
            type="number"
            min={1}
            placeholder="معرّف القسم"
            value={filters.department_id}
            onChange={(e) => onChange({ department_id: e.target.value })}
          />
        )}
      </Col>

      <Col sm={6} md={4} lg={2}>
        <Form.Label htmlFor="emp-f-title" className="fs-12 mb-1">
          المسمى الوظيفي
        </Form.Label>
        {canReadJobTitles && !jobTitles.error ? (
          <Select
            inputId="emp-f-title"
            classNamePrefix="Select2"
            options={jobTitles.options}
            value={pick(jobTitles.options, filters.job_title_id)}
            onChange={(opt) => onChange({ job_title_id: opt ? opt.value : "" })}
            isClearable
            isLoading={jobTitles.loading}
            placeholder="الكل"
            noOptionsMessage={() => "لا توجد مسميات"}
            menuPosition="fixed"
          />
        ) : (
          // No hr.job_titles.view: say so rather than invent a lookup.
          <Form.Control
            id="emp-f-title"
            type="number"
            min={1}
            placeholder="معرّف المسمى"
            value={filters.job_title_id}
            onChange={(e) => onChange({ job_title_id: e.target.value })}
          />
        )}
      </Col>

      {canViewSalary && (
        <Col sm={6} md={4} lg={2}>
          <Form.Label htmlFor="emp-f-activity" className="fs-12 mb-1">
            نوع النشاط
          </Form.Label>
          <Select
            inputId="emp-f-activity"
            classNamePrefix="Select2"
            options={ACTIVITY_TYPE_OPTIONS}
            value={pick(ACTIVITY_TYPE_OPTIONS, filters.activity_type)}
            onChange={(opt) => onChange({ activity_type: opt ? opt.value : "" })}
            isClearable
            placeholder="الكل"
            menuPosition="fixed"
          />
        </Col>
      )}

      <Col sm={6} md={4} lg={2}>
        <Form.Label htmlFor="emp-f-sort" className="fs-12 mb-1">
          الترتيب
        </Form.Label>
        <Select
          inputId="emp-f-sort"
          classNamePrefix="Select2"
          options={SORT_OPTIONS}
          value={SORT_OPTIONS.find((o) => o.value === filters.sort) || null}
          onChange={(opt) => onChange({ sort: opt ? opt.value : "" })}
          isClearable
          placeholder="الافتراضي"
          menuPosition="fixed"
        />
      </Col>

      {hasAnyFilter && (
        <Col xs="auto">
          <button
            type="button"
            className="btn btn-light btn-wave"
            onClick={onReset}
          >
            <i className="ri-filter-off-line align-middle me-1"></i>
            مسح الفلاتر
          </button>
        </Col>
      )}
    </Row>
  );
};

export default EmployeeFilters;
