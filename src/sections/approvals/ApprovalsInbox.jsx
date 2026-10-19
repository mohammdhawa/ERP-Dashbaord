import React, { Fragment, useCallback, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Nav, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import { fetchInbox } from "../../redux/actions/approvalsActions";
import { INBOX_TABS } from "../../redux/actions/approvalsParams";
import { formatAbsolute } from "../system/auditFormat";
import { subjectPath } from "./approvalView";

// الاعتمادات — the approver's inbox (API doc §15.2). Two lists over one
// endpoint: what waits on me, and what I already decided. Rows only OPEN the
// request screen; approving or rejecting happens there, where the approver sees
// the whole chain and the notes, never from a row.

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

  // Tab and page live in the URL so a refresh or the back button returns to the
  // same view. Anything unknown falls back to the default rather than reaching
  // the server (an unknown ?status= is a 422 there).
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = INBOX_TABS.includes(searchParams.get("tab"))
    ? searchParams.get("tab")
    : INBOX_TABS[0];
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);

  const updateView = useCallback(
    (nextTab, nextPage) => {
      const next = new URLSearchParams();
      next.set("tab", nextTab);
      if (nextPage > 1) next.set("page", String(nextPage));
      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );

  // Which view the rows in the store belong to. The slice keeps the previous
  // response while a new one loads, and the first render after a tab change
  // happens BEFORE the fetch starts — so without this, the other tab's rows (and
  // its page count) flash under the new tab's header. The store records the view
  // of the response it holds (`loadedKey`, set only by the latest request), and
  // rows are shown only when that is exactly this tab and page.
  const viewKey = `${tab}:${page}`;
  const settled = loadedKey === viewKey;

  const load = useCallback(
    () => dispatch(fetchInbox(tab, page, PER_PAGE)),
    [dispatch, tab, page]
  );

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
      updateView(tab, meta.last_page);
    }
  }, [settled, meta, page, tab, updateView]);

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
                onSelect={(key) => key && key !== tab && updateView(key, 1)}
              >
                {INBOX_TABS.map((key) => (
                  <Nav.Item key={key}>
                    <Nav.Link eventKey={key} className="text-nowrap">
                      {TAB_LABELS[key]}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
              <DataTableServer
                columns={columns}
                data={rows}
                loading={fetchLoading || !settled}
                error={error}
                onRetry={load}
                emptyMessage={EMPTY_MESSAGES[tab]}
                currentPage={settled ? meta?.current_page || page : page}
                totalPages={settled ? meta?.last_page || 1 : 1}
                dataCount={settled ? meta?.total || 0 : 0}
                onPageChange={(next) => updateView(tab, next)}
                itemsPerPage={meta?.per_page ?? PER_PAGE}
                // 15 is not among the selector's sizes; the page size is fixed.
                showPageSizeSelector={false}
                onRowClick={openRequest}
                isRowClickable={(row) => rowTarget(row) !== null}
                showActions={false}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Fragment>
  );
};

export default ApprovalsInbox;
