import React, { useState } from "react";
import { Card, Col, Form, Row, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { assignRole, unassignRole } from "../../redux/actions/rolesActions";
import { fetchUsers } from "../../redux/actions/usersActions";
import { refreshCurrentUser } from "../../redux/actions/authActions";

// Assign/unassign roles ⇄ users via the dedicated RBAC endpoints
// (POST /auth/roles/assign|unassign) — the single source of truth for grants.
// Requires auth.roles.update; the user dropdown additionally needs
// auth.users.view, so we fall back to a raw user-ID input without it.
const AssignRoleCard = () => {
  const dispatch = useDispatch();
  const { roles } = useSelector((state) => state.roles);
  const { users } = useSelector((state) => state.users);
  const { permissions, user: currentUser } = useSelector((state) => state.auth);

  const canListUsers = permissions.includes("auth.users.view");
  const [selectedUser, setSelectedUser] = useState(null);
  const [manualUserId, setManualUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const [submitting, setSubmitting] = useState(null); // "assign" | "unassign"

  const userOptions = users.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.email})`,
  }));
  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));

  const resolvedUserId = canListUsers
    ? selectedUser?.value
    : manualUserId
    ? Number(manualUserId)
    : null;

  const submit = async (mode) => {
    if (!resolvedUserId || !selectedRole) return;
    setSubmitting(mode);
    try {
      const action = mode === "assign" ? assignRole : unassignRole;
      await dispatch(action(resolvedUserId, selectedRole.value));
      // Refresh the users list so role chips update, and re-pull /auth/me in
      // case the admin changed their own grants.
      if (canListUsers) dispatch(fetchUsers());
      if (resolvedUserId === currentUser?.id) dispatch(refreshCurrentUser());
    } catch {
      /* toast already shown by the action */
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Card className="custom-card">
      <Card.Header>
        <Card.Title>إسناد الأدوار للمستخدمين</Card.Title>
      </Card.Header>
      <Card.Body>
        <Row className="g-3 align-items-end">
          <Col sm={12} md={5}>
            <Form.Label>المستخدم</Form.Label>
            {canListUsers ? (
              <Select
                options={userOptions}
                classNamePrefix="Select2"
                placeholder="اختر المستخدم"
                value={selectedUser}
                onChange={setSelectedUser}
                isClearable
              />
            ) : (
              <Form.Control
                type="number"
                min={1}
                placeholder="معرّف المستخدم (ID)"
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
              />
            )}
          </Col>
          <Col sm={12} md={4}>
            <Form.Label>الدور</Form.Label>
            <Select
              options={roleOptions}
              classNamePrefix="Select2"
              placeholder="اختر الدور"
              value={selectedRole}
              onChange={setSelectedRole}
              isClearable
            />
          </Col>
          <Col sm={12} md={3}>
            <div className="d-flex gap-2">
              <button
                className="btn btn-secondary flex-fill"
                disabled={!resolvedUserId || !selectedRole || !!submitting}
                onClick={() => submit("assign")}
              >
                {submitting === "assign" ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "إسناد"
                )}
              </button>
              <button
                className="btn btn-outline-danger flex-fill"
                disabled={!resolvedUserId || !selectedRole || !!submitting}
                onClick={() => submit("unassign")}
              >
                {submitting === "unassign" ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "سحب"
                )}
              </button>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default AssignRoleCard;
