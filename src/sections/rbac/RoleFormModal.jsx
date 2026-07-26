import React, { useEffect, useState } from "react";
import { Col, Form, Row, Modal, Spinner, Alert } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { createRole, updateRole } from "../../redux/actions/rolesActions";
import { PERMISSIONS_CATALOG } from "../../data/permissionsCatalog";

// Role create/edit with a checkbox matrix over the Phase-1 permission
// catalogue. On UPDATE the `permissions` array is a full SYNC: the server
// replaces the role's set with exactly what we send, and an empty array wipes
// every permission — hence the explicit warning before submitting empty.
const RoleFormModal = ({ open, close, role }) => {
  const dispatch = useDispatch();
  const { saving } = useSelector((state) => state.roles);
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

  useEffect(() => {
    if (open) {
      setName(role?.name || "");
      setLabel(role?.label || "");
      setDescription(role?.description || "");
      setSelected(role?.permissions || []);
      setPermsDirty(false);
      setErrors({});
    }
  }, [open, role]);

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
        await dispatch(updateRole(role.id, payload));
      } else {
        await dispatch(createRole(payload));
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
      onHide={close}
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
            <Row className="g-3">
              {PERMISSIONS_CATALOG.map((group) => {
                const groupNames = group.permissions.map((p) => p.name);
                const allChecked = groupNames.every((n) =>
                  selected.includes(n)
                );
                return (
                  <Col sm={12} md={6} key={group.key}>
                    <div className="border rounded p-3 h-100">
                      <Form.Check
                        type="checkbox"
                        id={`group-${group.key}`}
                        className="fw-semibold mb-2"
                        label={group.module}
                        checked={allChecked}
                        disabled={isSystemRole}
                        onChange={() => toggleGroup(group)}
                      />
                      <div className="d-flex flex-column gap-1 ps-3">
                        {group.permissions.map((perm) => (
                          <Form.Check
                            key={perm.name}
                            type="checkbox"
                            id={`perm-${perm.name}`}
                            label={
                              <span>
                                {perm.label}{" "}
                                <code className="fs-11 text-muted">
                                  {perm.name}
                                </code>
                              </span>
                            }
                            checked={selected.includes(perm.name)}
                            disabled={isSystemRole}
                            onChange={() => togglePermission(perm.name)}
                          />
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

export default RoleFormModal;
