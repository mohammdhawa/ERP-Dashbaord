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
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import {
  fetchUsers,
  deleteUser,
  updateUser,
} from "../../redux/actions/usersActions";

const UserFormModal = lazy(() => import("./UserFormModal"));

const Users = () => {
  const dispatch = useDispatch();
  const { items, meta, fetchLoading, error } = useSelector(
    (state) => state.users
  );
  const { user: currentUser, permissions } = useSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  // Must be one of TablePagination's ROW_COUNT_OPTIONS (10/50/100).
  // 15 is the SERVER default, not an offered option: bound to the select
  // it showed "10" while fetching 15, and picking 10 changed nothing.
  const [perPage, setPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

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

  // ⚠️ SEARCHES THE CURRENT PAGE ONLY. The API has no `search` parameter yet,
  // so this cannot reach rows on other pages — the placeholder says so rather
  // than implying a directory-wide search that silently misses people. The real
  // fix is an allow-listed server-side filter (C30 in the API standard); until
  // that exists, do not present this as a global search.
  const visibleUsers = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const isSearching = searchQuery !== "";

  const canToggleActive = permissions.includes("auth.users.update");

  const handleToggleActive = (row) => {
    // Quick enable/disable from the list — partial update, only is_active.
    dispatch(updateUser(row.id, { is_active: !row.is_active }, page, perPage)).catch(
      () => {}
    );
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
      render: (value) => <span dir="ltr">{value}</span>,
    },
    {
      key: "roles",
      label: "الأدوار",
      render: (value) =>
        value?.length ? (
          <div className="d-flex gap-1 flex-wrap">
            {value.map((role) => (
              <span key={role} className="badge bg-primary-transparent">
                {role}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted">بدون أدوار</span>
        ),
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
      render: (value, row) => (
        <div className="form-check form-switch m-0">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={Boolean(value)}
            disabled={!canToggleActive || row.id === currentUser?.id}
            onChange={() => handleToggleActive(row)}
            title={
              row.id === currentUser?.id
                ? "لا يمكنك تعطيل حسابك الخاص"
                : value
                ? "تعطيل الحساب"
                : "تفعيل الحساب"
            }
          />
        </div>
      ),
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
                    placeholder="ابحث في هذه الصفحة بالاسم أو البريد.."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {isSearching && (
                    <div className="text-muted small mt-1">
                      البحث ضمن هذه الصفحة فقط ({visibleUsers.length} من{" "}
                      {items.length}). امسح البحث للتنقل بين الصفحات.
                    </div>
                  )}
                </Col>
              </Row>
            </div>
            <Card.Body>
              <DataTableServer
                columns={columns}
                data={visibleUsers}
                loading={fetchLoading}
                error={error}
                onRetry={load}
                emptyMessage={
                  isSearching
                    ? "لا يوجد مستخدمون مطابقون ضمن هذه الصفحة"
                    : "لا توجد بيانات لعرضها"
                }
                // While the page-local search is active the pagination bar
                // describes the FILTERED rows, not the server's page. Reporting
                // meta.total here made it claim "عرض 21–22 من 250" over two
                // matched rows, which reads as a broken directory-wide search.
                currentPage={isSearching ? 1 : meta?.current_page || page}
                totalPages={isSearching ? 1 : meta?.last_page || 1}
                dataCount={isSearching ? visibleUsers.length : meta?.total || 0}
                onPageChange={setPage}
                showPageSizeSelector={!isSearching}
                itemsPerPage={
                  isSearching
                    ? visibleUsers.length || 1
                    : meta?.per_page || perPage
                }
                onItemsPerPageChange={(size) => {
                  setPerPage(size);
                  setPage(1);
                }}
                updatePermission="auth.users.update"
                deletePermission="auth.users.delete"
                functions={{
                  handleUpdate: (row) => {
                    setEditingUser(row);
                    setModalOpen(true);
                  },
                  // An account stores no name of its own, so the confirmation
                  // is named by the linked employee and falls back to the
                  // email — the only other thing that identifies the account
                  // to a human. `employee.full_name` is preferred over `name`
                  // because it still resolves for a row where `name` is null.
                  handleDelete: (id, row) =>
                    dispatch(
                      deleteUser(
                        id,
                        page,
                        items.length,
                        perPage,
                        row?.employee?.full_name || row?.name || row?.email
                      )
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
