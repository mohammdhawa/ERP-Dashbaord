import React, {
  Fragment,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Form, Row } from "react-bootstrap";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import EmployeePicker from "../../components/EmployeePicker";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import { hasPermission } from "../../data/permissionsCatalog";
import {
  departmentToOption,
  useResourceOptions,
} from "../departments/useResourceOptions";
import {
  balancesViewKey,
  fetchBalances,
} from "../../redux/actions/leaveBalancesActions";
import { MAX_SEARCH, isPositiveId } from "../../utils/filterValues";
import {
  balancesFiltersFromSearch,
  currentYear,
  defaultBalanceFilters,
} from "./balancesFilters";
import { MAX_YEAR, MIN_YEAR, isValidYear } from "./registerFilters";

const EditBalanceModal = lazy(() => import("./EditBalanceModal"));

// الأرصدة — HR's leave balances (API doc §16.2).
//
// Filters live in the URL like the employees list. The server sorts only by
// employee_name / employee_number (either direction); both the column headers
// and the «الترتيب» select write the one `sort` field.

const PER_PAGE = 15;

const dash = <span className="text-muted">—</span>;

const SORT_OPTIONS = [
  { value: "employee_name", label: "الاسم ↑" },
  { value: "-employee_name", label: "الاسم ↓" },
  { value: "employee_number", label: "الرقم الوظيفي ↑" },
  { value: "-employee_number", label: "الرقم الوظيفي ↓" },
];

const columns = [
  {
    key: "employee",
    label: "الموظف",
    sortKey: "employee_name",
    render: (employee) =>
      employee ? (
        <>
          <div>{employee.full_name}</div>
          {employee.employee_number && (
            <div className="text-muted fs-12" dir="ltr">
              {employee.employee_number}
            </div>
          )}
        </>
      ) : (
        dash
      ),
  },
  {
    key: "department",
    label: "القسم",
    render: (department) =>
      department?.name ? (
        <span className="badge bg-info-transparent">{department.name}</span>
      ) : (
        dash
      ),
  },
  {
    // Allocation PLUS adjustment (§16.2); the default applies when !is_custom.
    key: "allocated_days",
    label: "المخصّص",
    render: (value, row) => (
      <>
        {value}
        {!row.is_custom && (
          <span className="badge bg-light text-default ms-1">افتراضي</span>
        )}
      </>
    ),
  },
  { key: "adjustment_days", label: "التعديل" },
  { key: "used_days", label: "المستخدم" },
  { key: "remaining_days", label: "المتبقي" },
  {
    key: "over_balance_days",
    label: "تجاوز الرصيد",
    render: (value) =>
      value > 0 ? (
        <span className="badge bg-danger-transparent fw-semibold">{value}</span>
      ) : (
        value
      ),
  },
  { key: "non_deducting_days", label: "بدون خصم" },
  {
    key: "note",
    label: "ملاحظة",
    render: (value) =>
      value ? <span className="text-wrap d-inline-block">{value}</span> : dash,
  },
];

const LeaveBalances = () => {
  const dispatch = useDispatch();
  const { items, meta, extra, fetchLoading, error, loadedKey } = useSelector(
    (state) => state.leaveBalances
  );
  const { permissions } = useSelector((state) => state.auth);
  const canUpdate = hasPermission(permissions, "leave.balances.update");
  const canReadDepartments = hasPermission(permissions, "departments.view");

  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(PER_PAGE);
  // Every URL value is checked: a hand-edited link must not become a 422.
  const [filters, setFilters] = useState(() =>
    balancesFiltersFromSearch(
      (key) => searchParams.get(key),
      defaultBalanceFilters()
    )
  );

  // The URL is written back as well as read, so a filtered view survives a
  // refresh and the back button; `replace` stops typing from stacking history.
  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value != null) next.set(key, value);
    });
    if (page > 1) next.set("page", String(page));
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const handleFilterChange = (patch) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };
  const handleFilterReset = () => {
    setPage(1);
    setFilters(defaultBalanceFilters());
  };

  // `search` and `year` are typed: commit them after a pause (search) or once
  // they are a valid year (a half-typed "20" would be a 422), not per keystroke.
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [yearDraft, setYearDraft] = useState(filters.year);
  useEffect(() => setSearchDraft(filters.search), [filters.search]);
  useEffect(() => setYearDraft(filters.year), [filters.year]);

  useEffect(() => {
    if (searchDraft === filters.search) return undefined;
    const timer = setTimeout(
      () => handleFilterChange({ search: searchDraft }),
      400
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  useEffect(() => {
    if (yearDraft === filters.year) return;
    if (isValidYear(yearDraft)) {
      handleFilterChange({ year: String(Number(yearDraft)) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearDraft]);

  const departments = useResourceOptions(
    "/departments",
    departmentToOption,
    canReadDepartments
  );

  const viewKey = balancesViewKey(page, itemsPerPage, filters);
  // Filter edits change the view BEFORE the fetch starts, so for a moment the
  // store still holds the previous view's rows; they are shown only when the
  // store's `loadedKey` is exactly this view.
  const settled = loadedKey === viewKey;

  const load = useCallback(
    () => dispatch(fetchBalances(page, itemsPerPage, filters)),
    [dispatch, page, itemsPerPage, filters]
  );
  useEffect(() => {
    load();
  }, [load]);

  // A page that no longer exists (the list shrank) snaps back to the last one.
  useEffect(() => {
    if (settled && meta && meta.last_page >= 1 && page > meta.last_page) {
      setPage(meta.last_page);
    }
  }, [settled, meta, page]);

  // Rows have no `id` of their own; the table keys them by it.
  const rows = useMemo(
    () => (settled ? items : []).map((r) => ({ ...r, id: r.employee?.id })),
    [settled, items]
  );

  const [editing, setEditing] = useState(null);
  const handleSaved = () => {
    setEditing(null);
    load();
  };

  // The year shown is the one the server answered for; the filter's own value
  // is what the edit must target, and they agree once settled.
  const shownYear = settled && extra?.year ? extra.year : filters.year;

  const pickDept = departments.options.find(
    (o) => o.value === Number(filters.department_id)
  );
  const hasAnyFilter =
    filters.year !== currentYear() ||
    filters.employee_id !== "" ||
    filters.department_id !== "" ||
    filters.search !== "" ||
    filters.sort !== "";

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | الأرصدة</title>
      </Helmet>
      <PageHeader homepage="الأرصدة" activepage="الإجازات" page="الأرصدة" />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              {settled && extra?.default_days != null && (
                <div className="text-muted mb-3">
                  الرصيد الافتراضي: {extra.default_days} يوماً
                </div>
              )}

              <Row className="g-2 mb-3 align-items-end">
                <Col sm={6} md={3} lg={2}>
                  <Form.Label htmlFor="bal-f-year" className="fs-12 mb-1">
                    السنة
                  </Form.Label>
                  <Form.Control
                    id="bal-f-year"
                    type="number"
                    min={MIN_YEAR}
                    max={MAX_YEAR}
                    value={yearDraft}
                    onChange={(e) => setYearDraft(e.target.value)}
                  />
                </Col>

                <Col sm={6} md={3} lg={3}>
                  <Form.Label htmlFor="bal-f-search" className="fs-12 mb-1">
                    بحث
                  </Form.Label>
                  <Form.Control
                    id="bal-f-search"
                    type="search"
                    maxLength={MAX_SEARCH}
                    placeholder="الاسم أو الرقم الوظيفي"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                  />
                </Col>

                {/* Renders nothing without hr.employees.view; the search box
                    above is then the way to find a person. */}
                {hasPermission(permissions, "hr.employees.view") && (
                  <Col sm={6} md={3} lg={3}>
                    <Form.Label htmlFor="bal-f-employee" className="fs-12 mb-1">
                      الموظف
                    </Form.Label>
                    <EmployeePicker
                      inputId="bal-f-employee"
                      placeholder="الكل"
                      value={filters.employee_id}
                      onChange={(id) => handleFilterChange({ employee_id: id })}
                    />
                  </Col>
                )}

                <Col sm={6} md={3} lg={2}>
                  <Form.Label htmlFor="bal-f-dept" className="fs-12 mb-1">
                    القسم
                  </Form.Label>
                  {canReadDepartments && !departments.error ? (
                    <Select
                      inputId="bal-f-dept"
                      classNamePrefix="Select2"
                      options={departments.options}
                      value={pickDept || null}
                      onChange={(opt) =>
                        handleFilterChange({
                          department_id: opt ? opt.value : "",
                        })
                      }
                      isClearable
                      isLoading={departments.loading}
                      placeholder="الكل"
                      noOptionsMessage={() => "لا توجد أقسام"}
                      menuPosition="fixed"
                    />
                  ) : (
                    <Form.Control
                      id="bal-f-dept"
                      type="number"
                      min={1}
                      placeholder="معرّف القسم"
                      value={filters.department_id}
                      onChange={(e) =>
                        handleFilterChange({ department_id: e.target.value })
                      }
                      isInvalid={
                        filters.department_id !== "" &&
                        !isPositiveId(filters.department_id)
                      }
                    />
                  )}
                </Col>

                <Col sm={6} md={3} lg={2}>
                  <Form.Label htmlFor="bal-f-sort" className="fs-12 mb-1">
                    الترتيب
                  </Form.Label>
                  <Select
                    inputId="bal-f-sort"
                    classNamePrefix="Select2"
                    options={SORT_OPTIONS}
                    value={
                      SORT_OPTIONS.find((o) => o.value === filters.sort) || null
                    }
                    onChange={(opt) =>
                      handleFilterChange({ sort: opt ? opt.value : "" })
                    }
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
                      onClick={handleFilterReset}
                    >
                      <i className="ri-filter-off-line align-middle me-1"></i>
                      مسح الفلاتر
                    </button>
                  </Col>
                )}
              </Row>

              <DataTableServer
                columns={columns}
                data={rows}
                loading={fetchLoading || !settled}
                error={error}
                onRetry={load}
                emptyMessage="لا توجد أرصدة مطابقة لهذا البحث"
                currentPage={settled ? meta?.current_page || page : page}
                totalPages={settled ? meta?.last_page || 1 : 1}
                dataCount={settled ? meta?.total || 0 : 0}
                onPageChange={setPage}
                // per_page is clamped server-side; follow what it applied.
                itemsPerPage={settled ? meta?.per_page ?? itemsPerPage : itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                sort={filters.sort}
                onSortChange={(next) => handleFilterChange({ sort: next })}
                showActions={canUpdate}
                renderActions={(row) => (
                  <ProtectedElement
                    element={
                      <button
                        type="button"
                        className="btn btn-sm btn-success-light btn-wave"
                        onClick={() => setEditing(row)}
                        aria-label={`تعديل الرصيد: ${
                          row.employee?.full_name || `موظف #${row.id}`
                        }`}
                      >
                        <i
                          className="ri-pencil-line align-middle me-1"
                          aria-hidden="true"
                        ></i>
                        تعديل الرصيد
                      </button>
                    }
                    requiredPermissions={["leave.balances.update"]}
                  />
                )}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Fallback only while open: the lazy modal is always mounted so its
          chunk prefetches, and an unconditional fallback would flash a modal
          shell on every visit. See ModalFallback. */}
      <Suspense fallback={editing ? <ModalFallback /> : null}>
        <EditBalanceModal
          show={Boolean(editing)}
          row={editing}
          year={editing?.year ?? shownYear}
          onHide={() => setEditing(null)}
          onSaved={handleSaved}
        />
      </Suspense>
    </Fragment>
  );
};

export default LeaveBalances;
