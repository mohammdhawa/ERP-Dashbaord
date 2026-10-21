import React, {
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
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import api from "../../redux/api";
import {
  ON_LEAVE_SORT_KEYS,
  buildOnLeaveParams,
} from "../../redux/actions/leaveParams";
import { EXCUSE_FILTER_OPTIONS } from "../../data/leaveEnums";
import { hasPermission } from "../../data/permissionsCatalog";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";
import { leaveActions } from "../approvals/approvalView";
import useLeaveTypeOptions from "../leave/useLeaveTypeOptions";
import DailyFilterBar from "./DailyFilterBar";
import { Employee } from "./DailySection";
import { dateIsValid, toDailyQuery } from "./dailyFilters";
import {
  defaultOnLeaveFilters,
  onLeaveFiltersFromSearch,
} from "./onLeaveFilters";
import { pageFromSearch } from "./recordFilters";

const ReturnToWorkModal = lazy(
  () => import("../leave/actions/ReturnToWorkModal")
);
const UndoExcuseModal = lazy(() => import("../leave/actions/UndoExcuseModal"));

// في إجازة اليوم — who is on APPROVED leave on a day (API doc §16.9, 2026-10-20,
// legacy's /approved-leave-users): every approved request and HR excuse whose
// span covers the day, for the employees attendance.records.view reaches.
// Departed employees are left out by the server. A paged list in local state;
// only the latest response may write it.
//
// Rows are full leave request objects, so the same leaveActions() the request
// screen uses decides «العودة إلى العمل» / «التراجع عن العذر»; either takes the
// person off the day, so the page is re-read after it rather than patched.

const PER_PAGE = 15;

const dash = <span className="text-muted">—</span>;
const ltrDate = (value) => (value ? <span dir="ltr">{value}</span> : dash);

const csv = (value) =>
  String(value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v !== "");

const columns = [
  {
    key: "employee",
    label: "الموظف",
    sortKey: "employee_name",
    render: (employee) => <Employee employee={employee} />,
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
    key: "requested_days",
    label: "عدد الأيام",
    render: (value) => value ?? dash,
  },
];

const OnLeaveToday = () => {
  const navigate = useNavigate();
  const { permissions } = useSelector((state) => state.auth);
  // The row opens the leave request screen, which the server lets HR read
  // with leave.requests.view; without it the row would lead to a refusal.
  const canOpenLeave = hasPermission(permissions, "leave.requests.view");
  const types = useLeaveTypeOptions();

  const [defaults] = useState(() => defaultOnLeaveFilters());
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() =>
    pageFromSearch(searchParams.get("page"))
  );
  const [itemsPerPage, setItemsPerPage] = useState(PER_PAGE);
  // Every URL value is checked: a hand-edited link must not become a 422.
  const [filters, setFilters] = useState(() =>
    onLeaveFiltersFromSearch((key) => searchParams.get(key), defaults)
  );

  // The URL is written back as well as read, so the view survives a refresh
  // and the back button; `replace` stops typing from stacking history.
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

  // An empty or impossible date is never requested: the server would answer
  // with TODAY's list under a date field that says otherwise.
  const problem = dateIsValid(filters) ? null : "حدّد اليوم.";
  const query = useMemo(() => toDailyQuery(filters), [filters]);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [day, setDay] = useState(null); // { date, working_day } beside meta
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  // `silent` re-reads after an action without blanking the rows; if that read
  // fails the rows stay and the failure is a toast.
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (problem) return;
      const mine = ++seq.current;
      if (!silent) {
        setLoading(true);
        setRows([]);
        setMeta(null);
        setDay(null);
      }
      setError(null);
      try {
        const response = await api.get("/leave/on-leave", {
          params: buildOnLeaveParams(page, itemsPerPage, query),
        });
        if (mine !== seq.current) return;
        const body = response.data;
        const data = body.data || [];
        const nextMeta = body.meta || null;
        // The page emptied (its last person returned to work, or the link
        // named a page past the end): step back, which re-reads.
        if (data.length === 0 && page > 1) {
          setPage(Math.min(page - 1, Math.max(nextMeta?.last_page || 1, 1)));
          return;
        }
        setRows(data);
        setMeta(nextMeta);
        setDay({ date: body.date ?? null, working_day: body.working_day });
      } catch (err) {
        if (mine !== seq.current) return;
        const message = parseApiError(err).message;
        if (silent) toastNotify(message, "error");
        else setError(message);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    },
    [page, itemsPerPage, query, problem]
  );
  useEffect(() => {
    load();
    return () => {
      // A read still in flight must not land after the view changed or left.
      seq.current += 1;
    };
  }, [load]);

  const [returning, setReturning] = useState(null); // the row
  const [undoing, setUndoing] = useState(null); // the row

  const openLeave = (row) =>
    navigate(`${import.meta.env.BASE_URL}leave/requests/${row.id}`);
  const selectedTypes = types.options.filter((o) =>
    csv(filters.leave_type_ids).includes(o.value)
  );

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | في إجازة اليوم</title>
      </Helmet>
      <PageHeader
        homepage="في إجازة اليوم"
        activepage="الحضور والانصراف"
        page="في إجازة اليوم"
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <DailyFilterBar
                filters={filters}
                defaults={defaults}
                problem={problem}
                sortKeys={ON_LEAVE_SORT_KEYS}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
              >
                <Col sm={6} md={4} lg={3}>
                  <label
                    htmlFor="onleave-f-type"
                    className="form-label fs-12 mb-1"
                  >
                    النوع
                  </label>
                  <Select
                    inputId="onleave-f-type"
                    classNamePrefix="Select2"
                    isMulti
                    options={types.options}
                    value={selectedTypes}
                    onChange={(opts) =>
                      handleFilterChange({
                        leave_type_ids: (opts || [])
                          .map((o) => o.value)
                          .join(","),
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
                  <Form.Label htmlFor="onleave-f-source" className="fs-12 mb-1">
                    المصدر
                  </Form.Label>
                  <Form.Select
                    id="onleave-f-source"
                    value={filters.is_excuse}
                    onChange={(e) =>
                      handleFilterChange({ is_excuse: e.target.value })
                    }
                  >
                    {EXCUSE_FILTER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </DailyFilterBar>

              {!problem && day?.working_day === false && (
                <div className="alert alert-light py-2 fs-13" role="status">
                  <span dir="ltr">{day.date}</span> ليس يوم عمل.
                </div>
              )}

              {!problem && (
                <DataTableServer
                  columns={columns}
                  data={rows}
                  loading={loading}
                  error={error}
                  onRetry={() => load()}
                  emptyMessage="لا يوجد أحد في إجازة في هذا اليوم ضمن الفلاتر المحددة"
                  currentPage={meta?.current_page || page}
                  totalPages={meta?.last_page || 1}
                  dataCount={meta?.total || 0}
                  onPageChange={setPage}
                  // per_page is clamped server-side; follow what it applied.
                  itemsPerPage={meta?.per_page ?? itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  sort={filters.sort}
                  onSortChange={(next) => handleFilterChange({ sort: next })}
                  onRowClick={canOpenLeave ? openLeave : undefined}
                  functions={
                    canOpenLeave
                      ? {
                          // The keyboard way into a row; the click is mouse-only.
                          handleDetail: openLeave,
                          rowLabel: (row) =>
                            `إجازة ${row.employee?.full_name || `#${row.id}`}`,
                        }
                      : undefined
                  }
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
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Fallback only while open: the lazy modals are always mounted so their
          chunks prefetch. See ModalFallback. Both stay on their result view
          after success; the list behind them is re-read at once. */}
      <Suspense fallback={returning || undoing ? <ModalFallback /> : null}>
        <ReturnToWorkModal
          show={Boolean(returning)}
          leave={returning}
          onHide={() => setReturning(null)}
          onDone={() => load({ silent: true })}
        />
        <UndoExcuseModal
          show={Boolean(undoing)}
          leave={undoing}
          onHide={() => setUndoing(null)}
          onDone={() => load({ silent: true })}
        />
      </Suspense>
    </Fragment>
  );
};

export default OnLeaveToday;
