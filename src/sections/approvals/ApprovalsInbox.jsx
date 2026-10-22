import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Nav, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import { fetchInbox, inboxViewKey } from "../../redux/actions/approvalsActions";
import {
  INBOX_SORT_KEYS,
  INBOX_TABS,
} from "../../redux/actions/approvalsParams";
import { formatAbsolute } from "../system/auditFormat";
import { subjectPath } from "./approvalView";
import ApprovalFilterBar from "./ApprovalFilterBar";
import {
  approvalFiltersFromSearch,
  approvalFiltersProblem,
  defaultApprovalFilters,
  hasAnyApprovalFilter,
} from "./approvalFilters";

// الاعتمادات — the approver's inbox (API doc §15.2). Two lists over one
// endpoint: what waits on me, and what I already decided. Rows only OPEN the
// request screen; approving or rejecting happens there, where the approver sees
// the whole chain and the notes, never from a row.
//
// Both tabs take the same filters and sort (2026-10-20, parity audit C-4);
// switching tabs keeps them.

const PER_PAGE = 15;

const TAB_LABELS = {
  pending: "بانتظار قراري",
  decided: "قراراتي",
};

const EMPTY_MESSAGES = {
  pending: "لا توجد طلبات بانتظار قرارك",
  decided: "لم تتخذ أي قرار بعد",
};

const dash = <span className="text-muted">—</span>;

// Where a row goes, as a full router path — or null when the subject has no
// screen in this dashboard (anything but a leave request, today).
const rowTarget = (row) => {
  const path = subjectPath(row.subject);
  return path ? `${import.meta.env.BASE_URL}${path}` : null;
};

const buildColumns = (tab) =>
  [
    {
      key: "requester",
      label: "مقدّم الطلب",
      render: (requester) =>
        requester ? (
          <Fragment>
            <div>{requester.full_name}</div>
            {requester.employee_number && (
              <small className="text-muted" dir="ltr">
                {requester.employee_number}
              </small>
            )}
          </Fragment>
        ) : (
          dash
        ),
    },
    {
      key: "subject",
      label: "الطلب",
      render: (subject, row) => {
        // The request can be gone by the time the approver looks (title null).
        const title = subject?.title || "طلب لم يعد موجوداً";
        const target = rowTarget(row);
        return (
          <Fragment>
            {/* A real link, not only the row click: a handler on a <tr> cannot
                be reached by keyboard. A subject with no screen is plain text. */}
            <div>{target ? <Link to={target}>{title}</Link> : title}</div>
            {subject?.summary && (
              <small className="text-muted">{subject.summary}</small>
            )}
          </Fragment>
        );
      },
    },
    { key: "step_order", label: "المرحلة" },
    {
      key: "submitted_at",
      label: "تاريخ التقديم",
      nowrap: true,
      render: (value) =>
        value ? <span dir="ltr">{formatAbsolute(value)}</span> : dash,
    },
    tab === "decided" && {
      key: "status_label",
      label: "القرار",
      render: (value) => value || dash,
    },
    tab === "decided" && {
      key: "acted_at",
      label: "تاريخ القرار",
      nowrap: true,
      render: (value) =>
        value ? <span dir="ltr">{formatAbsolute(value)}</span> : dash,
    },
  ].filter(Boolean);

const ApprovalsInbox = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, meta, fetchLoading, error, loadedKey } = useSelector(
    (state) => state.approvals
  );

  // Tab, page and filters live in the URL so a refresh or the back button
  // returns to the same view. Anything unknown falls back to the default rather
  // than reaching the server (an unknown value is a 422 there).
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = INBOX_TABS.includes(searchParams.get("tab"))
    ? searchParams.get("tab")
    : INBOX_TABS[0];
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
  const [defaults] = useState(defaultApprovalFilters);
  const filters = useMemo(
    () => approvalFiltersFromSearch((key) => searchParams.get(key), defaults),
    [searchParams, defaults]
  );

  const updateView = useCallback(
    (nextTab, nextPage, nextFilters) => {
      const next = new URLSearchParams();
      next.set("tab", nextTab);
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value !== "" && value != null) next.set(key, value);
      });
      if (nextPage > 1) next.set("page", String(nextPage));
      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );
  const handleFilterChange = (patch) =>
    updateView(tab, 1, { ...filters, ...patch });
  const handleFilterReset = () => updateView(tab, 1, defaults);

  // An inverted date range is a 422; it is shown, never requested.
  const problem = approvalFiltersProblem(filters);

  // Which view the rows in the store belong to. The slice keeps the previous
  // response while a new one loads, and the first render after a tab or filter
  // change happens BEFORE the fetch starts — so without this, the other view's
  // rows (and its page count) flash under the new header. The store records
  // the view of the response it holds (`loadedKey`, set only by the latest
  // request), and rows are shown only when that is exactly this view.
  const viewKey = inboxViewKey(tab, page, PER_PAGE, filters);
  const settled = loadedKey === viewKey;

  const load = useCallback(() => {
    if (problem) return undefined;
    return dispatch(fetchInbox(tab, page, PER_PAGE, filters));
    // `viewKey` stands for `filters`: a new object with the same values must
    // not re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, viewKey, problem]);

  useEffect(() => {
    load();
  }, [load]);

  // The table keys rows on `id`; an inbox row is identified by its step.
  const rows = useMemo(
    () => (settled ? items.map((row) => ({ ...row, id: row.step_id })) : []),
    [settled, items]
  );
  const columns = useMemo(() => buildColumns(tab), [tab]);

  // A decision elsewhere can shrink the list under the current page.
  useEffect(() => {
    if (settled && meta && meta.last_page >= 1 && page > meta.last_page) {
      updateView(tab, meta.last_page, filters);
    }
  }, [settled, meta, page, tab, filters, updateView]);

  const openRequest = (row) => {
    const target = rowTarget(row);
    if (target) navigate(target);
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | الاعتمادات</title>
      </Helmet>
      <PageHeader
        homepage="الاعتمادات"
        activepage="لوحة التحكم"
        homepage_link={import.meta.env.BASE_URL}
        page="الاعتمادات"
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <Nav
                variant="tabs"
                className="mb-3"
                activeKey={tab}
                onSelect={(key) =>
                  key && key !== tab && updateView(key, 1, filters)
                }
              >
                {INBOX_TABS.map((key) => (
                  <Nav.Item key={key}>
                    <Nav.Link eventKey={key} className="text-nowrap">
                      {TAB_LABELS[key]}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
              <ApprovalFilterBar
                idPrefix="inbox-f"
                filters={filters}
                defaults={defaults}
                sortKeys={INBOX_SORT_KEYS}
                problem={problem}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
              />
              {!problem && (
                <DataTableServer
                  columns={columns}
                  data={rows}
                  loading={fetchLoading || !settled}
                  error={error}
                  onRetry={load}
                  emptyMessage={
                    hasAnyApprovalFilter(filters, defaults)
                      ? "لا توجد طلبات ضمن الفلاتر المحددة"
                      : EMPTY_MESSAGES[tab]
                  }
                  currentPage={settled ? meta?.current_page || page : page}
                  totalPages={settled ? meta?.last_page || 1 : 1}
                  dataCount={settled ? meta?.total || 0 : 0}
                  onPageChange={(next) => updateView(tab, next, filters)}
                  itemsPerPage={meta?.per_page ?? PER_PAGE}
                  // 15 is not among the selector's sizes; the page size is fixed.
                  showPageSizeSelector={false}
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

export default ApprovalsInbox;
