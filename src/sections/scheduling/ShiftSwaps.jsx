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
import { Alert, Card, Col, Form, Row } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import EmployeePicker from "../../components/EmployeePicker";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";
import { isPositiveId } from "../../utils/filterValues";
import { formatAbsolute } from "../system/auditFormat";
import {
  SWAP_STATUS_OPTIONS,
  defaultSwapFilters,
  swapFiltersFromSearch,
  swapWindowProblem,
  toSwapParams,
} from "./swapView";

const SwapDetailModal = lazy(() => import("./SwapDetailModal"));

// تبديل المناوبات — every duty exchange, for HR (API doc §19.8). Server-paged;
// the filters live in the URL, and `?swap={id}` opens one exchange's detail.

const PER_PAGE = 15;
const dash = <span className="text-muted">—</span>;

const STATUS_BADGE = {
  1: "bg-warning-transparent",
  2: "bg-success-transparent",
  3: "bg-danger-transparent",
  4: "bg-secondary-transparent",
  5: "bg-dark-transparent",
};

const buildColumns = (openSwap) => [
  {
    key: "requester",
    label: "مقدّم الطلب",
    render: (p) => p ? (
      <>
        <div>{p.name}</div>
        {p.employee_number && (
          <small className="text-muted" dir="ltr">{p.employee_number}</small>
        )}
      </>
    ) : dash,
  },
  {
    key: "id",
    label: "الطلب",
    render: (_id, row) => (
      <>
        <div>
          <button
            type="button"
            className="btn btn-link p-0 text-decoration-none text-reset fw-semibold"
            onClick={() => openSwap(row)}
          >
            تبديل مناوبة
          </button>
        </div>
        <small className="text-muted">
          {row.requester?.name || "—"} ↔ {row.partner?.name || "—"}
          {row.requester_duty?.date && row.partner_duty?.date && (
            <> · <span dir="ltr">{row.requester_duty.date} ⇄ {row.partner_duty.date}</span></>
          )}
        </small>
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
    key: "created_at",
    label: "تاريخ التقديم",
    nowrap: true,
    render: (v) => (v ? <span dir="ltr">{formatAbsolute(v)}</span> : dash),
  },
];

const ShiftSwaps = () => {
  const [defaults] = useState(() => defaultSwapFilters());
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() =>
    swapFiltersFromSearch((k) => searchParams.get(k), defaults)
  );
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(PER_PAGE);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [swap, setSwap] = useState(null);
  const [swapId, setSwapId] = useState(() => {
    const id = searchParams.get("swap");
    return isPositiveId(id) ? id : "";
  });
  const [swapError, setSwapError] = useState(null);

  const problem = swapWindowProblem(filters);
  const params = useMemo(
    () => toSwapParams(filters, page, itemsPerPage),
    [filters, page, itemsPerPage]
  );

  // The URL mirrors the filters, the page and the open exchange.
  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "") next.set(key, value);
    });
    if (page > 1) next.set("page", String(page));
    if (swapId) next.set("swap", String(swapId));
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, swapId]);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/scheduling/swaps", { params });
      if (mine !== seq.current) return;
      const data = response.data.data || [];
      const nextMeta = response.data.meta || null;
      if (data.length === 0 && params.page > 1) {
        setPage(Math.min(params.page - 1, Math.max(nextMeta?.last_page || 1, 1)));
        return;
      }
      setRows(data);
      setMeta(nextMeta);
    } catch (err) {
      if (mine !== seq.current) return;
      const parsed = parseApiError(err);
      if (parsed.status === 0) toastNotify(parsed.message, "error");
      setError(parsed.message);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  // `?swap={id}` on load: fetch that exchange for the modal.
  useEffect(() => {
    if (!swapId || (swap && String(swap.id) === String(swapId))) return undefined;
    let live = true;
    api
      .get(`/scheduling/swaps/${swapId}`)
      .then((response) => {
        if (!live) return;
        const body = response.data.data;
        setSwap(body?.shift_swap || body?.data || body);
      })
      .catch((err) => {
        if (!live) return;
        const parsed = parseApiError(err);
        if (parsed.status === 0) toastNotify(parsed.message, "error");
        else setSwapError(parsed.message);
        setSwapId("");
      });
    return () => {
      live = false;
    };
  }, [swapId, swap]);

  const openSwap = (row) => {
    setSwapError(null);
    setSwap(row);
    setSwapId(String(row.id));
  };
  const closeSwap = () => {
    setSwap(null);
    setSwapId("");
  };

  const change = (patch) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | تبديل المناوبات</title>
      </Helmet>
      <PageHeader
        homepage="تبديل المناوبات"
        activepage="الورديات والجداول"
        page="تبديل المناوبات"
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <Row className="g-3 mb-3 align-items-end">
                <Col md={3}>
                  <Form.Label htmlFor="swap-status">الحالة</Form.Label>
                  <Form.Select
                    id="swap-status"
                    value={filters.status}
                    onChange={(e) => change({ status: e.target.value })}
                  >
                    <option value="">كل الحالات</option>
                    {SWAP_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label htmlFor="swap-employee">الموظف</Form.Label>
                  <EmployeePicker
                    inputId="swap-employee"
                    value={filters.employee_id}
                    onChange={(id) => change({ employee_id: id === "" ? "" : String(id) })}
                  />
                </Col>
                <Col md={3}>
                  <Form.Label htmlFor="swap-from">من تاريخ</Form.Label>
                  <Form.Control
                    id="swap-from"
                    type="date"
                    value={filters.from}
                    onChange={(e) => change({ from: e.target.value })}
                  />
                </Col>
                <Col md={3}>
                  <Form.Label htmlFor="swap-to">إلى تاريخ</Form.Label>
                  <Form.Control
                    id="swap-to"
                    type="date"
                    value={filters.to}
                    onChange={(e) => change({ to: e.target.value })}
                  />
                </Col>
              </Row>
              {problem && (
                <Alert variant="warning" className="py-2 px-3">
                  {problem}
                </Alert>
              )}
              {swapError && (
                <Alert
                  variant="danger"
                  className="py-2 px-3"
                  dismissible
                  onClose={() => setSwapError(null)}
                >
                  {swapError}
                </Alert>
              )}

              <DataTableServer
                columns={buildColumns(openSwap)}
                data={rows}
                loading={loading}
                error={error}
                onRetry={load}
                emptyMessage="لا توجد طلبات تبديل"
                currentPage={meta?.current_page || page}
                totalPages={meta?.last_page || 1}
                dataCount={meta?.total || 0}
                onPageChange={setPage}
                itemsPerPage={meta?.per_page ?? itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                showActions={false}
                onRowClick={openSwap}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Suspense fallback={swapId ? <ModalFallback /> : null}>
        <SwapDetailModal
          swap={swap}
          show={Boolean(swap)}
          onHide={closeSwap}
          onCancelled={() => {
            closeSwap();
            load();
          }}
        />
      </Suspense>
    </Fragment>
  );
};

export default ShiftSwaps;
