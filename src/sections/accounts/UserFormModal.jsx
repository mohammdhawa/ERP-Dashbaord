import React, { useEffect, useState } from "react";
import { Col, Form, Row, Modal, Spinner } from "react-bootstrap";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import { createUser, updateUser } from "../../redux/actions/usersActions";
import { hasPermission } from "../../data/permissionsCatalog";
import { useResourceOptions } from "../departments/useResourceOptions";

// Create + edit user accounts. Notes from the API doc (§4):
// - An account stores NO name of its own: the display name tracks the linked
//   employee. We never collect or submit `name` here.
// - employee_id is REQUIRED on create; optional on update (re-links). The
//   picker uses only the paginated /hr/employees endpoint (hr.employees.view);
//   without that permission we fall back to a manual numeric ID.
// - password: required on create, optional on edit (sent only when filled —
//   a blank password is omitted, never submitted as "").
// - roles are read-only here; grant/revoke lives on the Roles page.
const employeeToOption = (e) => ({
  value: e.id,
  label: e.name ? `${e.name} (#${e.id})` : `موظف #${e.id}`,
});

const UserFormModal = ({ open, close, user }) => {
  const dispatch = useDispatch();
  const { saving } = useSelector((state) => state.users);
  const { permissions } = useSelector((state) => state.auth);
  const isEdit = Boolean(user);

  const canReadEmployees = hasPermission(permissions, "hr.employees.view");

  const [form, setForm] = useState({
    employee_id: "",
    email: "",
    password: "",
    is_active: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Full employee list for the picker: loaded only while the modal is open and
  // only when the user owns hr.employees.view. Walks documented pages so the
  // options are the complete collection (or `incomplete` if a page failed).
  const employees = useResourceOptions(
    "/hr/employees",
    employeeToOption,
    open && canReadEmployees
  );

  useEffect(() => {
    if (open) {
      setForm({
        employee_id: user?.employee_id ?? "",
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
    // employee_id is required on create; on edit it is optional (re-link).
    if (!isEdit && (form.employee_id === "" || form.employee_id == null)) {
      clientErrors.employee_id = ["يجب ربط الحساب بموظف."];
    }
    if (!form.email.trim()) {
      clientErrors.email = ["البريد الإلكتروني مطلوب."];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) {
      clientErrors.email = ["يرجى إدخال بريد إلكتروني صالح."];
    }
    if (!isEdit && form.password.length < 8) {
      clientErrors.password = ["يجب أن تتكون كلمة المرور من 8 أحرف على الأقل."];
    } else if (isEdit && form.password && form.password.length < 8) {
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
      email: form.email.trim(),
      is_active: form.is_active,
    };
    // On edit, omit password entirely unless the admin typed a new one
    // (server re-hashes only when sent).
    if (!isEdit || form.password) {
      payload.password = form.password;
    }
    if (!isEdit) {
      // Required on create.
      payload.employee_id = Number(form.employee_id);
    } else if (
      form.employee_id !== "" &&
      form.employee_id != null &&
      Number(form.employee_id) !== user.employee_id
    ) {
      // Partial update: only re-link when the admin actually changed it.
      payload.employee_id = Number(form.employee_id);
    }

    try {
      if (isEdit) {
        await dispatch(updateUser(user.id, payload));
      } else {
        await dispatch(createUser(payload));
      }
      close();
    } catch (parsed) {
      // 422 maps onto fields: employee_id.exists/unique, email.unique, etc.
      setErrors(parsed.errors || { _general: [parsed.message] });
    }
  };

  const fieldError = (field) => errors?.[field]?.[0];

  const showEmployeePicker = canReadEmployees && !employees.error;

  return (
    <Modal show={open} onHide={close} keyboard={false} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          {isEdit
            ? `تعديل المستخدم${user?.name ? `: ${user.name}` : ""}`
            : "إنشاء مستخدم جديد"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col sm={12}>
              <Form.Label htmlFor="user-employee">
                الموظف المرتبط {isEdit ? "" : "*"}
              </Form.Label>
              {showEmployeePicker ? (
                <>
                  <Select
                    inputId="user-employee"
                    classNamePrefix="Select2"
                    options={employees.options}
                    value={
                      employees.options.find(
                        (o) => o.value === Number(form.employee_id)
                      ) || null
                    }
                    onChange={(opt) =>
                      setField("employee_id", opt ? opt.value : "")
                    }
                    isClearable={isEdit}
                    isLoading={employees.loading}
                    placeholder="اختر الموظف"
                    noOptionsMessage={() => "لا يوجد موظفون"}
                    menuPosition="fixed"
                  />
                  {employees.incomplete && (
                    <div className="text-warning small mt-1">
                      تعذّر تحميل كل الموظفين، القائمة غير مكتملة.
                    </div>
                  )}
                  <div className="text-muted small mt-1">
                    التصفية ضمن القائمة المحمّلة فقط، وليست بحثًا في الخادم.
                  </div>
                </>
              ) : (
                // Truthful fallback: without hr.employees.view (or a load
                // failure) we cannot list employees, so accept a raw ID.
                <>
                  <Form.Control
                    id="user-employee"
                    type="number"
                    min={1}
                    placeholder="معرّف الموظف (ID)"
                    value={form.employee_id}
                    onChange={(e) => setField("employee_id", e.target.value)}
                    isInvalid={!!fieldError("employee_id")}
                  />
                  <div className="text-muted small mt-1">
                    تعذّر تحميل قائمة الموظفين، أدخل معرّف الموظف يدويًا.
                  </div>
                </>
              )}
              {fieldError("employee_id") && (
                <div className="text-danger small mt-1">
                  {fieldError("employee_id")}
                </div>
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
                  الأدوار:{" "}
                  {user?.roles?.length ? (
                    <span className="d-inline-flex gap-1 flex-wrap align-middle">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="badge bg-primary-transparent"
                        >
                          {role}
                        </span>
                      ))}
                    </span>
                  ) : (
                    "بدون أدوار"
                  )}
                  {" — "}تُدار من صفحة الأدوار والصلاحيات.
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
