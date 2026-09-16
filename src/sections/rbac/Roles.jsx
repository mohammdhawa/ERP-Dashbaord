import React, {
  Fragment,
  useCallback,
  useEffect,
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
  fetchRoles,
  fetchAllRoles,
  deleteRole,
} from "../../redux/actions/rolesActions";
import { fetchAllUsers } from "../../redux/actions/usersActions";
import { permissionLabel } from "../../data/permissionsCatalog";
import AssignRoleCard from "./AssignRoleCard";

const RoleFormModal = lazy(() => import("./RoleFormModal"));

const Roles = () => {
  const dispatch = useDispatch();
  const { items, meta, fetchLoading, error } = useSelector(
    (state) => state.roles
  );
  const { permissions } = useSelector((state) => state.auth);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [page, setPage] = useState(1);
  // Must be one of TablePagination's ROW_COUNT_OPTIONS (10/50/100).
  // 15 is the SERVER default, not an offered option: bound to the select
  // it showed "10" while fetching 15, and picking 10 changed nothing.
  const [perPage, setPerPage] = useState(10);

  const canAssign = permissions.includes("auth.roles.update");
  const canListUsers = permissions.includes("auth.users.view");

  // The TABLE reads one page; the assignment card needs every row. Two separate
  // reads on purpose — a picker that stops at page 1 cannot grant a role to
  // user #200, and nothing on screen would say why.
  const load = useCallback(() => {
    dispatch(fetchRoles(page, perPage));
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

  useEffect(() => {
    if (!canAssign) return;
    dispatch(fetchAllRoles());
    if (canListUsers) dispatch(fetchAllUsers());
  }, [dispatch, canAssign, canListUsers]);

  const columns = [
    { key: "id", label: "#" },
    {
      key: "name",
      label: "الدور",
      // Show the Arabic label preferentially, keep the stable machine name
      // visible beneath it. System roles get a badge and cannot be mutated.
      render: (value, role) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold">
            {role.label || value}
            {role.is_system && (
              <span className="badge bg-danger-transparent fs-11 ms-1">
                نظام <i className="ri-shield-star-line align-middle"></i>
              </span>
            )}
          </span>
          <code className="fs-11 text-muted">{value}</code>
        </div>
      ),
    },
    {
      key: "description",
      label: "الوصف",
      render: (value) => value || <span className="text-muted">—</span>,
    },
    {
      key: "permissions",
      label: "الصلاحيات",
      render: (value) =>
        value?.length ? (
          <div
            className="d-flex gap-1 flex-wrap"
            style={{ maxWidth: "32rem", whiteSpace: "normal" }}
          >
            {value.map((perm) => (
              <span
                key={perm}
                className="badge bg-primary-transparent"
                title={perm}
              >
                {permissionLabel(perm)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted">بدون صلاحيات</span>
        ),
    },
  ];

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | الأدوار والصلاحيات</title>
      </Helmet>
      <PageHeader
        homepage="الأدوار والصلاحيات"
        activepage="إدارة النظام"
        page="الأدوار والصلاحيات"
      >
        <ProtectedElement
          element={
            <button
              onClick={() => {
                setEditingRole(null);
                setModalOpen(true);
              }}
              className="btn btn-secondary btn-wave"
            >
              <i className="ri-add-line align-middle me-1"></i> إنشاء دور
            </button>
          }
          requiredPermissions={["auth.roles.create"]}
        />
      </PageHeader>

      {/* Assignment block needs auth.roles.update */}
      <ProtectedElement
        element={<AssignRoleCard />}
        requiredPermissions={["auth.roles.update"]}
      />

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              <DataTableServer
                columns={columns}
                data={items}
                currentPage={meta?.current_page || page}
                totalPages={meta?.last_page || 1}
                dataCount={meta?.total || 0}
                onPageChange={setPage}
                itemsPerPage={meta?.per_page || perPage}
                onItemsPerPageChange={(size) => {
                  setPerPage(size);
                  setPage(1);
                }}
                loading={fetchLoading}
                // A failed fetch used to fall through to the generic empty
                // message, presenting an outage as "there are no roles".
                error={error}
                onRetry={load}
                updatePermission="auth.roles.update"
                deletePermission="auth.roles.delete"
                functions={{
                  handleUpdate: (role) => {
                    setEditingRole(role);
                    setModalOpen(true);
                  },
                  handleDelete: (id) =>
                    dispatch(deleteRole(id, page, items.length, perPage)),
                  // System roles (is_system) cannot be renamed/edited/deleted
                  // (server 409). Disable both controls; assignment stays open.
                  disableUpdate: (role) => role.is_system,
                  disabledUpdateReason: "دور نظام لا يمكن تعديله",
                  disableDelete: (role) => role.is_system,
                  disabledDeleteReason: "دور نظام لا يمكن حذفه",
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
        <RoleFormModal
          open={modalOpen}
          close={() => setModalOpen(false)}
          role={editingRole}
          currentPage={page}
          perPage={perPage}
        />
      </Suspense>
    </Fragment>
  );
};

export default Roles;
