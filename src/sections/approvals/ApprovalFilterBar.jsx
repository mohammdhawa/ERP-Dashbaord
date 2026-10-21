import React, { useEffect, useMemo, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import Select from "react-select";
import { useSelector } from "react-redux";
import { hasPermission } from "../../data/permissionsCatalog";
import { MAX_SEARCH, isPositiveId } from "../../utils/filterValues";
import {
  departmentToOption,
  useResourceOptions,
} from "../departments/useResourceOptions";
import useLeaveTypeOptions from "../leave/useLeaveTypeOptions";
import { hasAnyApprovalFilter } from "./approvalFilters";

// فلاتر قوائم الاعتماد (API doc §15.2, §15.7) — the inbox's and «كل الطلبات»'s.
// Controlled by the screen, which owns the filter object, the URL and the
// fetch; this only edits it. The status control appears only when the filter
// object has `statuses` (the HR list); the inbox's tabs are its status.
//
// `problem` is approvalFiltersProblem()'s verdict. While it is set the list is
// not requested, so it is shown here, beside the dates that caused it.

const SORT_LABELS = {
  submitted_at: "تاريخ التقديم",
  decided_at: "تاريخ القرار",
  employee_name: "اسم مقدّم الطلب",
};

// The approval's status (§15.1), as the server labels it (ApprovalStatus).
const STATUS_OPTIONS = [
  { value: "1", label: "قيد الاعتماد" },
  { value: "2", label: "موافق عليه" },
  { value: "3", label: "مرفوض" },
  { value: "4", label: "مسحوب" },
];

const csv = (value) =>
  String(value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v !== "");

const ApprovalFilterBar = ({
  idPrefix,
  filters,
  defaults,
  sortKeys,
  problem,
  onChange,
  onReset,
}) => {
  const { permissions } = useSelector((state) => state.auth);
  const canReadDepartments = hasPermission(permissions, "departments.view");
  const departments = useResourceOptions(
    "/departments",
    departmentToOption,
    canReadDepartments
  );
  const types = useLeaveTypeOptions();

  const sortOptions = useMemo(
    () =>
      sortKeys.flatMap((key) => [
        { value: key, label: `${SORT_LABELS[key]} ↑` },
        { value: `-${key}`, label: `${SORT_LABELS[key]} ↓` },
      ]),
    [sortKeys]
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

  const hasStatuses = "statuses" in filters;
  const selectedStatuses = STATUS_OPTIONS.filter((o) =>
    csv(filters.statuses).includes(o.value)
  );
  const selectedTypes = types.options.filter((o) =>
    csv(filters.leave_type_ids).includes(o.value)
  );
  const pickDept = departments.options.find(
    (o) => o.value === Number(filters.department_id)
  );
  // Typed-but-uncommitted text counts, so «مسح الفلاتر» is there for it too.
  const showReset =
    hasAnyApprovalFilter(filters, defaults) || searchDraft !== defaults.search;

  const id = (name) => `${idPrefix}-${name}`;
  const dateInput = (key, label) => (
    <Col sm={6} md={3} lg={2}>
      <Form.Label htmlFor={id(key)} className="fs-12 mb-1">
        {label}
      </Form.Label>
      <Form.Control
        id={id(key)}
        type="date"
        value={filters[key]}
        onChange={(e) => onChange({ [key]: e.target.value })}
        isInvalid={Boolean(problem)}
      />
    </Col>
  );

  return (
    <div className="mb-3">
      <Row className="g-2 mb-2 align-items-end">
        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor={id("search")} className="fs-12 mb-1">
            بحث
          </Form.Label>
          <Form.Control
            id={id("search")}
            type="search"
            maxLength={MAX_SEARCH}
            placeholder="اسم مقدّم الطلب أو رقمه الوظيفي"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </Col>

        {hasStatuses && (
          <Col sm={6} md={4} lg={3}>
            <Form.Label htmlFor={id("status")} className="fs-12 mb-1">
              الحالة
            </Form.Label>
            <Select
              inputId={id("status")}
              classNamePrefix="Select2"
              isMulti
              options={STATUS_OPTIONS}
              value={selectedStatuses}
              onChange={(opts) =>
                onChange({
                  statuses: (opts || []).map((o) => o.value).join(","),
                })
              }
              // Empty is the server's default: every status.
              placeholder="الكل"
              menuPosition="fixed"
            />
          </Col>
        )}

        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor={id("dept")} className="fs-12 mb-1">
            القسم
          </Form.Label>
          {canReadDepartments && !departments.error ? (
            <Select
              inputId={id("dept")}
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
              id={id("dept")}
              type="number"
              min={1}
              placeholder="معرّف القسم"
              value={filters.department_id}
              onChange={(e) => onChange({ department_id: e.target.value })}
              isInvalid={
                filters.department_id !== "" &&
                !isPositiveId(filters.department_id)
              }
            />
          )}
        </Col>

        <Col sm={6} md={4} lg={3}>
          <Form.Label htmlFor={id("type")} className="fs-12 mb-1">
            نوع الإجازة
          </Form.Label>
          <Select
            inputId={id("type")}
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
      </Row>

      <Row className="g-2 align-items-end">
        {dateInput("date_from", "الإجازة من")}
        {dateInput("date_to", "الإجازة إلى")}
        {dateInput("submitted_from", "قُدِّم من")}
        {dateInput("submitted_to", "قُدِّم إلى")}

        <Col sm={6} md={4} lg={2}>
          <Form.Label htmlFor={id("sort")} className="fs-12 mb-1">
            الترتيب
          </Form.Label>
          <Select
            inputId={id("sort")}
            classNamePrefix="Select2"
            options={sortOptions}
            value={sortOptions.find((o) => o.value === filters.sort) || null}
            onChange={(opt) => onChange({ sort: opt ? opt.value : "" })}
            isClearable
            placeholder="الأحدث أولاً"
            menuPosition="fixed"
          />
        </Col>

        {showReset && (
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

export default ApprovalFilterBar;
