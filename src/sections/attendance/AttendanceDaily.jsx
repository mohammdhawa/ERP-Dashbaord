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
import { Card, Col, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { PageHeader, ModalFallback } from "../../components";
import StatePanel from "../../components/StatePanel";
import api from "../../redux/api";
import { buildDailyParams } from "../../redux/actions/attendanceParams";
import { hasPermission } from "../../data/permissionsCatalog";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";
import DailyFilterBar from "./DailyFilterBar";
import DailySection from "./DailySection";
import {
  dailyFiltersFromSearch,
  dateIsValid,
  defaultDailyFilters,
  toDailyQuery,
} from "./dailyFilters";
import undoRejection from "./actions/undoRejection";

const SelfieModal = lazy(() => import("./actions/SelfieModal"));
const RejectRecordModal = lazy(() => import("./actions/RejectRecordModal"));
const CorrectCheckoutModal = lazy(() => import("./actions/CorrectCheckoutModal"));
const ReturnToWorkModal = lazy(() => import("../leave/actions/ReturnToWorkModal"));
const UndoExcuseModal = lazy(() => import("../leave/actions/UndoExcuseModal"));
const ExcuseFormModal = lazy(() => import("../leave/actions/ExcuseFormModal"));

// التقرير اليومي — the day's board (API doc §14.1). One computed object, not a
// paged list, so it lives in local state rather than a slice; only the latest
// response may write it (a date changed while a read is in flight must not be
// overwritten by the older answer).
//
// `present` (checked_in + checked_out) is a tile only: drawing it as a section
// would list every present employee twice. The buckets are otherwise disjoint.
// Every action re-reads the board — refusing a check-in takes that day's
// check-out with it, and undoing it brings the whole decision back.

// Order as the brief asks; `kind` picks the table. Titles are bucket names,
// not enum values (rows show the server's own labels).
const SECTIONS = [
  { bucket: "checked_in", title: "حاضر (لم ينصرف بعد)", kind: "attendance" },
  { bucket: "checked_out", title: "حاضر وانصرف", kind: "attendance" },
  { bucket: "missing_checkout", title: "انصراف مفقود", kind: "attendance" },
  { bucket: "rejected", title: "تسجيل مرفوض", kind: "attendance" },
  { bucket: "on_leave", title: "في إجازة", kind: "leave" },
  { bucket: "excused", title: "غياب بعذر", kind: "leave" },
];

const TILES = [
  { key: "present", title: "الحاضرون", tone: "success" },
  { key: "checked_in", title: "لم ينصرفوا بعد", tone: "primary" },
  { key: "checked_out", title: "انصرفوا", tone: "secondary" },
  { key: "missing_checkout", title: "انصراف مفقود", tone: "warning" },
  { key: "rejected", title: "تسجيل مرفوض", tone: "danger" },
  { key: "on_leave", title: "في إجازة", tone: "info" },
  { key: "excused", title: "غياب بعذر", tone: "dark" },
];

const AttendanceDaily = () => {
  const { permissions } = useSelector((state) => state.auth);
  const can = {
    reject: hasPermission(permissions, "attendance.records.reject"),
    correct: hasPermission(permissions, "attendance.records.correct"),
    returnToWork: hasPermission(permissions, "leave.requests.returnToWork"),
    undoExcuse: hasPermission(permissions, "leave.excuses.delete"),
  };
  const canExcuse = hasPermission(permissions, "leave.excuses.create");

  const [defaults] = useState(() => defaultDailyFilters());
  const [searchParams, setSearchParams] = useSearchParams();
  // Read through dailyFiltersFromSearch: a hand-edited link may carry any
  // value, and none of it may reach a control or the server unchecked.
  const [filters, setFilters] = useState(() =>
    dailyFiltersFromSearch((key) => searchParams.get(key), defaults)
  );

  // The URL is written back as well as read, so the view survives a refresh
  // and the back button; `replace` stops typing from stacking history.
  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value != null) next.set(key, value);
    });
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const handleFilterReset = () => setFilters({ ...defaults });

  // An empty or impossible date is never requested: the server would answer
  // with TODAY's board under a date field that says otherwise.
  const problem = dateIsValid(filters) ? null : "حدّد اليوم.";
  const query = useMemo(() => toDailyQuery(filters), [filters]);

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  // `silent` re-reads after an action without blanking the board behind the
  // modal that is still showing its result; if that read fails the board stays
  // (it was true a moment ago) and the failure is toasted instead of replacing
  // it with an error.
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (problem) return;
      const mine = ++seq.current;
      if (!silent) {
        setLoading(true);
        setBoard(null);
      }
      setError(null);
      try {
        const response = await api.get("/attendance/report", {
          params: buildDailyParams(query),
        });
        if (mine !== seq.current) return;
        setBoard(response.data.data);
      } catch (err) {
        if (mine !== seq.current) return;
        const message = parseApiError(err).message;
        if (silent) toastNotify(message, "error");
        else setError(message);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    },
    [query, problem]
  );
  useEffect(() => {
    load();
    return () => {
      // A read still in flight must not land after the view changed or left.
      seq.current += 1;
    };
  }, [load]);

  const refresh = () => load({ silent: true });

  const [selfieId, setSelfieId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [correcting, setCorrecting] = useState(null);
  const [returning, setReturning] = useState(null);
  const [undoing, setUndoing] = useState(null);
  const [excuseOpen, setExcuseOpen] = useState(false);
  const [undoingId, setUndoingId] = useState(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleUndoRefusal = async (record) => {
    if (undoingId) return;
    setUndoingId(record.id);
    try {
      const done = await undoRejection(record);
      if (done && mounted.current) refresh();
    } catch {
      // Already toasted with the server's text. A 422 means the day moved on
      // since this board was read, so it is re-read either way.
      if (mounted.current) refresh();
    } finally {
      if (mounted.current) setUndoingId(null);
    }
  };

  const on = {
    selfie: setSelfieId,
    reject: setRejecting,
    correct: setCorrecting,
    undoRefusal: handleUndoRefusal,
    returnToWork: setReturning,
    undoExcuse: setUndoing,
  };

  const shown = board
    ? SECTIONS.filter((s) => (board[s.bucket] || []).length > 0)
    : [];
  const anyOpen =
    selfieId || rejecting || correcting || returning || undoing || excuseOpen;

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | التقرير اليومي</title>
      </Helmet>
      <PageHeader
        homepage="التقرير اليومي"
        activepage="الحضور والانصراف"
        page="التقرير اليومي"
      >
        {canExcuse && (
          <button
            type="button"
            className="btn btn-primary btn-wave"
            onClick={() => setExcuseOpen(true)}
          >
            <i className="ri-add-line align-middle me-1"></i>
            تسجيل عذر
          </button>
        )}
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <DailyFilterBar
                filters={filters}
                defaults={defaults}
                problem={problem}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {!problem && (
        <StatePanel loading={loading} error={error} onRetry={() => load()}>
          {board && (
            <Fragment>
              <div className="d-flex align-items-center gap-2 mb-3">
                <h6 className="mb-0">
                  تقرير يوم <span dir="ltr">{board.date}</span>
                </h6>
                {board.working_day === false && (
                  <span className="badge bg-warning-transparent">يوم عطلة</span>
                )}
              </div>

              <Row className="g-2 mb-3">
                {TILES.map((tile) => (
                  <Col key={tile.key} xs={6} md={4} xl>
                    <Card className="custom-card mb-0 h-100">
                      <Card.Body className="py-3">
                        <div className="text-muted fs-12">{tile.title}</div>
                        <div className={`fs-22 fw-semibold text-${tile.tone}`}>
                          {board.summary?.[tile.key] ?? 0}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>

              {shown.length === 0 ? (
                <Card className="custom-card">
                  <Card.Body className="text-center text-muted py-5">
                    لا توجد بيانات لهذا اليوم ضمن الفلاتر المحددة
                  </Card.Body>
                </Card>
              ) : (
                shown.map((s) => (
                  <DailySection
                    key={s.bucket}
                    bucket={s.bucket}
                    title={s.title}
                    kind={s.kind}
                    rows={board[s.bucket]}
                    can={can}
                    undoingId={undoingId}
                    on={on}
                  />
                ))
              )}
            </Fragment>
          )}
        </StatePanel>
      )}

      {/* Fallback only while open: the lazy modals are always mounted so their
          chunks prefetch, and an unconditional fallback would flash a modal
          shell on every visit. See ModalFallback. */}
      <Suspense fallback={anyOpen ? <ModalFallback /> : null}>
        <SelfieModal
          show={Boolean(selfieId)}
          recordId={selfieId}
          onHide={() => setSelfieId(null)}
        />
        <RejectRecordModal
          show={Boolean(rejecting)}
          record={rejecting}
          onHide={() => setRejecting(null)}
          onDone={() => {
            setRejecting(null);
            refresh();
          }}
        />
        <CorrectCheckoutModal
          show={Boolean(correcting)}
          checkIn={correcting}
          onHide={() => setCorrecting(null)}
          onDone={() => {
            setCorrecting(null);
            refresh();
          }}
        />
        <ReturnToWorkModal
          show={Boolean(returning)}
          leave={returning}
          onHide={() => setReturning(null)}
          onDone={() => refresh()}
        />
        {/* Both stay open on their result view after success; the board behind
            them is re-read at once and «إغلاق» closes through onHide. */}
        <UndoExcuseModal
          show={Boolean(undoing)}
          leave={undoing}
          onHide={() => setUndoing(null)}
          onDone={() => refresh()}
        />
        <ExcuseFormModal
          show={excuseOpen}
          // Prefilled from the day (and the person) the board is showing.
          initial={{
            employee_id:
              query.employee_id !== "" ? Number(query.employee_id) : undefined,
            start_date: dateIsValid(filters) ? filters.date : undefined,
            end_date: dateIsValid(filters) ? filters.date : undefined,
          }}
          onHide={() => setExcuseOpen(false)}
          onSaved={() => {
            setExcuseOpen(false);
            refresh();
          }}
        />
      </Suspense>
    </Fragment>
  );
};

export default AttendanceDaily;
