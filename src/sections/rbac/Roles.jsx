import React, { Fragment, useEffect, useState, Suspense, lazy } from "react";
import { Helmet } from "react-helmet";
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { PageHeader, DataTable } from "../../components";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import { fetchRoles, deleteRole } from "../../redux/actions/rolesActions";
import { fetchUsers } from "../../redux/actions/usersActions";
import { permissionLabel } from "../../data/permissionsCatalog";
import AssignRoleCard from "./AssignRoleCard";

const RoleFormModal = lazy(() => import("./RoleFormModal"));

const Roles = () => {
  const dispatch = useDispatch();
  const { roles, fetchLoading } = useSelector((state) => state.roles);
  const { permissions } = useSelector((state) => state.auth);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const canAssign = permissions.includes("auth.roles.update");
  const canListUsers = permissions.includes("auth.users.view");

  useEffect(() => {
    dispatch(fetchRoles());
    // Users feed the assignment dropdown — only fetch when both visible and allowed.
    if (canAssign && canListUsers) dispatch(fetchUsers());
  }, [dispatch, canAssign, canListUsers]);

  const columns = [
    { key: "id", label: "#" },
    {
      key: "name",
      label: "الدور",
      render: (value) =>
        value === "admin" ? (
          <span className="badge bg-danger-transparent fs-12">
            {value} <i className="ri-shield-star-line align-middle"></i>
          </span>
        ) : (
          <span className="fw-semibold">{value}</span>
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
              <DataTable
                columns={columns}
                data={roles}
                itemsPerPage={10}
                loading={fetchLoading}
                updatePermission="auth.roles.update"
                deletePermission="auth.roles.delete"
                functions={{
                  handleUpdate: (role) => {
                    setEditingRole(role);
                    setModalOpen(true);
                  },
                  handleDelete: (id) => dispatch(deleteRole(id)),
                  // The seeded admin role is protected server-side (422);
                  // hide its delete action entirely.
                  hideDelete: (role) => role.name === "admin",
                }}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Suspense fallback={null}>
        <RoleFormModal
          open={modalOpen}
          close={() => setModalOpen(false)}
          role={editingRole}
        />
      </Suspense>
    </Fragment>
  );
};

export default Roles;
