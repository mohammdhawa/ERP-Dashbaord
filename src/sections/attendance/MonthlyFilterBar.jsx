import React, { useEffect, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import Select from "react-select";
import { useSelector } from "react-redux";
import EmployeePicker from "../../components/EmployeePicker";
import { hasPermission } from "../../data/permissionsCatalog";
import {
  departmentToOption,
  useResourceOptions,
} from "../departments/useResourceOptions";
import { MONTHLY_MODES } from "./monthlyFilters";
import {
  MAX_YEAR,
  MIN_YEAR,
  MONTH_OPTIONS,
  isValidYear,
} from "./recordFilters";
import { MAX_SEARCH, isPositiveId } from "../../utils/filterValues";

// فلاتر التقرير الشهري (API doc §14.2): the window, the two row filters and the
// person filters. Controlled by the screen, which owns the filter object and
// the URL; the sort lives in the column headers.
//
// `problem` is monthlyProblem()'s verdict. While it is set the report is not
// requested, so it is shown here beside the inputs that caused it.

const MonthlyFilterBar = ({ filters, defaults, problem, onChange, onReset }) => {
  const { permissions } = useSelector((state) => state.auth);
  const canReadDepartments = hasPermission(permissions, "departments.view");
  const departments = useResourceOptions(
    "/departments",
    departmentToOption,
    canReadDepartments
  );

  // `search` is debounced and `year` committed only once it is a valid year (a
  // half-typed "20" would be a 422); every other control commits at once.
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
    // old text over a cleared filter.
    setSearchDraft(defaults.search);
    setYearDraft(defaults.year);
    onReset();
  };

  const setMode = (mode) => {
    // An abandoned half-typed year must not follow the user into the next mode.
    setYearDraft(filters.year);
    onChange({ mode });
  };

  return (
    <div className="mb-3">
      <Row className="g-2 mb-2 align-items-end">
        <Col xs="auto">
          <div className="fs-12 mb-1" id="mon-f-mode-label">
            عرض
          </div>
          <div className="btn-group" role="group" aria-labelledby="mon-f-mode-label">
            {MONTHLY_MODES.map((m) => (
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

        {filters.mode === "range" ? (
          <>
            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="mon-f-from" className="fs-12 mb-1">
                من تاريخ
              </Form.Label>
              <Form.Control
                id="mon-f-from"
                type="date"
                value={filters.from}
                onChange={(e) => onChange({ from: e.target.value })}
                isInvalid={Boolean(problem)}
              />
            </Col>
            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="mon-f-to" className="fs-12 mb-1">
                إلى تاريخ
              </Form.Label>
              <Form.Control
                id="mon-f-to"
                type="date"
                value={filters.to}
                onChange={(e) => onChange({ to: e.target.value })}
                isInvalid={Boolean(problem)}
              />
            </Col>
          </>
        ) : (
          <>
            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="mon-f-month" className="fs-12 mb-1">
                الشهر
              </Form.Label>
              <Select
                inputId="mon-f-month"
                classNamePrefix="Select2"
                options={MONTH_OPTIONS}
                value={monthOption || null}
                onChange={(opt) => opt && onChange({ month: opt.value })}
                isSearchable={false}
                menuPosition="fixed"
              />
            </Col>
            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="mon-f-year" className="fs-12 mb-1">
                السنة
              </Form.Label>
              <Form.Control
                id="mon-f-year"
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
            <button type="button" className="btn btn-light btn-wave" onClick={reset}>
              <i className="ri-filter-off-line align-middle me-1"></i>
              مسح الفلاتر
            </button>
          </Col>
        )}
      </Row>

      {(problem || (filters.mode === "month" && yearInvalid)) && (
        <div className="text-danger fs-13 mb-2" role="alert">
          {problem || `السنة يجب أن تكون بين ${MIN_YEAR} و${MAX_YEAR}.`}
        </div>
      )}

      <Row className="g-2 align-items-end">
        {hasPermission(permissions, "hr.employees.view") && (
          <Col sm={6} md={4} lg={3}>
            <Form.Label htmlFor="mon-f-employee" className="fs-12 mb-1">
              الموظف
            </Form.Label>
            <EmployeePicker
              inputId="mon-f-employee"
              placeholder="الكل"
              value={filters.employee_id}
              onChange={(id) => onChange({ employee_id: id })}
            />
          </Col>
        )}

        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor="mon-f-dept" className="fs-12 mb-1">
            القسم
          </Form.Label>
          {canReadDepartments && !departments.error ? (
            <Select
              inputId="mon-f-dept"
              classNamePrefix="Select2"
              options={departments.options}
              value={pickDept || null}
              onChange={(opt) => onChange({ department_id: opt ? opt.value : "" })}
              isClearable
              isLoading={departments.loading}
              placeholder="الكل"
              noOptionsMessage={() => "لا توجد أقسام"}
              menuPosition="fixed"
            />
          ) : (
            <Form.Control
              id="mon-f-dept"
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
          <Form.Label htmlFor="mon-f-search" className="fs-12 mb-1">
            بحث
          </Form.Label>
          <Form.Control
            id="mon-f-search"
            type="search"
            maxLength={MAX_SEARCH}
            placeholder="الاسم أو الرقم الوظيفي"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </Col>

        {/* The two row filters only ever narrow (true or not sent), so they are
            switches; the server recomputes the totals over what is left. */}
        <Col xs="auto">
          <Form.Check
            type="switch"
            id="mon-f-absences"
            label="من لديهم غياب فقط"
            checked={filters.has_absences === "1"}
            onChange={(e) => onChange({ has_absences: e.target.checked ? "1" : "" })}
          />
        </Col>
        <Col xs="auto">
          <Form.Check
            type="switch"
            id="mon-f-missing"
            label="من لديهم انصراف مفقود فقط"
            checked={filters.has_missing_checkouts === "1"}
            onChange={(e) =>
              onChange({ has_missing_checkouts: e.target.checked ? "1" : "" })
            }
          />
        </Col>
      </Row>
    </div>
  );
};

export default MonthlyFilterBar;
