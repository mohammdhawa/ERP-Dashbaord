import React, { useMemo, useState } from "react";
import { Alert, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import Swal from "sweetalert2";
import { assignRole, unassignRole } from "../../redux/actions/rolesActions";
import { fetchAllUsers } from "../../redux/actions/usersActions";
import { refreshCurrentUser } from "../../redux/actions/authActions";

// Assign/unassign roles ⇄ users via the dedicated RBAC endpoints
// (POST /auth/roles/assign|unassign) — the single source of truth for grants.
// Requires auth.roles.update; the user dropdown additionally needs
// auth.users.view, so we fall back to a raw user-ID input without it.
const AssignRoleCard = () => {
  const dispatch = useDispatch();
  // allItems, not items: these are PICKERS and must list everything that
  // exists, not the page the table behind them happens to be showing.
  const { allItems: roles } = useSelector((state) => state.roles);
  const { allItems: users } = useSelector((state) => state.users);
  const { permissions, user: currentUser } = useSelector((state) => state.auth);

  const canListUsers = permissions.includes("auth.users.view");
  const [selectedUser, setSelectedUser] = useState(null);
  const [manualUserId, setManualUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const [submitting, setSubmitting] = useState(null); // "assign" | "unassign"

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: `${u.name} (${u.email})`,
      })),
    [users]
  );
  // Prefer the Arabic label for display, keep the machine name for clarity.
  const roleOptions = useMemo(
    () =>
      roles.map((r) => ({
        value: r.id,
        label: r.label ? `${r.label} (${r.name})` : r.name,
      })),
    [roles]
  );

  const resolvedUserId = canListUsers
    ? selectedUser?.value
    : manualUserId
    ? Number(manualUserId)
    : null;

  const submit = async (mode) => {
    if (!resolvedUserId || !selectedRole) return;

    // Revoking a role is destructive and silently takes screens away from
    // whoever held it — including, if they pick their own account, the admin
    // doing it. Every delete in this app confirms first; this did not.
    if (mode === "unassign") {
      const isSelf = resolvedUserId === currentUser?.id;
      const confirm = await Swal.fire({
        title: "سحب الدور من هذا المستخدم؟",
        text: isSelf
          ? "هذا حسابك — قد تفقد الوصول إلى شاشات تستخدمها الآن."
          : "سيفقد المستخدم كل الصلاحيات التي يمنحها هذا الدور.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "سحب",
        cancelButtonText: "إلغاء",
        reverseButtons: true,
        customClass: {
          confirmButton: "btn btn-danger me-2",
          cancelButton: "btn btn-light me-2",
        },
        buttonsStyling: false,
      });
      if (!confirm.isConfirmed) return;
    }

    setSubmitting(mode);
    try {
      const action = mode === "assign" ? assignRole : unassignRole;
      await dispatch(action(resolvedUserId, selectedRole.value));
      // Refresh the users list so role chips update, and re-pull /auth/me in
      // case the admin changed their own grants.
      if (canListUsers) dispatch(fetchAllUsers());
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
            {/* htmlFor + inputId: without the pair these labels were floating
                text and neither select had an accessible name. The employee and
                job-title filters already wire theirs up this way. */}
            <Form.Label htmlFor="assign-user">المستخدم</Form.Label>
            {canListUsers ? (
              <Select
                inputId="assign-user"
                options={userOptions}
                classNamePrefix="Select2"
                placeholder="اختر المستخدم"
                value={selectedUser}
                onChange={setSelectedUser}
                isClearable
              />
            ) : (
              <>
                <Alert variant="warning" className="py-2 px-3 mb-2">
                  <i className="ri-information-line align-middle me-1"></i>
                  قائمة المستخدمين غير متاحة — تتطلب صلاحية{" "}
                  <code>auth.users.view</code>. أدخل معرّف المستخدم يدويًا.
                </Alert>
                <Form.Control
                  id="assign-user"
                  type="number"
                  min={1}
                  placeholder="معرّف المستخدم (ID)"
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                />
              </>
            )}
          </Col>
          <Col sm={12} md={4}>
            <Form.Label htmlFor="assign-role">الدور</Form.Label>
            <Select
              inputId="assign-role"
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
              {/* type="button" on both: these sit in a Card, not a form today,
                  but an untyped <button> defaults to submit and would post the
                  moment this block is ever wrapped in one. */}
              <button
                type="button"
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
                type="button"
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
