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
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import {
  fetchRegister,
  registerViewKey,
} from "../../redux/actions/leaveRegisterActions";
import { formatAbsolute } from "../system/auditFormat";
import { leaveActions } from "../approvals/approvalView";
import LeaveRegisterFilters from "./LeaveRegisterFilters";
import RegisterSummary from "./RegisterSummary";
import {
  defaultRegisterFilters,
  registerFiltersFromSearch,
  toQueryFilters,
  windowProblem,
} from "./registerFilters";

const ExcuseFormModal = lazy(() => import("./actions/ExcuseFormModal"));
const ReturnToWorkModal = lazy(() => import("./actions/ReturnToWorkModal"));
const UndoExcuseModal = lazy(() => import("./actions/UndoExcuseModal"));

// سجل الإجازات — every leave and excuse that overlaps a window (API doc §16.8).
// HR also uses it to find stuck pending requests: add «قيد الاعتماد» to the
// status filter.
//
// The rows are full leave request objects, so the same leaveActions() that the
// request screen uses decides each row's buttons. Every action's success
// re-reads the CURRENT page rather than patching a row: a leave cut short or an
// excuse undone changes its status, its days in the window and the summary.

const PER_PAGE = 15;

const STATUS_BADGE = {
  1: "bg-warning-transparent",
  2: "bg-success-transparent",
  3: "bg-danger-transparent",
  4: "bg-secondary-transparent",
};

const dash = <span className="text-muted">—</span>;
const ltrDate = (value) => (value ? <span dir="ltr">{value}</span> : dash);

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
    key: "leave_type",
    label: "النوع",
    render: (type, row) => (
      <>
        {type?.name_ar || dash}
        {row.is_excuse && (
          <span className="badge bg-info-transparent ms-1">عذر</span>
        )}
      </>
    ),
  },
  {
    key: "start_date",
    label: "من",
    sortKey: "start_date",
    nowrap: true,
    render: ltrDate,
  },
  {
    key: "end_date",
    label: "إلى",
    sortKey: "end_date",
    nowrap: true,
    render: ltrDate,
  },
  {
    // Working days INSIDE the window, with the calendar days beside them: a
    // leave from 28 May to 3 June counts 3 days in June's register.
    key: "days_in_range",
    label: "الأيام في الفترة",
    nowrap: true,
    render: (value, row) => (
      <>
        {value ?? dash}
        {row.calendar_days_in_range != null && (
          <span className="text-muted fs-12 ms-1">
            ({row.calendar_days_in_range} تقويمي)
          </span>
        )}
      </>
    ),
  },
  {
    key: "status_label",
    label: "الحالة",
    render: (label, row) => (
      <span className={`badge ${STATUS_BADGE[row.status] || "bg-light text-muted"}`}>
        {label}
      </span>
    ),
  },
  {
    key: "decided_at",
    label: "تاريخ القرار",
    nowrap: true,
    render: (value) =>
      value ? <span dir="ltr">{formatAbsolute(value)}</span> : dash,
  },
];

const LeaveRegister = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, meta, window: range, summary, fetchLoading, error, loadedKey } =
    useSelector((state) => state.leaveRegister);
  const { permissions } = useSelector((state) => state.auth);

  const [defaults] = useState(() => defaultRegisterFilters());
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(PER_PAGE);
  // Every URL value is checked: a hand-edited link must not become a 422.
  const [filters, setFilters] = useState(() =>
    registerFiltersFromSearch((key) => searchParams.get(key), defaults)
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
    setFilters({ ...defaults });
  };

  // A window the server would refuse (or, for half a range, silently answer
  // for another one) is never requested.
  const problem = windowProblem(filters);
  const queryFilters = useMemo(() => toQueryFilters(filters), [filters]);

  const viewKey = registerViewKey(page, itemsPerPage, queryFilters);
  // Filter edits change the view BEFORE the fetch starts; the store's rows are
  // shown only when its `loadedKey` is exactly this view.
  const settled = loadedKey === viewKey;

  const load = useCallback(() => {
    if (problem) return undefined;
    return dispatch(fetchRegister(page, itemsPerPage, queryFilters));
  }, [dispatch, page, itemsPerPage, queryFilters, problem]);
  useEffect(() => {
    load();
  }, [load]);

  // A page that no longer exists (the list shrank) snaps back to the last one.
  useEffect(() => {
    if (settled && meta && meta.last_page >= 1 && page > meta.last_page) {
      setPage(meta.last_page);
    }
  }, [settled, meta, page]);

  const rows = settled ? items : [];

  const [excuseOpen, setExcuseOpen] = useState(false);
  const [returning, setReturning] = useState(null); // the row
  const [undoing, setUndoing] = useState(null); // the row

  const openLeave = (row) =>
    navigate(`${import.meta.env.BASE_URL}leave/requests/${row.id}`);

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | سجل الإجازات</title>
      </Helmet>
      <PageHeader
        homepage="سجل الإجازات"
        activepage="الإجازات"
        page="سجل الإجازات"
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <div className="d-flex justify-content-end mb-3">
                <ProtectedElement
                  element={
                    <button
                      type="button"
                      className="btn btn-primary btn-wave"
                      onClick={() => setExcuseOpen(true)}
                    >
                      <i
                        className="ri-add-line align-middle me-1"
                        aria-hidden="true"
                      ></i>
                      تسجيل عذر
                    </button>
                  }
                  requiredPermissions={["leave.excuses.create"]}
                />
              </div>

              <LeaveRegisterFilters
                filters={filters}
                defaults={defaults}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
                problem={problem}
              />

              {!problem && (
                <Fragment>
                  {settled && !error && (
                    <RegisterSummary summary={summary} window={range} />
                  )}

                  <DataTableServer
                    columns={columns}
                    data={rows}
                    loading={fetchLoading || !settled}
                    error={error}
                    onRetry={load}
                    emptyMessage="لا توجد إجازات ضمن هذه الفترة والفلاتر"
                    currentPage={settled ? meta?.current_page || page : page}
                    totalPages={settled ? meta?.last_page || 1 : 1}
                    dataCount={settled ? meta?.total || 0 : 0}
                    onPageChange={setPage}
                    // per_page is clamped server-side; follow what it applied.
                    itemsPerPage={
                      settled ? meta?.per_page ?? itemsPerPage : itemsPerPage
                    }
                    onItemsPerPageChange={setItemsPerPage}
                    sort={filters.sort}
                    onSortChange={(next) => handleFilterChange({ sort: next })}
                    onRowClick={openLeave}
                    functions={{
                      // The keyboard way into a row; the row click is mouse-only.
                      handleDetail: openLeave,
                      rowLabel: (row) =>
                        `طلب إجازة ${row.employee?.full_name || `#${row.id}`}`,
                    }}
                    renderActions={(row) => {
                      const actions = leaveActions(row, permissions);
                      return (
                        <>
                          {actions.returnToWork && (
                            <button
                              type="button"
                              className="btn btn-sm btn-warning-light btn-wave"
                              onClick={() => setReturning(row)}
                            >
                              العودة إلى العمل
                            </button>
                          )}
                          {actions.undoExcuse && (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger-light btn-wave"
                              onClick={() => setUndoing(row)}
                            >
                              التراجع عن العذر
                            </button>
                          )}
                        </>
                      );
                    }}
                  />
                </Fragment>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Fallback only while open: the lazy modals are always mounted so their
          chunks prefetch, and an unconditional fallback would flash a modal
          shell on every visit. See ModalFallback. */}
      <Suspense fallback={excuseOpen || returning || undoing ? <ModalFallback /> : null}>
        <ExcuseFormModal
          show={excuseOpen}
          // Prefilled from the filter when it names one person.
          initial={
            filters.employee_id !== ""
              ? { employee_id: Number(filters.employee_id) }
              : undefined
          }
          onHide={() => setExcuseOpen(false)}
          onSaved={() => {
            setExcuseOpen(false);
            load();
          }}
        />
        <ReturnToWorkModal
          show={Boolean(returning)}
          leave={returning}
          onHide={() => setReturning(null)}
          onDone={() => load()}
        />
        {/* Both stay open on their result view after success; the register
            behind them is re-read at once and «إغلاق» closes through onHide. */}
        <UndoExcuseModal
          show={Boolean(undoing)}
          leave={undoing}
          onHide={() => setUndoing(null)}
          onDone={() => load()}
        />
      </Suspense>
    </Fragment>
  );
};

export default LeaveRegister;
