import React, { useEffect, useState } from "react";
import { Col, Form, Row, Modal, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { createUser, updateUser } from "../../redux/actions/usersActions";

// Create + edit user accounts. Notes from the API doc (§4):
// - password: required on create, optional on edit (sent only when filled).
// - employee_id is READ-ONLY here (Phase 1) — displayed, never editable.
// - roles are NOT managed here; use the assign/unassign endpoints (Roles page).
const UserFormModal = ({ open, close, user }) => {
  const dispatch = useDispatch();
  const { saving } = useSelector((state) => state.users);
  const isEdit = Boolean(user);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    is_active: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        name: user?.name || "",
        email: user?.email || "",
        password: "",
        is_active: user ? Boolean(user.is_active) : true,
      });
      setErrors({});
      setShowPassword(false);
    }
  }, [open, user]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const clientErrors = {};
    if (!form.name.trim()) clientErrors.name = ["اسم المستخدم مطلوب."];
    if (!form.email.trim()) {
      clientErrors.email = ["البريد الإلكتروني مطلوب."];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) {
      clientErrors.email = ["يرجى إدخال بريد إلكتروني صالح."];
    }
    if (!isEdit && form.password.length < 8) {
      clientErrors.password = ["يجب أن تتكون كلمة المرور من 8 أحرف على الأقل."];
    }
    if (isEdit && form.password && form.password.length < 8) {
      clientErrors.password = ["يجب أن تتكون كلمة المرور من 8 أحرف على الأقل."];
    }
    return clientErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      is_active: form.is_active,
    };
    // On edit, omit password entirely unless the admin typed a new one
    // (server re-hashes only when sent).
    if (!isEdit || form.password) {
      payload.password = form.password;
    }

    try {
      if (isEdit) {
        await dispatch(updateUser(user.id, payload));
      } else {
        await dispatch(createUser(payload));
      }
      close();
    } catch (parsed) {
      // 422 includes email uniqueness:
      // "يوجد مستخدم مسجّل بهذا البريد الإلكتروني بالفعل."
      setErrors(parsed.errors || { _general: [parsed.message] });
    }
  };

  const fieldError = (field) => errors?.[field]?.[0];

  return (
    <Modal show={open} onHide={close} keyboard={false} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          {isEdit ? `تعديل المستخدم: ${user?.name}` : "إنشاء مستخدم جديد"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col sm={12}>
              <Form.Label htmlFor="user-name">الاسم *</Form.Label>
              <Form.Control
                id="user-name"
                type="text"
                maxLength={255}
                placeholder="الاسم الكامل"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                isInvalid={!!fieldError("name")}
                autoFocus
              />
              {fieldError("name") && (
                <div className="text-danger small mt-1">{fieldError("name")}</div>
              )}
            </Col>
            <Col sm={12}>
              <Form.Label htmlFor="user-email">البريد الإلكتروني *</Form.Label>
              <Form.Control
                id="user-email"
                type="email"
                maxLength={255}
                placeholder="name@example.com"
                dir="ltr"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                isInvalid={!!fieldError("email")}
              />
              {fieldError("email") && (
                <div className="text-danger small mt-1">{fieldError("email")}</div>
              )}
            </Col>
            <Col sm={12}>
              <Form.Label htmlFor="user-password">
                كلمة المرور {isEdit ? "(اتركها فارغة للإبقاء عليها)" : "*"}
              </Form.Label>
              <div className="position-relative authentication-input">
                <Form.Control
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isEdit ? "••••••••" : "8 أحرف على الأقل"}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  isInvalid={!!fieldError("password")}
                />
                <button
                  type="button"
                  className="btn btn-link show-password-button text-muted p-0"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <i className="ri-eye-line align-middle"></i>
                  ) : (
                    <i className="ri-eye-off-line align-middle"></i>
                  )}
                </button>
              </div>
              {fieldError("password") && (
                <div className="text-danger small mt-1">
                  {fieldError("password")}
                </div>
              )}
            </Col>
            <Col sm={12}>
              <Form.Check
                type="switch"
                id="user-active"
                label="الحساب مفعّل"
                checked={form.is_active}
                onChange={(e) => setField("is_active", e.target.checked)}
              />
            </Col>
            {isEdit && (
              <Col sm={12}>
                <div className="text-muted small">
                  <i className="ri-information-line align-middle me-1"></i>
                  الموظف المرتبط:{" "}
                  {user?.employee_id ? `#${user.employee_id}` : "لا يوجد"}
                  {" — "}للقراءة فقط في هذه المرحلة. الأدوار تُدار من صفحة
                  الأدوار والصلاحيات.
                </div>
              </Col>
            )}
          </Row>

          {errors._general && (
            <p className="text-danger mb-0">{errors._general[0]}</p>
          )}

          <Row className="g-2 mt-1">
            <Col sm={12} md={6}>
              <button
                className="btn btn-secondary fw-md w-100"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <Spinner animation="border" size="sm" />
                ) : isEdit ? (
                  "حفظ التعديلات"
                ) : (
                  "إنشاء"
                )}
              </button>
            </Col>
            <Col sm={12} md={6}>
              <button
                type="button"
                className="btn btn-light fw-md w-100"
                onClick={close}
              >
                إلغاء
              </button>
            </Col>
          </Row>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default UserFormModal;
