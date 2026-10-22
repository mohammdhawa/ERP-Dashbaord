import React, { useEffect, useRef, useState } from "react";
import { Col, Form, Row, Modal, Spinner, Alert } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { createRole, updateRole } from "../../redux/actions/rolesActions";
import {
  ASSIGN_ROLES_PERMISSION,
  PERMISSIONS_CATALOG,
  permissionLabel,
} from "../../data/permissionsCatalog";
import { confirmDiscardChanges } from "../../utils";
import { permissionsNotHeld } from "./grantScope";

// One checkbox row — the same flex layout as AssignmentFormModal's CarryOption,
// for the same reason: `<Form.Check label="…" />` floats the marker into a
// padding it only just fits, leaving ~5.6px before the first Arabic letter, and
// a label that wraps runs its second line under the marker. Here `gap` is the
// clearance, and the label is its own flex item, so a wrapped line stays
// aligned with the first. `align-items-start` + the marker's small top margin
// keep the box on the first line of a multi-line label.
//
// `indeterminate` is a DOM property with no HTML attribute, so it is set
// through a ref rather than a prop.
const CheckRow = ({ id, checked, indeterminate = false, disabled, onChange, children }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <Form.Check className="d-flex align-items-start gap-2 ps-0 mb-0">
      <Form.Check.Input
        ref={ref}
        type="checkbox"
        id={id}
        className="flex-shrink-0 m-0 mt-1"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <Form.Check.Label htmlFor={id} className="flex-grow-1">
        {children}
      </Form.Check.Label>
    </Form.Check>
  );
};

// Role create/edit with a checkbox matrix over the Phase-1 permission
// catalogue. On UPDATE the `permissions` array is a full SYNC: the server
// replaces the role's set with exactly what we send, and an empty array wipes
// every permission — hence the explicit warning before submitting empty.
const RoleFormModal = ({ open, close, role, currentPage = 1, perPage }) => {
  const dispatch = useDispatch();
  const { saving } = useSelector((state) => state.roles);
  const { permissions: callerPermissions, user: currentUser } = useSelector(
    (state) => state.auth
  );
  const isEdit = Boolean(role);

  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState([]);
  // Sync semantics: on UPDATE we send `permissions` ONLY when the matrix was
  // touched. Untouched → key omitted → set left unchanged. Touched but empty →
  // `permissions: []` → all permissions cleared. On CREATE we always send it.
  const [permsDirty, setPermsDirty] = useState(false);
  const [errors, setErrors] = useState({});
  const isSystemRole = Boolean(role?.is_system);

  // The text fields as the modal opened, for the discard guard. The permission
  // matrix is not snapshotted: `permsDirty` already records whether it was
  // touched, and it is a better answer than comparing arrays — checking a box
  // and unchecking it leaves an identical array but is still a session the user
  // may not want thrown away without a word.
  const [initialText, setInitialText] = useState({
    name: "",
    label: "",
    description: "",
  });

  useEffect(() => {
    if (open) {
      const values = {
        name: role?.name || "",
        label: role?.label || "",
        description: role?.description || "",
      };
      setName(values.name);
      setLabel(values.label);
      setDescription(values.description);
      setInitialText(values);
      setSelected(role?.permissions || []);
      setPermsDirty(false);
      setErrors({});
    }
  }, [open, role]);

  // GAP-16 (2026-09-28): editing a role changes what every holder of it may
  // do, so the server accepts only changes to permissions the editor holds
  // company-wide (403 otherwise). Only what CHANGED is checked — a permission
  // left as it was is not the editor's to hold. /auth/me carries no scopes,
  // so this catches the certain refusals only; see permissionsNotHeld().
  const original = role?.permissions || [];
  const changedPermissions =
    isEdit && !permsDirty
      ? []
      : [
          ...selected.filter((p) => !original.includes(p)),
          ...original.filter((p) => !selected.includes(p)),
        ];
  const notHeld = permissionsNotHeld(changedPermissions, {
    roles: currentUser?.roles,
    permissions: callerPermissions,
  });

  const isDirty =
    permsDirty ||
    name !== initialText.name ||
    label !== initialText.label ||
    description !== initialText.description;

  // Of every form in this app, this is the one worth guarding most: the matrix
  // below is 28 checkboxes, and rebuilding a role's permission set from memory
  // after an accidental "إلغاء" is genuinely expensive.
  const handleCancel = async () => {
    if (!isDirty) {
      close();
      return;
    }
    if (await confirmDiscardChanges()) close();
  };

  const togglePermission = (permName) => {
    setPermsDirty(true);
    setSelected((prev) =>
      prev.includes(permName)
        ? prev.filter((p) => p !== permName)
        : [...prev, permName]
    );
  };

  const toggleGroup = (group) => {
    setPermsDirty(true);
    const names = group.permissions.map((p) => p.name);
    const allSelected = names.every((n) => selected.includes(n));
    setSelected((prev) =>
      allSelected
        ? prev.filter((p) => !names.includes(p))
        : [...new Set([...prev, ...names])]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: ["اسم الدور مطلوب."] });
      return;
    }

    const payload = {
      name: name.trim(),
      label: label.trim() || null,
      description: description.trim() || null,
    };
    // Include `permissions` on create always, and on edit only when the matrix
    // changed — omitting it leaves the role's set untouched; [] clears it.
    if (!isEdit || permsDirty) {
      payload.permissions = selected;
    }

    try {
      if (isEdit) {
        await dispatch(updateRole(role.id, payload, currentPage, perPage));
      } else {
        await dispatch(createRole(payload, currentPage, perPage));
      }
      close();
    } catch (parsed) {
      // 422: duplicate name ("يوجد دور بهذا الاسم بالفعل.") or unknown permission.
      setErrors(parsed.errors || { _general: [parsed.message] });
    }
  };

  const fieldError = (field) => errors?.[field]?.[0];

  return (
    <Modal
      show={open}
      size="lg"
      onHide={handleCancel}
      keyboard={false}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          {isEdit
            ? `تعديل الدور: ${role?.label || role?.name}`
            : "إنشاء دور جديد"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
          {isSystemRole && (
            <Alert variant="info" className="py-2 px-3 mb-0">
              <i className="ri-shield-star-line align-middle me-1"></i>
              دور نظام — لا يمكن إعادة تسميته أو تعديله أو حذفه.
            </Alert>
          )}
          <Row className="g-3">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="role-name">اسم الدور *</Form.Label>
              <Form.Control
                id="role-name"
                type="text"
                maxLength={255}
                placeholder="مثال: hr_clerk"
                value={name}
                disabled={isSystemRole}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: null }));
                }}
                isInvalid={!!fieldError("name")}
                autoFocus={!isEdit}
              />
              {fieldError("name") && (
                <div className="text-danger small mt-1">{fieldError("name")}</div>
              )}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="role-label">الاسم المعروض</Form.Label>
              <Form.Control
                id="role-label"
                type="text"
                maxLength={255}
                placeholder="مثال: موظف إدخال بيانات"
                value={label}
                disabled={isSystemRole}
                onChange={(e) => setLabel(e.target.value)}
                isInvalid={!!fieldError("label")}
              />
              {fieldError("label") && (
                <div className="text-danger small mt-1">
                  {fieldError("label")}
                </div>
              )}
            </Col>
            <Col sm={12}>
              <Form.Label htmlFor="role-description">الوصف</Form.Label>
              <Form.Control
                id="role-description"
                type="text"
                maxLength={255}
                placeholder="وصف مختصر للدور"
                value={description}
                disabled={isSystemRole}
                onChange={(e) => setDescription(e.target.value)}
                isInvalid={!!fieldError("description")}
              />
              {fieldError("description") && (
                <div className="text-danger small mt-1">
                  {fieldError("description")}
                </div>
              )}
            </Col>
          </Row>

          <div>
            <Form.Label className="mb-2">الصلاحيات</Form.Label>
            {/* Visual warning per spec: clearing the matrix on edit and saving
                strips the role of ALL its permissions (sync semantics). Only
                relevant once the matrix has actually been touched. */}
            {isEdit && permsDirty && selected.length === 0 && (
              <Alert variant="warning" className="py-2 px-3 mb-2">
                <i className="ri-alert-line align-middle me-1"></i>
                تحذير: حفظ الدور بدون أي صلاحية محددة سيؤدي إلى{" "}
                <strong>إزالة جميع الصلاحيات</strong> من هذا الدور.
              </Alert>
            )}
            {notHeld.length > 0 && (
              <Alert variant="danger" className="py-2 px-3 mb-2">
                <i className="ri-shield-keyhole-line align-middle me-1"></i>
                لا تُضاف صلاحية إلى دور ولا تُزال منه ما لم تكن تملكها أنت،
                فسيرفض الخادم الحفظ. لا تملك:
                <span className="d-block mt-1">
                  {notHeld.map((name) => `«${permissionLabel(name)}»`).join("، ")}
                </span>
              </Alert>
            )}
            {/* The assign card lives on the Roles screen, and both the screen
                and the role picker on it need auth.roles.view. A role granting
                only «إسناد الأدوار للمستخدمين» gives its holder a power they
                have no way to reach. Legal, so a warning — the holder may get
                the view from another role. */}
            {selected.includes(ASSIGN_ROLES_PERMISSION) &&
              !selected.includes("auth.roles.view") && (
                <Alert variant="warning" className="py-2 px-3 mb-2">
                  <i className="ri-alert-line align-middle me-1"></i>
                  «إسناد الأدوار للمستخدمين» يحتاج إلى «عرض الأدوار» أيضاً:
                  شاشة الأدوار وقائمة الأدوار فيها تتطلبانها، وبدونها لن يصل
                  حامل هذا الدور إلى بطاقة الإسناد — إلا إن كان يملكها من دور
                  آخر.
                </Alert>
              )}
            <Row className="g-3">
              {PERMISSIONS_CATALOG.map((group) => {
                const groupNames = group.permissions.map((p) => p.name);
                const checkedCount = groupNames.filter((n) =>
                  selected.includes(n)
                ).length;
                const allChecked = checkedCount === groupNames.length;
                return (
                  <Col sm={12} md={6} key={group.key}>
                    <div className="border rounded h-100">
                      <div className="bg-light rounded-top border-bottom px-3 py-2">
                        <CheckRow
                          id={`group-${group.key}`}
                          checked={allChecked}
                          indeterminate={checkedCount > 0 && !allChecked}
                          disabled={isSystemRole}
                          onChange={() => toggleGroup(group)}
                        >
                          <span className="d-flex align-items-center flex-wrap gap-2">
                            <span className="fw-semibold">{group.module}</span>
                            {group.fieldLevel && (
                              <span className="badge bg-warning-transparent fs-11">
                                على مستوى الحقل
                              </span>
                            )}
                            <span className="text-muted fs-11 ms-auto">
                              {checkedCount}/{groupNames.length}
                            </span>
                          </span>
                        </CheckRow>
                        {group.note && (
                          <p className="text-muted fs-11 mb-0 mt-1">
                            {group.note}
                          </p>
                        )}
                      </div>
                      <div className="d-flex flex-column gap-2 p-3">
                        {group.permissions.map((perm) => (
                          <CheckRow
                            key={perm.name}
                            id={`perm-${perm.name}`}
                            checked={selected.includes(perm.name)}
                            disabled={isSystemRole}
                            onChange={() => togglePermission(perm.name)}
                          >
                            <span className="d-block">{perm.label}</span>
                            {/* Own line, isolated LTR: inline beside Arabic
                                text, the dotted name reorders under the bidi
                                algorithm and forces the row to wrap. */}
                            <code
                              dir="ltr"
                              className="d-block fs-11 text-muted text-end"
                            >
                              {perm.name}
                            </code>
                          </CheckRow>
                        ))}
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
            {fieldError("permissions") && (
              <div className="text-danger small mt-1">
                {fieldError("permissions")}
              </div>
            )}
          </div>

          {errors._general && (
            <p className="text-danger mb-0">{errors._general[0]}</p>
          )}

          <Row className="g-2 mt-1">
            <Col sm={12} md={6}>
              <button
                className="btn btn-secondary fw-md w-100"
                type="submit"
                disabled={saving || !name.trim() || isSystemRole}
              >
                {saving ? (
                  <Spinner animation="border" size="sm" />
                ) : isEdit ? (
                  "حفظ التعديلات"
                ) : (
                  "إنشاء الدور"
                )}
              </button>
            </Col>
            <Col sm={12} md={6}>
              <button
                type="button"
                className="btn btn-light fw-md w-100"
                onClick={handleCancel}
                disabled={saving}
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

export default RoleFormModal;
