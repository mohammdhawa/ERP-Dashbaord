import React, { Fragment, useEffect, useMemo, useState, Suspense, lazy } from "react";
import { Helmet } from "react-helmet";
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { PageHeader, DataTable } from "../../components";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import {
  fetchUsers,
  deleteUser,
  updateUser,
} from "../../redux/actions/usersActions";

const UserFormModal = lazy(() => import("./UserFormModal"));

const Users = () => {
  const dispatch = useDispatch();
  const { users, fetchLoading } = useSelector((state) => state.users);
  const { user: currentUser, permissions } = useSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Format B endpoint: the full collection arrives at once (no meta), so
  // search + pagination happen client-side.
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const canToggleActive = permissions.includes("auth.users.update");

  const handleToggleActive = (row) => {
    // Quick enable/disable from the list — partial update, only is_active.
    dispatch(updateUser(row.id, { is_active: !row.is_active })).catch(() => {});
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
      key: "employee_id",
      label: "الموظف المرتبط",
      render: (value) =>
        value ? (
          <span className="badge bg-info-transparent">موظف #{value}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
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
            <div className="p-3 pb-0">
              <Col md={6} lg={4}>
                <input
                  className="form-control"
                  type="text"
                  placeholder="ابحث بالاسم أو البريد الإلكتروني.."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Col>
            </div>
            <Card.Body>
              <DataTable
                columns={columns}
                data={filteredUsers}
                itemsPerPage={10}
                loading={fetchLoading}
                updatePermission="auth.users.update"
                deletePermission="auth.users.delete"
                functions={{
                  handleUpdate: (row) => {
                    setEditingUser(row);
                    setModalOpen(true);
                  },
                  handleDelete: (id) => dispatch(deleteUser(id)),
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

      <Suspense fallback={null}>
        <UserFormModal
          open={modalOpen}
          close={() => setModalOpen(false)}
          user={editingUser}
        />
      </Suspense>
    </Fragment>
  );
};

export default Users;
