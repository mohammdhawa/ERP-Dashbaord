import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import DataTableServer from "../../components/DataTableServer";
import { ModalFallback } from "../../components";
import { buildAuditColumns } from "./auditColumns";
import {
  fetchAuditLogs,
  fetchAuditLog,
  clearAuditLogDetail,
} from "../../redux/actions/auditActions";

const AuditLogDetail = lazy(() => import("./AuditLogDetail"));

// سجل التغييرات for ONE record — the same audit list, filtered to a single
// auditable and with the target column dropped (it is constant here, and a
// column repeating the same value fifteen times is noise).
//
// This is the higher-value half of the feature for day-to-day work: "what
// happened to this employee's record and who did it" gets asked far more often
// than "what happened at 14:03".
//
// Same two rules as the full screen and for the same reasons: APPEND-ONLY, so
// showActions={false} and no mutation affordance anywhere; and READING WRITES,
// so there is no interval and no auto-refresh — one explicit تحديث button.
//
// It shares the `audit` slice with AuditLog. They are never mounted at the same
// time (one is a route, the other a profile tab), and sharing keeps the
// stale-response guard and the detail block in one place.

const AuditTrail = ({ auditableType, auditableId }) => {
  const dispatch = useDispatch();
  const { items, meta, fetchLoading, error, errorStatus } = useSelector(
    (state) => state.audit
  );

  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [detailId, setDetailId] = useState(null);

  // Newest first, and nothing else is filtered: every group is included here,
  // api_request among them. On the full screen those rows drown the real
  // changes; scoped to one record they are few and they are part of the story
  // of that record.
  const filters = useMemo(
    () => ({
      auditable_type: auditableType,
      auditable_id: auditableId,
      sort: "-created_at",
    }),
    [auditableType, auditableId]
  );

  const load = useCallback(() => {
    if (auditableType && auditableId != null) {
      dispatch(fetchAuditLogs(page, itemsPerPage, filters));
    }
  }, [dispatch, page, itemsPerPage, filters, auditableType, auditableId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (meta && meta.last_page >= 1 && page > meta.last_page) {
      setPage(meta.last_page);
    }
  }, [meta, page]);

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

  const columns = useMemo(
    // The target is the record whose profile this tab is on, so the column is
    // dropped rather than repeated.
    () => buildAuditColumns({ includeTarget: false, onOpen: openDetail }),
    [openDetail]
  );

  const denied = errorStatus === 403;

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <Alert variant="light" className="mb-0 py-2 px-3 fs-12 flex-grow-1">
          سجل للقراءة فقط بكل ما جرى على هذا السجل، الأحدث أولاً. لا يوجد تحديث
          تلقائي: قراءة السجل تُسجَّل فيه أيضاً.
        </Alert>
        <button
          type="button"
          className="btn btn-light btn-wave text-nowrap"
          onClick={load}
          disabled={fetchLoading}
        >
          <i className="ri-refresh-line align-middle me-1"></i> تحديث
        </button>
      </div>

      <DataTableServer
        columns={columns}
        data={items}
        loading={fetchLoading}
        error={error}
        onRetry={denied ? undefined : load}
        emptyMessage="لا توجد تغييرات مسجّلة على هذا السجل"
        currentPage={meta?.current_page || page}
        totalPages={meta?.last_page || 1}
        dataCount={meta?.total || 0}
        onPageChange={setPage}
        itemsPerPage={appliedPerPage}
        onItemsPerPageChange={setItemsPerPage}
        onRowClick={openDetail}
        // Append-only: no update, no delete, no actions column.
        showActions={false}
      />

      <Suspense fallback={detailId ? <ModalFallback /> : null}>
        <AuditLogDetail
          open={detailId != null}
          close={closeDetail}
          // No drill-down from inside a profile tab: following a request id
          // would have to replace this record-scoped list with a
          // request-scoped one, which is a different question on a screen that
          // is not built to say so. The full سجل التدقيق screen is where that
          // lives, and the detail panel's own request id is copyable from here.
          onDrilldown={undefined}
        />
      </Suspense>
    </div>
  );
};

export default AuditTrail;
