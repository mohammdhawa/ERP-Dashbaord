import React, { useEffect, useState } from "react";
import { Col, Form, Row, Modal, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { editRole } from "../../redux/actions/rolesActions";
import { AlertWithSwal } from "../../components/SwalAlerts";

const EditRoleModal = ({ open, close, role }) => {
  const dispatch = useDispatch();
  const { permissions } = useSelector((state) => state.permissions);
  const { loading } = useSelector((state) => state.roles);
  const [roleName, setRoleName] = useState(role?.name || "");
  const [roleLevel, setRoleLevel] = useState(role?.level || "");
  const [selectedPermsForEdit, setSelectedPermsForEdit] = useState([]);
  const [roleError, setRoleError] = useState("");
  const [roleLevelError, setRoleLevelError] = useState("");
  const [isChanged, setIsChanged] = useState(false);

  const formattedPermissions = permissions.map((permission) => ({
    value: permission.id,
    label: permission.name,
  }));

  useEffect(() => {
    if (role) {
      const initialPerms = role.permissions.map((perm) => ({
        value: perm.id,
        label: perm.name,
      }));

      setRoleName(role.name);
      setRoleLevel(role.level || "");
      setSelectedPermsForEdit(initialPerms);
      setIsChanged(false);
    }
  }, [role]);

  const handlePermsChangeForEdit = (selectedOptions) => {
    setSelectedPermsForEdit(selectedOptions);
    checkIfChanged(roleName, roleLevel, selectedOptions);
  };

  const handleRoleNameChange = (e) => {
    setRoleName(e.target.value);
    if (roleError) setRoleError("");
    checkIfChanged(e.target.value, roleLevel, selectedPermsForEdit);
  };

  const handleRoleLevelChange = (e) => {
    const value = e.target.value;
    setRoleLevel(value);

    setRoleLevelError("");

    if (value !== "") {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        setRoleLevelError("مستوى الدور يجب أن يكون رقم بين 0 و 100");
      }
    }

    checkIfChanged(roleName, value, selectedPermsForEdit);
  };

  const checkIfChanged = (newName, newLevel, newPerms) => {
    const originalPerms = role.permissions.map((perm) => perm.id).sort();
    const selectedPerms = newPerms.map((perm) => perm.value).sort();

    const hasChanged =
      newName !== role.name ||
      newLevel !== (role.level || "") ||
      JSON.stringify(originalPerms) !== JSON.stringify(selectedPerms);

    setIsChanged(hasChanged);
  };

  const handleCloseModal = () => {
    setTimeout(() => {
      setRoleError("");
      setRoleLevelError("");
      setRoleName(role?.name || "");
      setRoleLevel(role?.level || "");
      setSelectedPermsForEdit(
        role?.permissions.map((perm) => ({
          value: perm.id,
          label: perm.name,
        })) || []
      );
      setIsChanged(false);
      close();
    }, 100);
  };

  const handleSubmitEditRole = (e) => {
    e.preventDefault();
    setRoleError("");
    setRoleLevelError("");

    if (!roleName) {
      setRoleError("يجب إدخال اسم الدور");
      return;
    }

    if (roleLevel === "") {
      setRoleLevelError("يجب إدخال مستوى الدور");
      return;
    }

    const numRoleLevel = parseInt(roleLevel, 10);
    if (isNaN(numRoleLevel) || numRoleLevel < 0 || numRoleLevel > 100) {
      setRoleLevelError("مستوى الدور يجب أن يكون رقم بين 0 و 100");
      return;
    }

    const updatedrole = {
      name: roleName,
      level: numRoleLevel,
      permissions: selectedPermsForEdit.map((perm) => perm.value),
      is_editable: 1,
      is_deleteable: 1,
    };

    if (isChanged) {
      dispatch(editRole(role.id, updatedrole))
        .then(() => {
          handleCloseModal();
        })
        .catch((err) => {
          setRoleError(
            err?.response?.data?.errors?.name?.[0] ||
              "حدث خطأ، يرجى المحاولة مجدداً"
          );
        });
    } else {
      AlertWithSwal(
        "error",
        "خطأ!",
        "لم يتم اجراء اي تعديلات على الدور",
        "danger"
      );
    }
  };

  return (
    <Modal show={open} onHide={handleCloseModal} keyboard={false} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h6" className="modal-title">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{role?.id}#</span>
            <p className="m-0 fs-12 text-muted">تعديل الدور {role?.name}</p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form
          className="d-flex flex-column gap-2"
          onSubmit={handleSubmitEditRole}
        >
          <Row>
            <Col>
              <Form.Label htmlFor="role-id">رقم الدور</Form.Label>
              <Form.Control
                type="text"
                id="role-id"
                value={role?.id}
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="role-name">اسم الدور</Form.Label>
              <Form.Control
                type="text"
                placeholder="ادخل اسم الدور"
                id="role-name"
                value={roleName}
                onChange={handleRoleNameChange}
                className={roleError ? "is-invalid" : ""}
                required
              />
              {roleError && (
                <div className="text-danger small">{roleError}</div>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="role-level">مستوى الدور</Form.Label>
              <Form.Control
                type="number"
                placeholder="ادخل مستوى الدور"
                id="role-level"
                value={roleLevel}
                onChange={handleRoleLevelChange}
                className={roleLevelError ? "is-invalid" : ""}
                min="0"
                max="100"
                required
              />
              {roleLevelError && (
                <div className="text-danger mt-1 small">{roleLevelError}</div>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="role-perms">الصلاحيات</Form.Label>
              <Select
                options={formattedPermissions}
                classNamePrefix="Select2"
                isClearable={false}
                isMulti
                isSearchable
                value={selectedPermsForEdit}
                onChange={handlePermsChangeForEdit}
                placeholder="اختر الصلاحيات"
                required
                className="selectsecondary"
                id="role-perms"
              />
            </Col>
          </Row>
          <Row className="g-2 mt-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-success fw-md w-100"
                type="submit"
                disabled={!isChanged || loading || roleLevelError !== ""}
              >
                {loading ? <Spinner animation="border" size="sm" /> : "تعديل"}
              </button>
            </Col>
            <Col>
              <button
                type="button"
                className="btn btn-light fw-md w-100"
                onClick={handleCloseModal}
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

export default EditRoleModal;
