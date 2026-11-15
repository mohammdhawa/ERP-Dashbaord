import {
  Fragment,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Form, Row } from "react-bootstrap";
import Select from "react-select";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { PageHeader, ModalFallback } from "../../components";
import EmployeePicker from "../../components/EmployeePicker";
import StatePanel from "../../components/StatePanel";
import TablePaginationServer from "../../components/TablePaginationServer";
import { hasPermission } from "../../data/permissionsCatalog";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";
import { MAX_SEARCH, isPositiveId } from "../../utils/filterValues";
import { pageFromSearch, todayInDamascus } from "../attendance/recordFilters";
import { departmentToOption, useResourceOptions } from "../departments/useResourceOptions";
import CalendarGrid from "./CalendarGrid";
import { rangeBetween } from "./calendarCells";
import {
  CALENDAR_PER_PAGE,
  MAX_WINDOW_DAYS,
  calendarFiltersFromSearch,
  calendarWindowIsValid,
  defaultCalendarFilters,
  presetWindow,
  toCalendarParams,
  windowDates,
} from "./calendarFilters";

const ShiftChangeModal = lazy(() => import("./ShiftChangeModal"));
const AssignScheduleModal = lazy(() => import("./AssignScheduleModal"));

// التقويم - everyone's expected shift per date (API doc §19.5), coloured by
// where each day came from. Filters and the page live in the URL.

const LEGEND = [
  { label: "افتراضي", className: "sched-default" },
  { label: "جدول", className: "" },
  { label: "تعديل", className: "sched-change" },
  { label: "تبديل", className: "sched-swap" },
];

const ScheduleCalendar = () => {
  const { permissions } = useSelector((state) => state.auth);
  const canManage = hasPermission(permissions, "scheduling.manage");
  const canReadDepartments = hasPermission(permissions, "departments.view");
  const departments = useResourceOptions("/departments", departmentToOption, canReadDepartments);

  const [defaults] = useState(() => defaultCalendarFilters());
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => pageFromSearch(searchParams.get("page")));
  const [filters, setFilters] = useState(() =>
    calendarFiltersFromSearch((key) => searchParams.get(key), defaults)
  );

  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value != null) next.set(key, value);
    });
    if (page > 1) next.set("page", String(page));
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [anchor, setAnchor] = useState(null);

  const handleFilterChange = (patch) => {
    setPage(1);
    setSelectedIds(new Set());
    setAnchor(null);
    setFilters((prev) => ({ ...prev, ...patch }));
  };
  const handlePageChange = (next) => {
    setSelectedIds(new Set());
    setAnchor(null);
    setPage(next);
  };

  // `search` is debounced; every other control commits at once.
  const [searchDraft, setSearchDraft] = useState(filters.search);
  useEffect(() => setSearchDraft(filters.search), [filters.search]);
  useEffect(() => {
    if (searchDraft === filters.search) return undefined;
    const timer = setTimeout(() => handleFilterChange({ search: searchDraft }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const handleReset = () => {
    setSearchDraft(defaults.search);
    handleFilterChange({ ...defaults });
  };

  const problem = calendarWindowIsValid(filters.from, filters.to)
    ? null
    : `حدّد فترة صحيحة لا تتجاوز ${MAX_WINDOW_DAYS} يوماً.`;

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  // `silent` re-reads after a save without blanking the grid; a failed silent
  // read keeps the rows (true a moment ago) and toasts instead.
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (problem) return;
      const mine = ++seq.current;
      if (!silent) {
        setLoading(true);
        setRows([]);
        setMeta(null);
      }
      setError(null);
      try {
        const response = await api.get("/scheduling/calendar", {
          params: toCalendarParams(filters, page),
        });
        if (mine !== seq.current) return;
        const data = response.data.data || [];
        const nextMeta = response.data.meta || null;
        if (data.length === 0 && page > 1) {
          setPage(Math.min(page - 1, Math.max(nextMeta?.last_page || 1, 1)));
          return;
        }
        setRows(data);
        setMeta(nextMeta);
      } catch (err) {
        if (mine !== seq.current) return;
        const parsed = parseApiError(err);
        if (silent) toastNotify(parsed.message, "error");
        else setError({ message: parsed.message, status: parsed.status });
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    },
    [filters, page, problem]
  );
  useEffect(() => {
    load();
    return () => {
      seq.current += 1;
    };
  }, [load]);

  const dates = useMemo(
    () => (problem ? [] : windowDates(filters.from, filters.to)),
    [filters.from, filters.to, problem]
  );
  const today = todayInDamascus();

  const [change, setChange] = useState(null); // { employee, from, to, readOnly }
  const [assignOpen, setAssignOpen] = useState(false);

  // A plain click sets the anchor and opens the day; a shift-click with an
  // anchor opens the range between the two.
  const handleCellClick = (employee, day, shiftKey) => {
    const target = { employeeId: employee.id, date: day.date };
    if (shiftKey && anchor) {
      const range = rangeBetween(anchor, target);
      if (range.error) {
        toastNotify(range.error, "error");
        return;
      }
      setChange({ employee, from: range.from, to: range.to, readOnly: false });
      return;
    }
    setAnchor(target);
    setChange({ employee, from: day.date, to: day.date, readOnly: day.source === "swap" });
  };

  const toggleRow = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelectedIds((prev) =>
      rows.every((row) => prev.has(row.employee.id))
        ? new Set()
        : new Set(rows.map((row) => row.employee.id))
    );

  const people = useMemo(() => rows.map((row) => row.employee), [rows]);
  const pickedDepartment = departments.options.find(
    (o) => o.value === Number(filters.department_id)
  );
  const unitFilter = isPositiveId(filters.department_id)
    ? {
        id: Number(filters.department_id),
        name: pickedDepartment?.label ?? `وحدة #${filters.department_id}`,
      }
    : null;

  const hasAnyFilter =
    Object.keys(defaults).some((key) => filters[key] !== defaults[key]) ||
    searchDraft !== defaults.search;

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | التقويم</title>
      </Helmet>
      <PageHeader homepage="التقويم" activepage="الورديات والجداول" page="التقويم">
        {canManage && (
          <button onClick={() => setAssignOpen(true)} className="btn btn-secondary btn-wave">
            <i className="ri-calendar-check-line align-middle me-1"></i> إسناد جدول
          </button>
        )}
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <Row className="g-2 align-items-end mb-3">
                <Col sm={6} md={3} lg={2}>
                  <Form.Label htmlFor="cal-f-from" className="fs-12 mb-1">
                    من
                  </Form.Label>
                  <Form.Control
                    id="cal-f-from"
                    type="date"
                    value={filters.from}
                    onChange={(e) => handleFilterChange({ from: e.target.value })}
                    isInvalid={Boolean(problem)}
                  />
                </Col>
                <Col sm={6} md={3} lg={2}>
                  <Form.Label htmlFor="cal-f-to" className="fs-12 mb-1">
                    إلى
                  </Form.Label>
                  <Form.Control
                    id="cal-f-to"
                    type="date"
                    value={filters.to}
                    onChange={(e) => handleFilterChange({ to: e.target.value })}
                    isInvalid={Boolean(problem)}
                  />
                </Col>
                <Col xs="auto">
                  <button
                    type="button"
                    className="btn btn-light btn-wave me-2"
                    onClick={() => handleFilterChange(presetWindow("week"))}
                  >
                    هذا الأسبوع
                  </button>
                  <button
                    type="button"
                    className="btn btn-light btn-wave"
                    onClick={() => handleFilterChange(presetWindow("month"))}
                  >
                    هذا الشهر
                  </button>
                </Col>
                {hasPermission(permissions, "hr.employees.view") && (
                  <Col sm={6} md={4} lg={3}>
                    <Form.Label htmlFor="cal-f-employee" className="fs-12 mb-1">
                      الموظف
                    </Form.Label>
                    <EmployeePicker
                      inputId="cal-f-employee"
                      placeholder="الكل"
                      value={filters.employee_id}
                      onChange={(id) => handleFilterChange({ employee_id: id })}
                    />
                  </Col>
                )}
                <Col sm={6} md={4} lg={3}>
                  <Form.Label htmlFor="cal-f-dept" className="fs-12 mb-1">
                    القسم
                  </Form.Label>
                  {canReadDepartments && !departments.error ? (
                    <Select
                      inputId="cal-f-dept"
                      classNamePrefix="Select2"
                      options={departments.options}
                      value={pickedDepartment || null}
                      onChange={(opt) =>
                        handleFilterChange({ department_id: opt ? opt.value : "" })
                      }
                      isClearable
                      isLoading={departments.loading}
                      placeholder="الكل"
                      noOptionsMessage={() => "لا توجد أقسام"}
                      menuPosition="fixed"
                    />
                  ) : (
                    <Form.Control
                      id="cal-f-dept"
                      type="number"
                      min={1}
                      placeholder="معرّف القسم"
                      value={filters.department_id}
                      onChange={(e) => handleFilterChange({ department_id: e.target.value })}
                      isInvalid={
                        filters.department_id !== "" && !isPositiveId(filters.department_id)
                      }
                    />
                  )}
                </Col>
                <Col sm={6} md={4} lg={3}>
                  <Form.Label htmlFor="cal-f-search" className="fs-12 mb-1">
                    بحث
                  </Form.Label>
                  <Form.Control
                    id="cal-f-search"
                    type="search"
                    maxLength={MAX_SEARCH}
                    placeholder="الاسم أو الرقم الوظيفي"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                  />
                </Col>
                {hasAnyFilter && (
                  <Col xs="auto" className="ms-auto">
                    <button type="button" className="btn btn-light btn-wave" onClick={handleReset}>
                      <i className="ri-filter-off-line align-middle me-1"></i>
                      مسح الفلاتر
                    </button>
                  </Col>
                )}
              </Row>
              {problem && (
                <div className="text-danger fs-13 mb-3" role="alert">
                  {problem}
                </div>
              )}

              <div className="sched-legend mb-3" aria-label="دليل الألوان">
                {LEGEND.map((item) => (
                  <span key={item.label}>
                    <span className={`sched-swatch ${item.className}`}></span>
                    {item.label}
                  </span>
                ))}
              </div>

              {!problem && (
                <StatePanel
                  loading={loading}
                  error={error?.message}
                  onRetry={error?.status === 403 ? undefined : () => load()}
                >
                  {rows.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      لا يوجد موظفون ضمن الفلاتر المحددة
                    </div>
                  ) : (
                    <CalendarGrid
                      rows={rows}
                      dates={dates}
                      today={today}
                      canManage={canManage}
                      selectedIds={selectedIds}
                      anchor={anchor}
                      onToggleRow={toggleRow}
                      onTogglePage={togglePage}
                      onCellClick={handleCellClick}
                    />
                  )}
                  <TablePaginationServer
                    currentPage={meta?.current_page || page}
                    totalPages={meta?.last_page || 1}
                    dataCount={meta?.total || 0}
                    currentData={rows}
                    onPageChange={handlePageChange}
                    itemsPerPage={meta?.per_page ?? CALENDAR_PER_PAGE}
                    showPageSizeSelector={false}
                  />
                </StatePanel>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Suspense fallback={change || assignOpen ? <ModalFallback /> : null}>
        {change && (
          <ShiftChangeModal
            show
            employee={change.employee}
            from={change.from}
            to={change.to}
            readOnly={change.readOnly}
            onHide={() => setChange(null)}
            onSaved={() => load({ silent: true })}
          />
        )}
        {assignOpen && (
          <AssignScheduleModal
            show
            mode="bulk"
            selectedIds={[...selectedIds]}
            unitFilter={unitFilter}
            people={people}
            onHide={() => setAssignOpen(false)}
            // In bulk mode this fires when the result table is closed.
            onSaved={() => {
              setAssignOpen(false);
              load({ silent: true });
            }}
          />
        )}
      </Suspense>
    </Fragment>
  );
};

export default ScheduleCalendar;
