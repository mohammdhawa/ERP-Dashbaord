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
import { Card, Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import {
  fetchAttendanceRecords,
  recordsViewKey,
} from "../../redux/actions/attendanceRecordsActions";
import { hasPermission } from "../../data/permissionsCatalog";
import { formatAbsolute } from "../system/auditFormat";
import AttendanceRecordFilters from "./AttendanceRecordFilters";
import {
  dateProblem,
  defaultRecordFilters,
  filtersFromSearch,
  pageFromSearch,
  toQueryFilters,
} from "./recordFilters";
import undoRejection from "./actions/undoRejection";

const SelfieModal = lazy(() => import("./actions/SelfieModal"));
const RejectRecordModal = lazy(() => import("./actions/RejectRecordModal"));
const CorrectCheckoutModal = lazy(() => import("./actions/CorrectCheckoutModal"));

// السجلات — HR's attendance records (API doc §13.1). Without a date the server
// lists today, and so does this screen: its default mode is «يوم» with today
// filled in, so the date a reader sees is the date being asked for.
//
// Every action's success re-reads the CURRENT page rather than patching a row:
// refusing a check-in takes that day's check-out down with it, and undoing a
// refusal brings back "the whole decision", so the response's arrays can name
// rows on other pages.

const PER_PAGE = 15;

const dash = <span className="text-muted">—</span>;

// A badge with a tooltip; focusable so the text is reachable without a mouse.
const NoteBadge = ({ className, children, lines }) => {
  const shown = lines.filter(Boolean);
  const badge = (
    <span
      className={`badge ${className}`}
      tabIndex={shown.length ? 0 : undefined}
    >
      {children}
    </span>
  );
  if (!shown.length) return badge;
  return (
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip>
          {shown.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </Tooltip>
      }
    >
      {badge}
    </OverlayTrigger>
  );
};

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
    key: "type_label",
    label: "النوع",
    sortKey: "type",
    render: (label) => label || dash,
  },
  {
    key: "recorded_at",
    label: "الوقت",
    sortKey: "recorded_at",
    nowrap: true,
    render: (value) =>
      value ? <span dir="ltr">{formatAbsolute(value)}</span> : dash,
  },
  {
    // On the check-out row only; a check-in has none.
    key: "work_hours_formatted",
    label: "ساعات العمل",
    sortKey: "work_hours",
    nowrap: true,
    render: (value) => (value ? <span dir="ltr">{value}</span> : dash),
  },
  {
    key: "source_label",
    label: "المصدر",
    render: (label) => label || dash,
  },
  {
    key: "badges",
    label: "ملاحظات",
    render: (_, row) => {
      const badges = [];
      if (row.status === 1) {
        badges.push(
          <span key="missing" className="badge bg-warning-transparent">
            {row.status_label || "انصراف مفقود"}
          </span>
        );
      }
      if (row.is_corrected) {
        badges.push(
          <NoteBadge
            key="corrected"
            className="bg-info-transparent"
            lines={[
              row.corrected_by?.name && `صحّحه: ${row.corrected_by.name}`,
              row.correction_note,
            ]}
          >
            مصحَّح
          </NoteBadge>
        );
      }
      if (row.is_rejected) {
        badges.push(
          <NoteBadge
            key="rejected"
            className="bg-danger-transparent"
            lines={[
              row.rejection_reason_label,
              row.rejection_note,
              row.rejected_by?.name && `رفضه: ${row.rejected_by.name}`,
            ]}
          >
            مرفوض
          </NoteBadge>
        );
      }
      return badges.length ? (
        <div className="d-flex flex-wrap gap-1">{badges}</div>
      ) : (
        dash
      );
    },
  },
];

const AttendanceRecords = () => {
  const dispatch = useDispatch();
  const { items, meta, fetchLoading, error, loadedKey } = useSelector(
    (state) => state.attendanceRecords
  );
  const { permissions } = useSelector((state) => state.auth);
  const canReject = hasPermission(permissions, "attendance.records.reject");
  const canCorrect = hasPermission(permissions, "attendance.records.correct");

  const [defaults] = useState(() => defaultRecordFilters());
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => pageFromSearch(searchParams.get("page")));
  const [itemsPerPage, setItemsPerPage] = useState(PER_PAGE);
  // Read through filtersFromSearch: a hand-edited link can name an unknown mode
  // or a nonsense value, and none of that may reach a control or the server.
  const [filters, setFilters] = useState(() =>
    filtersFromSearch((key) => searchParams.get(key), defaults)
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

  // A date the builder would silently drop (half a range, an empty day) would
  // make the server answer with TODAY's rows under a filter that says
  // otherwise, so it is never requested.
  const problem = dateProblem(filters);
  const queryFilters = useMemo(() => toQueryFilters(filters), [filters]);

  const viewKey = recordsViewKey(page, itemsPerPage, queryFilters);
  // Filter edits change the view BEFORE the fetch starts; the store's rows are
  // shown only when its `loadedKey` is exactly this view.
  const settled = loadedKey === viewKey;

  const load = useCallback(() => {
    if (problem) return undefined;
    return dispatch(fetchAttendanceRecords(page, itemsPerPage, queryFilters));
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

  const [selfieId, setSelfieId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // the row
  const [correcting, setCorrecting] = useState(null); // the check-in row
  const [undoingId, setUndoingId] = useState(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleUndo = async (row) => {
    if (undoingId) return;
    setUndoingId(row.id);
    try {
      const done = await undoRejection(row);
      if (done && mounted.current) load();
    } catch {
      // Already toasted with the server's text. A 422 means the day moved on
      // since this page was read, so the rows are re-read either way.
      if (mounted.current) load();
    } finally {
      if (mounted.current) setUndoingId(null);
    }
  };

  const closeRejecting = () => setRejecting(null);
  const closeCorrecting = () => setCorrecting(null);

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | سجلات الحضور</title>
      </Helmet>
      <PageHeader
        homepage="السجلات"
        activepage="الحضور والانصراف"
        page="السجلات"
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <AttendanceRecordFilters
                filters={filters}
                defaults={defaults}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
                problem={problem}
              />

              {!problem && (
                <DataTableServer
                  columns={columns}
                  data={rows}
                  loading={fetchLoading || !settled}
                  error={error}
                  onRetry={load}
                  emptyMessage="لا توجد سجلات حضور ضمن هذه الفترة والفلاتر"
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
                  functions={{
                    rowLabel: (row) =>
                      `${row.type_label || "تسجيل"} ${
                        row.employee?.full_name || `#${row.id}`
                      }`,
                  }}
                  renderActions={(row) => {
                    const rejected = Boolean(row.is_rejected);
                    return (
                      <>
                        {row.has_selfie && (
                          <button
                            type="button"
                            className="btn btn-sm btn-info-light btn-wave"
                            onClick={() => setSelfieId(row.id)}
                          >
                            <i
                              className="ri-camera-line align-middle me-1"
                              aria-hidden="true"
                            ></i>
                            الصورة
                          </button>
                        )}
                        {canCorrect &&
                          row.type === 1 &&
                          row.status === 1 &&
                          !rejected && (
                            <button
                              type="button"
                              className="btn btn-sm btn-warning-light btn-wave"
                              onClick={() => setCorrecting(row)}
                            >
                              تصحيح الانصراف
                            </button>
                          )}
                        {canReject && !rejected && (
                          <button
                            type="button"
                            className="btn btn-sm btn-danger-light btn-wave"
                            onClick={() => setRejecting(row)}
                          >
                            رفض
                          </button>
                        )}
                        {canReject && rejected && (
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary-light btn-wave"
                            disabled={undoingId === row.id}
                            onClick={() => handleUndo(row)}
                          >
                            التراجع عن الرفض
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
          chunks prefetch, and an unconditional fallback would flash a modal
          shell on every visit. See ModalFallback. */}
      <Suspense
        fallback={selfieId || rejecting || correcting ? <ModalFallback /> : null}
      >
        <SelfieModal
          show={Boolean(selfieId)}
          recordId={selfieId}
          onHide={() => setSelfieId(null)}
        />
        <RejectRecordModal
          show={Boolean(rejecting)}
          record={rejecting}
          onHide={closeRejecting}
          onDone={() => {
            closeRejecting();
            load();
          }}
        />
        <CorrectCheckoutModal
          show={Boolean(correcting)}
          checkIn={correcting}
          onHide={closeCorrecting}
          onDone={() => {
            closeCorrecting();
            load();
          }}
        />
      </Suspense>
    </Fragment>
  );
};

export default AttendanceRecords;
