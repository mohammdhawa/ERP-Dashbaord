import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  Suspense,
  lazy,
} from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Row, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import { confirmDestructive } from "../../utils";
import {
  fetchUsers,
  fetchAllUsers,
  deleteUser,
  updateUser,
} from "../../redux/actions/usersActions";
import { describeGrantScope, grantKey } from "../rbac/grantScope";

// How an account is named to a human. An account stores no name of its own, so
// this walks the linked employee, then the legacy `name`, then the email —
// the only other thing that identifies it. Used by the confirmation dialogs,
// the row action labels and the switch, so all four say the same thing.
const accountLabel = (row) =>
  row?.employee?.full_name || row?.name || row?.email || "";

const UserFormModal = lazy(() => import("./UserFormModal"));

const Users = () => {
  const dispatch = useDispatch();
  const {
    items,
    meta,
    fetchLoading,
    error,
    // The whole directory, walked page by page. Only loaded while a search is
    // active — see the effect below.
    allItems,
    allLoading,
    allError,
    allLoaded,
  } = useSelector((state) => state.users);
  const { user: currentUser, permissions } = useSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  // Must be one of TablePagination's ROW_COUNT_OPTIONS (10/50/100).
  // 15 is the SERVER default, not an offered option: bound to the select
  // it showed "10" while fetching 15, and picking 10 changed nothing.
  const [perPage, setPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  // Which row's enable/disable request is in flight, so that row alone can show
  // a spinner and refuse further clicks.
  const [togglingId, setTogglingId] = useState(null);
  // Announced to screen readers when a toggle starts and finishes; the switch
  // itself only changes once the server has answered.
  const [toggleStatus, setToggleStatus] = useState("");
  // Which page of the SEARCH RESULTS is shown. Kept apart from `page` so
  // clearing the search returns to the server page you were on.
  const [searchPage, setSearchPage] = useState(1);

  // Server-paginated: the API returns one page plus `meta`. It used to return
  // the whole collection, which is what let search and paging run client-side.
  const load = useCallback(() => {
    dispatch(fetchUsers(page, perPage));
  }, [dispatch, page, perPage]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the COMPONENT page in step with the server. A delete that empties
  // the last page makes the action re-fetch the preceding one, but nothing
  // moved `page` itself, so the next mutation re-fetched the page that no
  // longer exists. Snapping back here is the same repair the departments and
  // employees lists already do.
  useEffect(() => {
    if (meta && meta.last_page >= 1 && page > meta.last_page) {
      setPage(meta.last_page);
    }
  }, [meta, page]);

  const query = searchQuery.trim().toLowerCase();
  const isSearching = query !== "";

  // SEARCHES THE WHOLE DIRECTORY, not the page on screen.
  //
  // It used to filter `items` — the fifteen rows the server had just sent —
  // and said so honestly in the UI. Honest, but an administrator looking up a
  // colleague on page 7 still got "no matching users" and no reason to think
  // the person existed. `/api/auth/users` accepts no `search` parameter (unlike
  // /hr/employees and /hr/job-titles, which document one), so reaching every
  // row means holding every row: the directory is walked once, lazily, only
  // when a search is actually typed, and re-walked after any mutation. See the
  // warning on fetchAllUsers — this is the stand-in for a server filter, not a
  // replacement for one.
  useEffect(() => {
    if (isSearching && !allLoaded && !allLoading) {
      dispatch(fetchAllUsers());
    }
  }, [dispatch, isSearching, allLoaded, allLoading]);

  // A new query starts at the first page of its own results.
  useEffect(() => {
    setSearchPage(1);
  }, [query]);

  const matches = useMemo(() => {
    if (!isSearching) return [];
    // Coerced before lowercasing: `employee_number` is documented as a string
    // but arrives as whatever the server sent, and `.toLowerCase()` on a number
    // would throw inside a render.
    const hit = (value) =>
      value != null && String(value).toLowerCase().includes(query);
    return allItems.filter(
      (u) =>
        hit(u.name) ||
        hit(u.email) ||
        hit(u.employee?.full_name) ||
        hit(u.employee?.employee_number)
    );
  }, [allItems, isSearching, query]);

  // Results are paged client-side at the same size as the server list, so a
  // search for "محمد" does not render four hundred rows at once.
  const visibleUsers = useMemo(() => {
    if (!isSearching) return items;
    const start = (searchPage - 1) * perPage;
    return matches.slice(start, start + perPage);
  }, [isSearching, items, matches, searchPage, perPage]);

  const searchLastPage = Math.max(1, Math.ceil(matches.length / perPage));

  // A search that is still walking pages, or that failed to, must not render as
  // "no results" — that is the same silent miss the page-local search had.
  const searchPending = isSearching && (allLoading || (!allLoaded && !allError));

  const canToggleActive = permissions.includes("auth.users.update");

  // Enable/disable an account — a partial update carrying only `is_active`.
  //
  // Three things this used to lack. It fired on every click with no
  // confirmation, so disabling someone's access was a single mis-aimed tap on a
  // 40px switch. It stayed enabled while the request was in flight, so repeated
  // clicks queued overlapping PUTs whose order decided the final state. And the
  // switch is controlled by the SERVER value, so between the click and the
  // response it showed the old position — reading as "the click did nothing"
  // and inviting exactly that second click.
  const handleToggleActive = async (row) => {
    if (togglingId) return;

    const label = accountLabel(row);
    // Only DISABLING is confirmed. Re-enabling an account restores access and
    // is trivially reversible; a dialog on it would be noise, and noise is how
    // a confirmation stops being read.
    if (row.is_active) {
      const confirmed = await confirmDestructive({
        action: "تعطيل حساب",
        subject: label,
        text: "لن يتمكن صاحب الحساب من تسجيل الدخول حتى تتم إعادة تفعيله.",
        confirmButtonText: "تعطيل",
      });
      if (!confirmed) return;
    }

    setTogglingId(row.id);
    setToggleStatus(
      row.is_active ? `جارٍ تعطيل ${label}…` : `جارٍ تفعيل ${label}…`
    );
    try {
      await dispatch(
        updateUser(row.id, { is_active: !row.is_active }, page, perPage)
      );
      setToggleStatus(
        row.is_active ? `تم تعطيل ${label}` : `تم تفعيل ${label}`
      );
    } catch {
      // The action already raised the server's own message as a toast; the
      // switch stays where it was because it reflects the server, not the click.
      setToggleStatus(`تعذّر تغيير حالة ${label}`);
    } finally {
      setTogglingId(null);
    }
  };

  const columns = [
    { key: "id", label: "#" },
    {
      key: "name",
      // No stored account name — this is the linked employee's name, null when
      // the account is not linked to an employee.
      label: "الاسم",
      render: (value) =>
        value ? value : <span className="text-muted">غير مرتبط</span>,
    },
    {
      key: "email",
      label: "البريد الإلكتروني",
      // Nullable since the account model — most staff have no email.
      render: (value) =>
        value ? (
          <span dir="ltr">{value}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      // One chip per GRANT, not per role name (GAP-3, 2026-09-24): a grant is
      // a role plus how far it reaches, and the same role may be held over two
      // units. `roles` is still the de-duplicated name list and is the
      // fallback if a response ever arrives without `grants`.
      key: "roles",
      label: "الأدوار",
      render: (value, row) => {
        if (Array.isArray(row.grants)) {
          return row.grants.length ? (
            <div className="d-flex gap-1 flex-wrap">
              {row.grants.map((grant) => (
                <span
                  key={grantKey(grant)}
                  className="badge bg-primary-transparent"
                  title={grant.scope_label || undefined}
                >
                  {grant.role}
                  <span className="fw-normal opacity-75">
                    {" "}
                    · {describeGrantScope(grant)}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted">بدون أدوار</span>
          );
        }

        return value?.length ? (
          <div className="d-flex gap-1 flex-wrap">
            {value.map((role) => (
              <span key={role} className="badge bg-primary-transparent">
                {role}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted">بدون أدوار</span>
        );
      },
    },
    {
      // Embedded on the resource now — `employee: { id, full_name,
      // employee_number }` beside the untouched `employee_id`. Three states,
      // not two: unlinked (dash), linked (the person), and linked-to-a-
      // soft-deleted-record, where the id survives but the employee does not.
      // That last one must not read as "unlinked" — the account IS bound to an
      // employee row, and an admin needs to see that to fix it.
      key: "employee",
      label: "الموظف المرتبط",
      render: (employee, row) => {
        if (!row.employee_id) return <span className="text-muted">—</span>;

        if (!employee) {
          return (
            <span
              className="badge bg-secondary-transparent"
              title="الموظف المرتبط لم يعد متاحاً (سجل محذوف)"
            >
              موظف #{row.employee_id} — سجل غير متاح
            </span>
          );
        }

        return (
          <span
            className="badge bg-info-transparent"
            title={employee.employee_number || undefined}
          >
            {employee.full_name}
          </span>
        );
      },
    },
    {
      key: "is_active",
      label: "الحالة",
      nowrap: true,
      render: (value, row) => {
        const isSelf = row.id === currentUser?.id;
        const isPending = togglingId === row.id;
        const label = accountLabel(row);
        // The switch was unlabelled: a screen reader announced a column of
        // identical bare switches with no way to tell whose account each one
        // governed, or what flipping it would do.
        const description = isSelf
          ? "لا يمكنك تعطيل حسابك الخاص"
          : value
          ? `تعطيل حساب ${label}`
          : `تفعيل حساب ${label}`;

        return (
          <div className="d-flex align-items-center gap-2">
            <div className="form-check form-switch m-0">
              <input
                id={`user-active-${row.id}`}
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={Boolean(value)}
                // Disabled while ITS OWN request is in flight. Without this the
                // switch accepted a second click before the first had answered,
                // and two overlapping PUTs settled in arrival order.
                disabled={!canToggleActive || isSelf || isPending}
                onChange={() => handleToggleActive(row)}
                aria-label={description}
                aria-busy={isPending || undefined}
                title={description}
              />
            </div>
            {isPending ? (
              <Spinner
                animation="border"
                size="sm"
                className="text-muted"
                aria-hidden="true"
              />
            ) : (
              <span
                className={`fs-12 ${value ? "text-success" : "text-muted"}`}
              >
                {value ? "مُفعّل" : "معطّل"}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | المستخدمين</title>
      </Helmet>
      <PageHeader
        homepage="المستخدمين"
        activepage="إدارة النظام"
        page="المستخدمين"
      >
        <ProtectedElement
          element={
            <button
              onClick={() => {
                setEditingUser(null);
                setModalOpen(true);
              }}
              className="btn btn-secondary btn-wave"
            >
              <i className="ri-user-add-line align-middle me-1"></i> إنشاء
              مستخدم
            </button>
          }
          requiredPermissions={["auth.users.create"]}
        />
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            {/* A bare <Col> outside a <Row> gets no gutter compensation, so
                the control sat flush against the card edge. */}
            <div className="p-3 pb-0">
              <Row>
                <Col md={6} lg={4}>
                  <label htmlFor="users-search" className="form-label fs-12 mb-1">
                    بحث
                  </label>
                  <input
                    id="users-search"
                    className="form-control"
                    type="search"
                    placeholder="ابحث بالاسم أو البريد أو الرقم الوظيفي.."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-describedby="users-search-status"
                  />
                  {/* aria-live so the result count reaches a screen reader as
                      it changes — the count is the only feedback a search
                      gives, and it was previously only drawn. */}
                  <div
                    id="users-search-status"
                    className="small mt-1"
                    aria-live="polite"
                  >
                    {!isSearching ? null : searchPending ? (
                      <span className="text-muted">
                        <Spinner
                          animation="border"
                          size="sm"
                          className="align-middle ms-1"
                          aria-hidden="true"
                        />
                        جارٍ تحميل دليل المستخدمين للبحث الكامل…
                      </span>
                    ) : allError ? (
                      <span className="text-danger">
                        تعذّر تحميل الدليل الكامل: {allError}{" "}
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 align-baseline"
                          onClick={() => dispatch(fetchAllUsers())}
                        >
                          إعادة المحاولة
                        </button>
                      </span>
                    ) : (
                      <span className="text-muted">
                        {matches.length} نتيجة في كامل الدليل ({allItems.length}{" "}
                        حساب).
                      </span>
                    )}
                  </div>
                </Col>
              </Row>
            </div>
            {/* Off-screen status for the enable/disable switch. The switch
                reflects the SERVER value, so between click and response it
                shows the old position and nothing is announced; this says what
                is happening and how it ended. */}
            <span className="visually-hidden" role="status" aria-live="polite">
              {toggleStatus}
            </span>
            <Card.Body>
              <DataTableServer
                columns={columns}
                data={visibleUsers}
                // While searching, "loading" is the directory walk, not the
                // page fetch — otherwise the table shows an empty-results
                // message over a directory that has not arrived yet.
                loading={isSearching ? searchPending : fetchLoading}
                error={isSearching ? allError : error}
                onRetry={
                  isSearching ? () => dispatch(fetchAllUsers()) : load
                }
                emptyMessage={
                  isSearching
                    ? "لا يوجد مستخدمون مطابقون في الدليل"
                    : "لا توجد بيانات لعرضها"
                }
                // While a search is active the pagination bar describes the
                // MATCHES, not the server's page — reporting meta.total here
                // would claim "عرض 21–22 من 250" over two matched rows.
                currentPage={isSearching ? searchPage : meta?.current_page || page}
                totalPages={isSearching ? searchLastPage : meta?.last_page || 1}
                dataCount={isSearching ? matches.length : meta?.total || 0}
                onPageChange={isSearching ? setSearchPage : setPage}
                itemsPerPage={
                  isSearching ? perPage : meta?.per_page || perPage
                }
                onItemsPerPageChange={(size) => {
                  setPerPage(size);
                  setPage(1);
                  setSearchPage(1);
                }}
                updatePermission="auth.users.update"
                deletePermission="auth.users.delete"
                functions={{
                  handleUpdate: (row) => {
                    setEditingUser(row);
                    setModalOpen(true);
                  },
                  // Names the edit/delete buttons, which are otherwise a column
                  // of identical "تعديل"/"حذف" to a screen reader.
                  rowLabel: accountLabel,
                  // An account stores no name of its own, so the confirmation
                  // is named by the linked employee and falls back to the
                  // email — see accountLabel.
                  handleDelete: (id, row) =>
                    dispatch(
                      deleteUser(id, page, items.length, perPage, accountLabel(row))
                    ),
                  // Self-deletion guard: the server rejects it with 422 anyway,
                  // but we disable the button up-front to avoid the error.
                  disableDelete: (row) => row.id === currentUser?.id,
                  disabledDeleteReason: "لا يمكنك حذف حسابك الخاص",
                }}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Fallback gated on the open flag, NOT unconditional: the lazy
          element below is always mounted so its chunk prefetches with the
          page, which means this boundary is suspended during ordinary page
          load too — an unconditional fallback would flash a modal shell on
          every visit. See ModalFallback. */}
      <Suspense fallback={modalOpen ? <ModalFallback /> : null}>
        <UserFormModal
          open={modalOpen}
          close={() => setModalOpen(false)}
          user={editingUser}
          currentPage={page}
          perPage={perPage}
        />
      </Suspense>
    </Fragment>
  );
};

export default Users;
