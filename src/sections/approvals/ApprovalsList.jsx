import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Row } from "react-bootstrap";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import api from "../../redux/api";
import {
  LIST_SORT_KEYS,
  buildApprovalListParams,
} from "../../redux/actions/approvalsParams";
import { parseApiError } from "../../utils/apiHelpers";
import { formatAbsolute } from "../system/auditFormat";
import { pageFromSearch } from "../attendance/recordFilters";
import ApprovalFilterBar from "./ApprovalFilterBar";
import {
  approvalFiltersFromSearch,
  approvalFiltersProblem,
  defaultListFilters,
  hasAnyApprovalFilter,
} from "./approvalFilters";
import { subjectPath } from "./approvalView";

// كل الطلبات — every approval whose requester's current unit the caller's
// approvals.view reaches, every status by default (API doc §15.7, 2026-10-20,
// parity audit C-4: legacy's admin saw the whole queue). Its point is a
// request stuck on an absent approver: each row says whose turn it is
// (`current_steps`). A row only OPENS the request screen, where the chain is
// drawn and the step is reassigned (§15.5) — nothing is decided from here.
//
// A paged list in local state; only the latest response may write it.

const PER_PAGE = 15;

// Colour keyed on the approval status INT; the text is the server's label.
const STATUS_BADGE = {
  1: "bg-warning-transparent",
  2: "bg-success-transparent",
  3: "bg-danger-transparent",
  4: "bg-secondary-transparent",
};

const dash = <span className="text-muted">—</span>;
const time = (value) =>
  value ? <span dir="ltr">{formatAbsolute(value)}</span> : dash;

const rowTarget = (row) => {
  const path = subjectPath(row.subject);
  return path ? `${import.meta.env.BASE_URL}${path}` : null;
};

const Person = ({ person }) =>
  person ? (
    <Fragment>
      <div>{person.full_name}</div>
      {person.employee_number && (
        <small className="text-muted" dir="ltr">
          {person.employee_number}
        </small>
      )}
    </Fragment>
  ) : (
    dash
  );

const columns = [
  {
    key: "requester",
    label: "مقدّم الطلب",
    sortKey: "employee_name",
    render: (requester) => <Person person={requester} />,
  },
  {
    key: "department",
    label: "القسم",
    render: (department) => department?.name || dash,
  },
  {
    key: "subject",
    label: "الطلب",
    render: (subject, row) => {
      // The request can be gone by the time HR looks (title null).
      const title = subject?.title || "طلب لم يعد موجوداً";
      const target = rowTarget(row);
      return (
        <Fragment>
          {/* A real link: a handler on a <tr> cannot be reached by keyboard. */}
          <div>{target ? <Link to={target}>{title}</Link> : title}</div>
          {subject?.summary && (
            <small className="text-muted">{subject.summary}</small>
          )}
        </Fragment>
      );
    },
  },
  {
    key: "status_label",
    label: "الحالة",
    render: (label, row) => (
      <span
        className={`badge ${STATUS_BADGE[row.status] || "bg-light text-muted"}`}
      >
        {label}
      </span>
    ),
  },
  {
    // Whose turn it is — empty once decided. Steps sharing an order run in
    // parallel, so there can be more than one approver.
    key: "current_steps",
    label: "بانتظار",
    render: (steps) =>
      steps?.length ? (
        <div className="d-flex flex-column gap-1">
          {steps.map((step) => (
            <div key={step.id}>
              <Person person={step.approver} />
              <small className="text-muted d-block">
                المرحلة {step.step_order}
              </small>
            </div>
          ))}
        </div>
      ) : (
        dash
      ),
  },
  {
    key: "submitted_at",
    label: "تاريخ التقديم",
    sortKey: "submitted_at",
    nowrap: true,
    render: time,
  },
  {
    key: "decided_at",
    label: "تاريخ القرار",
    sortKey: "decided_at",
    nowrap: true,
    render: time,
  },
];

const ApprovalsList = () => {
  const navigate = useNavigate();
  const [defaults] = useState(defaultListFilters);
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() =>
    pageFromSearch(searchParams.get("page"))
  );
  const [itemsPerPage, setItemsPerPage] = useState(PER_PAGE);
  // Every URL value is checked: a hand-edited link must not become a 422.
  const [filters, setFilters] = useState(() =>
    approvalFiltersFromSearch(
      (key) => searchParams.get(key),
      defaults,
      LIST_SORT_KEYS
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
    setFilters({ ...defaults });
  };

  // An inverted date range is a 422; it is shown, never requested.
  const problem = approvalFiltersProblem(filters);
  const params = useMemo(
    () => buildApprovalListParams(page, itemsPerPage, filters),
    [page, itemsPerPage, filters]
  );

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (problem) return;
    const mine = ++seq.current;
    setLoading(true);
    setRows([]);
    setMeta(null);
    setError(null);
    try {
      const response = await api.get("/approvals", { params });
      if (mine !== seq.current) return;
      const data = response.data.data || [];
      const nextMeta = response.data.meta || null;
      // A page that no longer exists (the list shrank, or the link named a
      // page past the end) steps back to the last one, which re-reads.
      if (data.length === 0 && page > 1) {
        setPage(Math.max(nextMeta?.last_page || 1, 1));
        return;
      }
      setRows(data);
      setMeta(nextMeta);
    } catch (err) {
      if (mine !== seq.current) return;
      setError(parseApiError(err).message);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [params, page, problem]);
  useEffect(() => {
    load();
    return () => {
      // A read still in flight must not land after the view changed or left.
      seq.current += 1;
    };
  }, [load]);

  const openRequest = (row) => {
    const target = rowTarget(row);
    if (target) navigate(target);
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | كل الطلبات</title>
      </Helmet>
      <PageHeader
        homepage="كل الطلبات"
        activepage="الاعتمادات"
        page="كل الطلبات"
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <ApprovalFilterBar
                idPrefix="all-f"
                filters={filters}
                defaults={defaults}
                sortKeys={LIST_SORT_KEYS}
                problem={problem}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
              />

              {!problem && (
                <DataTableServer
                  columns={columns}
                  data={rows}
                  loading={loading}
                  error={error}
                  onRetry={load}
                  emptyMessage={
                    hasAnyApprovalFilter(filters, defaults)
                      ? "لا توجد طلبات ضمن الفلاتر المحددة"
                      : "لا توجد طلبات"
                  }
                  currentPage={meta?.current_page || page}
                  totalPages={meta?.last_page || 1}
                  dataCount={meta?.total || 0}
                  onPageChange={setPage}
                  // per_page is clamped server-side; follow what it applied.
                  itemsPerPage={meta?.per_page ?? itemsPerPage}
                  onItemsPerPageChange={(n) => {
                    setPage(1);
                    setItemsPerPage(n);
                  }}
                  sort={filters.sort}
                  onSortChange={(next) => handleFilterChange({ sort: next })}
                  onRowClick={openRequest}
                  isRowClickable={(row) => rowTarget(row) !== null}
                  showActions={false}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Fragment>
  );
};

export default ApprovalsList;
