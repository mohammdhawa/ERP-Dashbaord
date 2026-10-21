import React, { useEffect, useMemo, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import Select from "react-select";
import { useSelector } from "react-redux";
import EmployeePicker from "../../components/EmployeePicker";
import { REGISTER_SORT_KEYS } from "../../redux/actions/leaveParams";
import { hasPermission } from "../../data/permissionsCatalog";
import {
  EXCUSE_FILTER_OPTIONS,
  LEAVE_STATUS_OPTIONS,
} from "../../data/leaveEnums";
import { MAX_SEARCH, isPositiveId } from "../../utils/filterValues";
import {
  departmentToOption,
  useResourceOptions,
} from "../departments/useResourceOptions";
import {
  MAX_YEAR,
  MIN_YEAR,
  MONTH_OPTIONS,
  WINDOW_MODES,
} from "./registerFilters";
import useLeaveTypeOptions from "./useLeaveTypeOptions";

// فلاتر سجل الإجازات (API doc §16.8). Controlled by the screen, which owns the
// filter object, the URL and the fetch; this only edits it.
//
// `problem` is windowProblem()'s verdict. While it is set the register is not
// requested, so it is shown here, beside the inputs that caused it.

const SORT_LABELS = {
  start_date: "تاريخ البداية",
  end_date: "تاريخ النهاية",
  requested_days: "عدد الأيام",
  created_at: "تاريخ التسجيل",
  employee_name: "اسم الموظف",
  id: "رقم الطلب",
};
// Both directions of every key, as the employees list offers them.
const SORT_OPTIONS = REGISTER_SORT_KEYS.flatMap((key) => [
  { value: key, label: `${SORT_LABELS[key]} ↑` },
  { value: `-${key}`, label: `${SORT_LABELS[key]} ↓` },
]);

const STATUS_OPTIONS = LEAVE_STATUS_OPTIONS.map((o) => ({
  value: String(o.value),
  label: o.label,
}));

const csv = (value) =>
  String(value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v !== "");

const LeaveRegisterFilters = ({
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

  // Requests and excuses alike — the register holds both.
  const types = useLeaveTypeOptions();

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
    const n = Number(yearDraft);
    if (Number.isInteger(n) && n >= MIN_YEAR && n <= MAX_YEAR) {
      onChange({ year: String(n) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearDraft]);

  const selectedStatuses = useMemo(
    () => STATUS_OPTIONS.filter((o) => csv(filters.statuses).includes(o.value)),
    [filters.statuses]
  );
  const selectedTypes = useMemo(
    () =>
      types.options.filter((o) => csv(filters.leave_type_ids).includes(o.value)),
    [types.options, filters.leave_type_ids]
  );
  const pickDept = departments.options.find(
    (o) => o.value === Number(filters.department_id)
  );
  const monthOption = MONTH_OPTIONS.find(
    (o) => o.value === String(Number(filters.month))
  );

  const hasAnyFilter = Object.keys(defaults).some(
    (key) => filters[key] !== defaults[key]
  );

  return (
    <div className="mb-3">
      <Row className="g-2 mb-2 align-items-end">
        <Col xs="auto">
          <div className="fs-12 mb-1" id="reg-f-mode-label">
            عرض
          </div>
          <div
            className="btn-group"
            role="group"
            aria-labelledby="reg-f-mode-label"
          >
            {WINDOW_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`btn ${
                  filters.mode === m.value ? "btn-primary" : "btn-outline-primary"
                }`}
                aria-pressed={filters.mode === m.value}
                onClick={() => onChange({ mode: m.value })}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Col>

        {filters.mode === "month" && (
          <Col sm={6} md={3} lg={2}>
            <Form.Label htmlFor="reg-f-month" className="fs-12 mb-1">
              الشهر
            </Form.Label>
            <Select
              inputId="reg-f-month"
              classNamePrefix="Select2"
              options={MONTH_OPTIONS}
              value={monthOption || null}
              onChange={(opt) => opt && onChange({ month: opt.value })}
              isSearchable={false}
              menuPosition="fixed"
            />
          </Col>
        )}

        {filters.mode !== "range" && (
          <Col sm={6} md={3} lg={2}>
            <Form.Label htmlFor="reg-f-year" className="fs-12 mb-1">
              السنة
            </Form.Label>
            <Form.Control
              id="reg-f-year"
              type="number"
              min={MIN_YEAR}
              max={MAX_YEAR}
              value={yearDraft}
              onChange={(e) => setYearDraft(e.target.value)}
              isInvalid={Boolean(problem)}
            />
          </Col>
        )}

        {filters.mode === "range" && (
          <>
            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="reg-f-from" className="fs-12 mb-1">
                من تاريخ
              </Form.Label>
              <Form.Control
                id="reg-f-from"
                type="date"
                value={filters.from}
                onChange={(e) => onChange({ from: e.target.value })}
                isInvalid={Boolean(problem)}
              />
            </Col>
            <Col sm={6} md={3} lg={2}>
              <Form.Label htmlFor="reg-f-to" className="fs-12 mb-1">
                إلى تاريخ
              </Form.Label>
              <Form.Control
                id="reg-f-to"
                type="date"
                value={filters.to}
                onChange={(e) => onChange({ to: e.target.value })}
                isInvalid={Boolean(problem)}
              />
            </Col>
          </>
        )}

        {hasAnyFilter && (
          <Col xs="auto" className="ms-auto">
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

      {problem && (
        <div className="text-danger fs-13 mb-2" role="alert">
          {problem}
        </div>
      )}

      <Row className="g-2 align-items-end">
        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor="reg-f-status" className="fs-12 mb-1">
            الحالة
          </Form.Label>
          <Select
            inputId="reg-f-status"
            classNamePrefix="Select2"
            isMulti
            options={STATUS_OPTIONS}
            value={selectedStatuses}
            onChange={(opts) =>
              onChange({ statuses: (opts || []).map((o) => o.value).join(",") })
            }
            // Empty means the server's own default, which is approved only.
            placeholder="معتمدة"
            menuPosition="fixed"
          />
        </Col>

        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor="reg-f-type" className="fs-12 mb-1">
            النوع
          </Form.Label>
          <Select
            inputId="reg-f-type"
            classNamePrefix="Select2"
            isMulti
            options={types.options}
            value={selectedTypes}
            onChange={(opts) =>
              onChange({
                leave_type_ids: (opts || []).map((o) => o.value).join(","),
              })
            }
            isLoading={types.loading}
            placeholder="الكل"
            noOptionsMessage={() => "لا توجد أنواع"}
            menuPosition="fixed"
          />
          {types.error && (
            <div className="fs-12 text-danger mt-1">
              {types.error}{" "}
              <button
                type="button"
                className="btn btn-link btn-sm p-0 align-baseline"
                onClick={types.reload}
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </Col>

        <Col sm={6} md={4} lg={2}>
          <Form.Label htmlFor="reg-f-source" className="fs-12 mb-1">
            المصدر
          </Form.Label>
          <Form.Select
            id="reg-f-source"
            value={filters.is_excuse}
            onChange={(e) => onChange({ is_excuse: e.target.value })}
          >
            {EXCUSE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Form.Select>
        </Col>

        {/* Renders nothing without hr.employees.view; the search box is then
            the way to find a person. */}
        {hasPermission(permissions, "hr.employees.view") && (
          <Col sm={6} md={4} lg={3}>
            <Form.Label htmlFor="reg-f-employee" className="fs-12 mb-1">
              الموظف
            </Form.Label>
            <EmployeePicker
              inputId="reg-f-employee"
              placeholder="الكل"
              value={filters.employee_id}
              onChange={(id) => onChange({ employee_id: id })}
            />
          </Col>
        )}

        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor="reg-f-dept" className="fs-12 mb-1">
            القسم
          </Form.Label>
          {canReadDepartments && !departments.error ? (
            <Select
              inputId="reg-f-dept"
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
              id="reg-f-dept"
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
          <Form.Label htmlFor="reg-f-search" className="fs-12 mb-1">
            بحث
          </Form.Label>
          <Form.Control
            id="reg-f-search"
            type="search"
            maxLength={MAX_SEARCH}
            placeholder="الاسم أو الرقم الوظيفي"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </Col>

        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor="reg-f-sort" className="fs-12 mb-1">
            الترتيب
          </Form.Label>
          <Select
            inputId="reg-f-sort"
            classNamePrefix="Select2"
            options={SORT_OPTIONS}
            value={SORT_OPTIONS.find((o) => o.value === filters.sort) || null}
            onChange={(opt) => onChange({ sort: opt ? opt.value : "" })}
            isClearable
            placeholder="الافتراضي"
            menuPosition="fixed"
          />
        </Col>
      </Row>
    </div>
  );
};

export default LeaveRegisterFilters;
