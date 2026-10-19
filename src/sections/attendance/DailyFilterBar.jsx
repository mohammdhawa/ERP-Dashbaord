import React, { useEffect, useMemo, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import Select from "react-select";
import { useSelector } from "react-redux";
import EmployeePicker from "../../components/EmployeePicker";
import { DAILY_SORT_KEYS } from "../../redux/actions/attendanceParams";
import { hasPermission } from "../../data/permissionsCatalog";
import {
  departmentToOption,
  useResourceOptions,
} from "../departments/useResourceOptions";
import { MAX_SEARCH, isPositiveId } from "../../utils/filterValues";

// فلاتر التقرير اليومي (API doc §14.1, and §14.4 for absent-today): the day, the person filters and the
// sort. Controlled by the screen, which owns the filter object and the URL.

const SORT_LABELS = {
  employee_name: "اسم الموظف",
  department: "القسم",
  status: "الحالة",
  employee_number: "الرقم الوظيفي",
  check_in_time: "وقت الحضور",
  check_out_time: "وقت الانصراف",
  work_hours: "ساعات العمل",
};
// Both directions of every key, as the other attendance lists offer them.
const sortOptionsFor = (keys) =>
  keys.flatMap((key) => [
    { value: key, label: `${SORT_LABELS[key]} ↑` },
    { value: `-${key}`, label: `${SORT_LABELS[key]} ↓` },
  ]);
const DAILY_SORT_OPTIONS = sortOptionsFor(DAILY_SORT_KEYS);

// `sortKeys` is the server's sort vocabulary of the list the bar sits over —
// the daily board's by default, absent-today passes its own.
const DailyFilterBar = ({
  filters,
  defaults,
  problem,
  onChange,
  onReset,
  sortKeys,
}) => {
  const sortOptions = useMemo(
    () => (sortKeys ? sortOptionsFor(sortKeys) : DAILY_SORT_OPTIONS),
    [sortKeys]
  );
  const { permissions } = useSelector((state) => state.auth);
  const canReadDepartments = hasPermission(permissions, "departments.view");
  const departments = useResourceOptions(
    "/departments",
    departmentToOption,
    canReadDepartments
  );

  // `search` is debounced; every other control commits at once.
  const [searchDraft, setSearchDraft] = useState(filters.search);
  useEffect(() => setSearchDraft(filters.search), [filters.search]);
  useEffect(() => {
    if (searchDraft === filters.search) return undefined;
    const timer = setTimeout(() => onChange({ search: searchDraft }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const pickDept = departments.options.find(
    (o) => o.value === Number(filters.department_id)
  );

  // Typed-but-uncommitted text counts, so «مسح الفلاتر» is there for it too.
  const hasAnyFilter =
    Object.keys(defaults).some((key) => filters[key] !== defaults[key]) ||
    searchDraft !== defaults.search;

  return (
    <div className="mb-3">
      <Row className="g-2 align-items-end">
        <Col sm={6} md={3} lg={2}>
          <Form.Label htmlFor="daily-f-date" className="fs-12 mb-1">
            اليوم
          </Form.Label>
          <Form.Control
            id="daily-f-date"
            type="date"
            value={filters.date}
            onChange={(e) => onChange({ date: e.target.value })}
            isInvalid={Boolean(problem)}
          />
        </Col>

        {hasPermission(permissions, "hr.employees.view") && (
          <Col sm={6} md={4} lg={3}>
            <Form.Label htmlFor="daily-f-employee" className="fs-12 mb-1">
              الموظف
            </Form.Label>
            <EmployeePicker
              inputId="daily-f-employee"
              placeholder="الكل"
              value={filters.employee_id}
              onChange={(id) => onChange({ employee_id: id })}
            />
          </Col>
        )}

        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor="daily-f-dept" className="fs-12 mb-1">
            القسم
          </Form.Label>
          {canReadDepartments && !departments.error ? (
            <Select
              inputId="daily-f-dept"
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
              id="daily-f-dept"
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
          <Form.Label htmlFor="daily-f-search" className="fs-12 mb-1">
            بحث
          </Form.Label>
          <Form.Control
            id="daily-f-search"
            type="search"
            maxLength={MAX_SEARCH}
            placeholder="الاسم أو الرقم الوظيفي"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </Col>

        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor="daily-f-sort" className="fs-12 mb-1">
            الترتيب
          </Form.Label>
          <Select
            inputId="daily-f-sort"
            classNamePrefix="Select2"
            options={sortOptions}
            value={sortOptions.find((o) => o.value === filters.sort) || null}
            onChange={(opt) => onChange({ sort: opt ? opt.value : "" })}
            isClearable
            placeholder="الافتراضي"
            menuPosition="fixed"
          />
        </Col>

        {hasAnyFilter && (
          <Col xs="auto" className="ms-auto">
            <button
              type="button"
              className="btn btn-light btn-wave"
              onClick={() => {
                // The draft is plain local state: a reset that left it would
                // show the old text over a cleared filter.
                setSearchDraft(defaults.search);
                onReset();
              }}
            >
              <i className="ri-filter-off-line align-middle me-1"></i>
              مسح الفلاتر
            </button>
          </Col>
        )}
      </Row>

      {problem && (
        <div className="text-danger fs-13 mt-2" role="alert">
          {problem}
        </div>
      )}
    </div>
  );
};

export default DailyFilterBar;
