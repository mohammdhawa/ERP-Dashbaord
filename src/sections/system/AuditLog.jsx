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
import { Alert, Card, Col, Form, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import AuditLogFilters from "./AuditLogFilters";
import { buildAuditColumns } from "./auditColumns";
import {
  fetchAuditLogs,
  fetchAuditLog,
  clearAuditLogDetail,
} from "../../redux/actions/auditActions";
import { EVENT_GROUPS, eventGroup } from "../../data/auditEvents";

const AuditLogDetail = lazy(() => import("./AuditLogDetail"));

// سجل التدقيق — who changed what, when, and from where.
//
// TWO THINGS MAKE THIS SCREEN UNLIKE EVERY OTHER LIST IN THE APP:
//
// 1. IT IS APPEND-ONLY. There is no edit, no delete, no restore, and no
//    permission that could authorise one — so there is not a single mutation
//    affordance on it, including the actions column DataTableServer adds by
//    default (showActions={false}). A destructive-looking button on an audit
//    trail advertises a power that does not exist and invites someone to try.
//
// 2. READING IT WRITES TO IT. AuditLogMiddleware records every authenticated
//    request, so every fetch from this page appends a row to the table it is
//    showing. THEREFORE: no polling, no auto-refresh interval, no
//    refetch-on-focus, no "live" mode. One explicit تحديث button and the
//    filters the user changes; nothing on this screen fetches on its own.

// The applied filters, in the API's own vocabulary so a URL is legible.
// `includeApiRequests` is the one derived field — it is the api_request switch,
// and it decides `event_group`. See BASE_EVENT_GROUPS below.
const EMPTY_FILTERS = {
  user_id: "",
  actor_type: "",
  event: [],
  auditable_type: "",
  auditable_id: "",
  request_id: "",
  ip_address: "",
  date_from: "",
  date_to: "",
  search: "",
  sort: "",
  includeApiRequests: false,
};

// THE api_request DEFAULT.
//
// AuditLogMiddleware writes one `api_request` row per authenticated request, so
// on a working system they outnumber real changes by roughly a hundred to one:
// including them buries every edit anyone made under routine traffic. The list
// therefore defaults to event_group=model,auth.
//
// But a filter that hides data INVISIBLY is not acceptable on an audit tool —
// it turns "I looked and there was nothing" into a false statement. The state
// of this switch is rendered as a permanent chip above the table, in both
// positions, so the default is stated on screen rather than buried in code.
//
// Both sets are DERIVED from EVENT_GROUPS rather than written out again: the
// group vocabulary belongs to auditEvents.js, and a fourth group added there
// should reach this screen without anyone remembering to edit it here too.
const ALL_EVENT_GROUPS = EVENT_GROUPS;
const BASE_EVENT_GROUPS = EVENT_GROUPS.filter((g) => g !== "request");

const csvToList = (value) =>
  String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const readFilters = (searchParams) => {
  const seeded = { ...EMPTY_FILTERS };
  [
    "user_id",
    "actor_type",
    "auditable_type",
    "auditable_id",
    "request_id",
    "ip_address",
    "date_from",
    "date_to",
    "search",
    "sort",
  ].forEach((key) => {
    const value = searchParams.get(key);
    if (value != null && value !== "") seeded[key] = value;
  });
  seeded.event = csvToList(searchParams.get("event"));
  // Absent event_group means the default applies: requests hidden. A shared
  // link that omits it therefore lands on the same view its sender saw.
  seeded.includeApiRequests = csvToList(searchParams.get("event_group")).includes(
    "request"
  );
  // `actor_type=system` and a `user_id` are a contradiction: a system row has
  // no user, so the server ANDs them into an empty page. The user is dropped
  // at the seed rather than carried, so the URL effect rewrites the link
  // without it — a shared link must not display a filter that is not in force.
  if (seeded.actor_type === "system") seeded.user_id = "";
  return seeded;
};

const AuditLog = () => {
  const dispatch = useDispatch();
  const { items, meta, fetchLoading, error, errorStatus } = useSelector(
    (state) => state.audit
  );

  // URL-SYNCED, both directions. The point of this screen is that a finding can
  // be sent to someone as a link — "here is the row that changed this salary" —
  // so every filter is seeded from the query string on mount and written back
  // on every change. `replace` keeps typing in the search box from stacking one
  // history entry per keystroke.
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState(() => readFilters(searchParams));

  // The filter set to restore when the request-id drill-down is dismissed. Null
  // when the drill-down was arrived at by URL rather than from a row, in which
  // case × simply clears the request id.
  const [drilldownReturn, setDrilldownReturn] = useState(null);

  const [detailId, setDetailId] = useState(null);

  // Asking for an event whose GROUP is excluded returns nothing at all — the
  // server ANDs `event` against `event_group`. So the group follows the event
  // selection rather than contradicting it, and it is derived here rather than
  // only patched on change: a URL carrying `?event=api_request` with the
  // default `event_group=model,auth` would otherwise land on a table that is
  // confidently, permanently empty.
  const requestEventSelected = useMemo(
    () => filters.event.some((e) => eventGroup(e) === "request"),
    [filters.event]
  );

  // A request-id drill-down INCLUDES the api_request row: that row is the user
  // action itself, and the model rows beside it are what it touched. Excluding
  // it would drop the one row the correlation is named after.
  const includeRequests =
    filters.includeApiRequests ||
    filters.request_id !== "" ||
    requestEventSelected;

  const queryFilters = useMemo(
    () => ({
      ...filters,
      event_group: includeRequests ? ALL_EVENT_GROUPS : BASE_EVENT_GROUPS,
      // Both contradictions the server would answer with a confidently empty
      // page are resolved HERE, at the one place the query is assembled, so
      // no combination of state can put one on the wire whatever route it
      // took to get there.
      user_id: filters.actor_type === "system" ? "" : filters.user_id,
    }),
    [filters, includeRequests]
  );

  useEffect(() => {
    const next = new URLSearchParams();
    const {
      // eslint-disable-next-line no-unused-vars
      includeApiRequests,
      event,
      ...rest
    } = filters;
    Object.entries(rest).forEach(([key, value]) => {
      if (value !== "" && value != null) next.set(key, value);
    });
    if (event.length) next.set("event", event.join(","));
    // Written even at its default value: the URL should say out loud which
    // groups the recipient of this link is about to see.
    next.set(
      "event_group",
      (includeRequests ? ALL_EVENT_GROUPS : BASE_EVENT_GROUPS).join(",")
    );
    if (page > 1) next.set("page", String(page));

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, includeRequests]);

  // THE ONLY FETCH TRIGGER: mount, a filter/page change the user made, or the
  // تحديث button. There is no interval and no focus listener here, and none may
  // be added — see the header comment.
  const load = useCallback(() => {
    dispatch(fetchAuditLogs(page, itemsPerPage, queryFilters));
  }, [dispatch, page, itemsPerPage, queryFilters]);

  useEffect(() => {
    load();
  }, [load]);

  // Changing any filter resets to page 1: staying on page 6 of a result set
  // that now has two pages shows an empty table and reads as "no matches".
  const handleFilterChange = (patch) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const handleFilterReset = () => {
    setPage(1);
    setDrilldownReturn(null);
    setFilters(EMPTY_FILTERS);
  };

  useEffect(() => {
    if (meta && meta.last_page >= 1 && page > meta.last_page) {
      setPage(meta.last_page);
    }
  }, [meta, page]);

  // per_page is clamped server-side; `meta.per_page` reports what was actually
  // applied, so the pager follows that rather than what we asked for.
  const appliedPerPage = meta?.per_page ?? itemsPerPage;

  const openDetail = useCallback(
    (row) => {
      setDetailId(row.id);
      dispatch(fetchAuditLog(row.id));
    },
    [dispatch]
  );

  const closeDetail = () => {
    setDetailId(null);
    dispatch(clearAuditLogDetail());
  };

  // THE CORRELATION DRILL-DOWN. One user action writes the api_request row plus
  // one model row per model it touched, and request_id is the only thing tying
  // them together — it is why the column exists. The column is indexed, so this
  // is a cheap query.
  const startDrilldown = (requestId) => {
    if (!requestId) return;
    setDrilldownReturn(filters);
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      request_id: requestId,
      // Everything else is cleared: the question being asked is "what else
      // happened in THIS operation", and a leftover event or date filter would
      // silently answer a narrower one.
      user_id: "",
      actor_type: "",
      event: [],
      auditable_type: "",
      auditable_id: "",
      ip_address: "",
      date_from: "",
      date_to: "",
      search: "",
    }));
    closeDetail();
  };

  const endDrilldown = () => {
    setPage(1);
    setFilters(drilldownReturn || { ...filters, request_id: "" });
    setDrilldownReturn(null);
  };

  const columns = useMemo(
    () => buildAuditColumns({ includeTarget: true, onOpen: openDetail }),
    [openDetail]
  );

  // "Has the user narrowed anything", for the empty state and the clear button.
  // The api_request switch is deliberately NOT counted: it is on by default, so
  // counting it would make every fresh visit look filtered.
  const hasAnyFilter =
    filters.user_id !== "" ||
    filters.actor_type !== "" ||
    filters.event.length > 0 ||
    filters.auditable_type !== "" ||
    filters.auditable_id !== "" ||
    filters.request_id !== "" ||
    filters.ip_address !== "" ||
    filters.date_from !== "" ||
    filters.date_to !== "" ||
    filters.search !== "" ||
    filters.sort !== "";

  // THREE empty states, because they are three different facts and only one of
  // them means "nothing has happened".
  const emptyMessage = hasAnyFilter ? (
    <div>
      <p className="mb-2">لا توجد نتائج مطابقة للفلاتر الحالية.</p>
      <button
        type="button"
        className="btn btn-sm btn-light btn-wave"
        onClick={handleFilterReset}
      >
        <i className="ri-filter-off-line align-middle me-1"></i>
        مسح الفلاتر
      </button>
    </div>
  ) : !includeRequests ? (
    <div>
      <p className="mb-2">
        لا توجد تغييرات مسجّلة على السجلات أو المصادقة حتى الآن.
      </p>
      <span className="d-block text-muted fs-12 mb-2">
        طلبات الواجهة البرمجية مخفية — قد يحتوي السجل عليها.
      </span>
      <button
        type="button"
        className="btn btn-sm btn-light btn-wave"
        onClick={() => handleFilterChange({ includeApiRequests: true })}
      >
        تضمين طلبات الواجهة البرمجية
      </button>
    </div>
  ) : (
    "سجل التدقيق فارغ."
  );

  const denied = errorStatus === 403;

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | سجل التدقيق</title>
      </Helmet>
      <PageHeader
        homepage="سجل التدقيق"
        activepage="إدارة النظام"
        page="سجل التدقيق"
      >
        {/* The ONLY refresh on this screen, and it is explicit on purpose. */}
        <button
          type="button"
          className="btn btn-secondary btn-wave"
          onClick={load}
          disabled={fetchLoading}
        >
          <i className="ri-refresh-line align-middle me-1"></i> تحديث
        </button>
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <Alert variant="light" className="py-2 px-3 mb-3 fs-12">
                <i className="ri-information-line align-middle me-1"></i>
                سجل تراكمي للقراءة فقط: لا يُعدَّل ولا يُحذف. كل فتح أو تحديث
                لهذه الشاشة يُسجَّل فيه بدوره، ولهذا لا يوجد تحديث تلقائي —
                استخدم زر «تحديث» عند الحاجة.
              </Alert>

              {/* THE DRILL-DOWN CHIP. Loud, and trivially reversible: when this
                  filter is active the table is showing one operation and
                  nothing else, and a reader who forgets that reads the whole
                  system's activity as three rows. */}
              {filters.request_id !== "" && (
                <Alert
                  variant="info"
                  className="py-2 px-3 mb-3 d-flex flex-wrap align-items-center gap-2"
                >
                  <i
                    className="ri-links-line align-middle"
                    aria-hidden="true"
                  ></i>
                  <span className="fw-semibold">
                    عرض كل ما جرى في عملية واحدة
                  </span>
                  <code className="fs-12">
                    <bdi dir="ltr">{filters.request_id}</bdi>
                  </code>
                  <span className="text-muted fs-12">
                    (طلبات الواجهة البرمجية مُضمَّنة في هذا العرض)
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-light btn-wave ms-auto"
                    onClick={endDrilldown}
                    aria-label="إلغاء تصفية العملية والعودة للفلاتر السابقة"
                  >
                    <i className="ri-close-line align-middle me-1"></i>
                    إلغاء
                  </button>
                </Alert>
              )}

              <AuditLogFilters
                filters={filters}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
                hasAnyFilter={hasAnyFilter}
              />

              {/* ALWAYS VISIBLE, in both positions. The default hides roughly
                  99% of the rows; saying so on screen is the difference between
                  a default and a lie of omission. */}
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                <span
                  className={`badge ${
                    includeRequests
                      ? "bg-primary-transparent"
                      : "bg-warning-transparent"
                  }`}
                >
                  <i
                    className={`align-middle me-1 ${
                      includeRequests ? "ri-eye-line" : "ri-eye-off-line"
                    }`}
                    aria-hidden="true"
                  ></i>
                  {includeRequests
                    ? "معروض: طلبات الواجهة البرمجية"
                    : "مخفي: طلبات الواجهة البرمجية"}
                </span>
                <Form.Check
                  type="switch"
                  id="audit-include-requests"
                  className="mb-0"
                  label="تضمين طلبات الواجهة البرمجية (api_request)"
                  checked={includeRequests}
                  // Locked in the two cases where the group is not this
                  // switch's to decide, because a switch that cannot change
                  // anything should not look like it can:
                  //   · a drill-down, which includes the request row by
                  //     definition;
                  //   · a request-group event picked in الحدث, where turning
                  //     the group off would ask the server for an event it has
                  //     just been told to exclude — an empty table, always.
                  // Clearing that event in الحدث unlocks it again.
                  disabled={filters.request_id !== "" || requestEventSelected}
                  title={
                    requestEventSelected && filters.request_id === ""
                      ? "مطلوب لعرض الأحداث المحددة في فلتر «الحدث»"
                      : undefined
                  }
                  onChange={(e) =>
                    handleFilterChange({ includeApiRequests: e.target.checked })
                  }
                />
              </div>

              <DataTableServer
                columns={columns}
                data={items}
                loading={fetchLoading}
                error={error}
                // A 403 is not transient — retrying reproduces it — so no retry
                // is offered for one. Any other failure gets one.
                onRetry={denied ? undefined : load}
                emptyMessage={emptyMessage}
                currentPage={meta?.current_page || page}
                totalPages={meta?.last_page || 1}
                dataCount={meta?.total || 0}
                onPageChange={setPage}
                itemsPerPage={appliedPerPage}
                onItemsPerPageChange={setItemsPerPage}
                onRowClick={openDetail}
                // APPEND-ONLY: no update, no delete, no actions column, and no
                // sortable header either — `created_at` is the only sortable
                // key and it is exposed through the الترتيب control instead.
                showActions={false}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Suspense fallback={detailId ? <ModalFallback /> : null}>
        <AuditLogDetail
          open={detailId != null}
          close={closeDetail}
          onDrilldown={startDrilldown}
        />
      </Suspense>
    </Fragment>
  );
};

export default AuditLog;
