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
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import StatePanel from "../../components/StatePanel";
import api from "../../redux/api";
import {
  fetchMyLeave,
  myLeaveViewKey,
} from "../../redux/actions/myLeaveActions";
import {
  EXCUSE_FILTER_OPTIONS,
  LEAVE_STATUS_OPTIONS,
} from "../../data/leaveEnums";
import { parseApiError } from "../../utils/apiHelpers";
import { formatAbsolute } from "../system/auditFormat";

const LeaveRequestFormModal = lazy(() => import("./LeaveRequestFormModal"));

// طلباتي — an employee's own leave: the year's balance (API doc §16.2), the
// list of their requests and HR's excuses for them (§16.3), and «طلب إجازة».
// A row opens leave/requests/{id}, where withdrawing lives.
//
// An account with no employee (a super_admin) gets 403 «لا يوجد موظف مرتبط
// بهذا الحساب.» from BOTH reads. That is final, not a fault: the screen shows
// the server's message alone, with no retry and none of the controls.

const PER_PAGE = 15;

const STATUS_BADGE = {
  1: "bg-warning-transparent",
  2: "bg-success-transparent",
  3: "bg-danger-transparent",
  4: "bg-secondary-transparent",
};

const STATUS_OPTIONS = LEAVE_STATUS_OPTIONS.map((o) => ({
  value: String(o.value),
  label: o.label,
}));

const csv = (value) =>
  String(value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v !== "");

const dash = <span className="text-muted">—</span>;
const ltrDate = (value) => (value ? <span dir="ltr">{value}</span> : dash);

const columns = [
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
    label: "الأيام",
    sortKey: "requested_days",
    nowrap: true,
    render: (value) => value ?? dash,
  },
  {
    key: "status_label",
    label: "الحالة",
    sortKey: "status",
    render: (label, row) => (
      <span className={`badge ${STATUS_BADGE[row.status] || "bg-light text-muted"}`}>
        {label}
      </span>
    ),
  },
  {
    key: "created_at",
    label: "تاريخ التقديم",
    sortKey: "created_at",
    nowrap: true,
    render: (value) =>
      value ? <span dir="ltr">{formatAbsolute(value)}</span> : dash,
  },
  {
    key: "decided_at",
    label: "تاريخ القرار",
    sortKey: "decided_at",
    nowrap: true,
    render: (value) =>
      value ? <span dir="ltr">{formatAbsolute(value)}</span> : dash,
  },
];

const EMPTY_FILTERS = {
  statuses: "",
  leave_type_ids: "",
  year: "",
  is_excuse: "",
  sort: "",
};

const BalanceFigure = ({ label, value, tone }) => (
  <div className="text-center">
    <div className="text-muted fs-12">{label}</div>
    <div className={`fs-4 fw-semibold ${tone || ""}`}>{value}</div>
  </div>
);

const MyLeave = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, meta, fetchLoading, error, errorStatus, loadedKey } = useSelector(
    (state) => state.myLeave
  );

  const thisYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 7 }, (_, i) => thisYear + 1 - i),
    [thisYear]
  );

  // ---- balance card ------------------------------------------------------
  const [balanceYear, setBalanceYear] = useState(thisYear);
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState(null); // { message, status }
  const balanceSeq = useRef(0);

  const loadBalance = useCallback(async () => {
    const mine = ++balanceSeq.current;
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const response = await api.get("/me/leave-balance", {
        params: { year: balanceYear },
      });
      if (mine !== balanceSeq.current) return;
      setBalance(response.data.data);
    } catch (err) {
      if (mine !== balanceSeq.current) return;
      const parsed = parseApiError(err);
      setBalance(null);
      setBalanceError({ message: parsed.message, status: parsed.status });
    } finally {
      if (mine === balanceSeq.current) setBalanceLoading(false);
    }
  }, [balanceYear]);
  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // ---- my requests -------------------------------------------------------
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PER_PAGE);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const handleFilterChange = (patch) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };
  const hasAnyFilter = Object.keys(EMPTY_FILTERS).some(
    (key) => filters[key] !== EMPTY_FILTERS[key]
  );

  const viewKey = myLeaveViewKey(page, itemsPerPage, filters);
  // Filter edits change the view BEFORE the fetch starts; the store's rows are
  // shown only when its `loadedKey` is exactly this view.
  const settled = loadedKey === viewKey;

  const load = useCallback(
    () => dispatch(fetchMyLeave(page, itemsPerPage, filters)),
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

  const rows = settled ? items : [];

  // The type filter covers requests AND HR's excuses, so it reads every active
  // type (no `for`). A failed read is shown with a retry, never as an empty list.
  const [types, setTypes] = useState({ options: [], loading: true, error: null });
  const loadTypes = useCallback(async () => {
    setTypes((t) => ({ ...t, loading: true, error: null }));
    try {
      const response = await api.get("/leave/types");
      setTypes({
        options: (response.data.data || []).map((t) => ({
          value: String(t.id),
          label: t.name_ar || `نوع #${t.id}`,
        })),
        loading: false,
        error: null,
      });
    } catch (err) {
      setTypes({ options: [], loading: false, error: parseApiError(err).message });
    }
  }, []);
  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const selectedStatuses = useMemo(
    () => STATUS_OPTIONS.filter((o) => csv(filters.statuses).includes(o.value)),
    [filters.statuses]
  );
  const selectedTypes = useMemo(
    () =>
      types.options.filter((o) => csv(filters.leave_type_ids).includes(o.value)),
    [types.options, filters.leave_type_ids]
  );

  // ---- no employee -------------------------------------------------------
  // Either read's 403 is the verdict; the server's own message is shown.
  const forbidden =
    balanceError?.status === 403
      ? balanceError.message
      : settled && errorStatus === 403
      ? error
      : null;

  // ---- filing ------------------------------------------------------------
  const [formOpen, setFormOpen] = useState(false);

  const handleSaved = (data) => {
    setFormOpen(false);
    // The returned balance is for the request's START year: it replaces the
    // card only when the card shows that year, otherwise it would put another
    // year's figures under this year's heading.
    if (data?.balance && data.balance.year === balanceYear) {
      balanceSeq.current += 1; // a read still in flight would overwrite it
      setBalance(data.balance);
      setBalanceError(null);
      setBalanceLoading(false);
    }
    if (page === 1) load();
    else setPage(1);
  };

  const openLeave = (row) =>
    navigate(`${import.meta.env.BASE_URL}leave/requests/${row.id}`);

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | طلباتي</title>
      </Helmet>
      <PageHeader homepage="طلباتي" activepage="الإجازات" page="طلباتي" />

      <StatePanel error={forbidden}>
        <Row>
          <Col xl={12}>
            <Card className="custom-card">
              <Card.Header className="justify-content-between">
                <Card.Title>رصيد الإجازات</Card.Title>
                <div className="d-flex align-items-center gap-2">
                  <Form.Label htmlFor="my-leave-balance-year" className="mb-0 fs-12">
                    السنة
                  </Form.Label>
                  <Form.Select
                    id="my-leave-balance-year"
                    size="sm"
                    style={{ width: "auto" }}
                    value={balanceYear}
                    onChange={(e) => setBalanceYear(Number(e.target.value))}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Form.Select>
                </div>
              </Card.Header>
              <Card.Body>
                <StatePanel
                  loading={balanceLoading}
                  error={balanceError?.message}
                  onRetry={loadBalance}
                >
                  {balance && (
                    <>
                      <Row className="g-3 justify-content-center">
                        <Col xs={6} md={3}>
                          <BalanceFigure
                            label="المخصص"
                            value={balance.allocated_days}
                          />
                        </Col>
                        <Col xs={6} md={3}>
                          <BalanceFigure label="المستخدم" value={balance.used_days} />
                        </Col>
                        <Col xs={6} md={3}>
                          <BalanceFigure
                            label="المتبقي"
                            value={balance.remaining_days}
                            tone="text-success"
                          />
                        </Col>
                        <Col xs={6} md={3}>
                          <BalanceFigure
                            label="إجازات لا تُخصم من الرصيد"
                            value={balance.non_deducting_days}
                          />
                        </Col>
                      </Row>
                      {balance.over_balance_days > 0 && (
                        <div className="text-danger small text-center mt-3" role="alert">
                          تجاوز الرصيد بمقدار {balance.over_balance_days} يوماً
                        </div>
                      )}
                    </>
                  )}
                </StatePanel>
              </Card.Body>
            </Card>
          </Col>

          <Col xl={12}>
            <Card className="custom-card">
              <Card.Body>
                <div className="d-flex justify-content-end mb-3">
                  <button
                    type="button"
                    className="btn btn-primary btn-wave"
                    onClick={() => setFormOpen(true)}
                  >
                    <i className="ri-add-line align-middle me-1" aria-hidden="true"></i>
                    طلب إجازة
                  </button>
                </div>

                <Row className="g-2 mb-3 align-items-end">
                  <Col sm={6} md={4} lg={3}>
                    <Form.Label htmlFor="my-f-status" className="fs-12 mb-1">
                      الحالة
                    </Form.Label>
                    <Select
                      inputId="my-f-status"
                      classNamePrefix="Select2"
                      isMulti
                      options={STATUS_OPTIONS}
                      value={selectedStatuses}
                      onChange={(opts) =>
                        handleFilterChange({
                          statuses: (opts || []).map((o) => o.value).join(","),
                        })
                      }
                      placeholder="الكل"
                      menuPosition="fixed"
                    />
                  </Col>

                  <Col sm={6} md={4} lg={3}>
                    <Form.Label htmlFor="my-f-type" className="fs-12 mb-1">
                      النوع
                    </Form.Label>
                    <Select
                      inputId="my-f-type"
                      classNamePrefix="Select2"
                      isMulti
                      options={types.options}
                      value={selectedTypes}
                      onChange={(opts) =>
                        handleFilterChange({
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
                          onClick={loadTypes}
                        >
                          إعادة المحاولة
                        </button>
                      </div>
                    )}
                  </Col>

                  <Col sm={6} md={4} lg={2}>
                    <Form.Label htmlFor="my-f-year" className="fs-12 mb-1">
                      سنة البداية
                    </Form.Label>
                    <Form.Select
                      id="my-f-year"
                      value={filters.year}
                      onChange={(e) => handleFilterChange({ year: e.target.value })}
                    >
                      <option value="">الكل</option>
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col sm={6} md={4} lg={2}>
                    <Form.Label htmlFor="my-f-source" className="fs-12 mb-1">
                      المصدر
                    </Form.Label>
                    <Form.Select
                      id="my-f-source"
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

                  {hasAnyFilter && (
                    <Col xs="auto" className="ms-auto">
                      <button
                        type="button"
                        className="btn btn-light btn-wave"
                        onClick={() => {
                          setPage(1);
                          setFilters(EMPTY_FILTERS);
                        }}
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
                  emptyMessage="لا توجد طلبات إجازة"
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
                      `طلب ${row.leave_type?.name_ar || "إجازة"} رقم ${row.id}`,
                  }}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </StatePanel>

      {/* Fallback only while open: the lazy modal is always mounted so its
          chunk prefetches, and an unconditional fallback would flash a modal
          shell on every visit. See ModalFallback. */}
      <Suspense fallback={formOpen ? <ModalFallback /> : null}>
        <LeaveRequestFormModal
          show={formOpen}
          balance={balance}
          onHide={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      </Suspense>
    </Fragment>
  );
};

export default MyLeave;
