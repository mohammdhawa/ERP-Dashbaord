import React, { useState, useEffect } from "react";
import { Col, Form, Row, Modal, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { createRole } from "../../redux/actions/rolesActions";
import { AlertWithSwal } from "../../components/SwalAlerts";

const AddRoleModal = ({ open, close }) => {
  const [roleName, setRoleName] = useState("");
  const [roleLevel, setRoleLevel] = useState("");
  const { permissions } = useSelector((state) => state.permissions);
  const { loading } = useSelector((state) => state.roles);
  const [selectedPermsForAdd, setSelectedPermsForAdd] = useState([]);
  const [roleError, setRoleError] = useState("");
  const [roleLevelError, setRoleLevelError] = useState("");
  const [isAddDisabled, setIsAddDisabled] = useState(true);

  const dispatch = useDispatch();

  useEffect(() => {
    setIsAddDisabled(
      !roleName.trim() ||
        selectedPermsForAdd.length === 0 ||
        roleLevel === "" ||
        roleLevelError !== ""
    );
  }, [roleName, selectedPermsForAdd, roleLevel, roleLevelError]);

  const handlePermsChangeForAdd = (selectedOptions) => {
    setSelectedPermsForAdd(selectedOptions.map((option) => option.value));
  };

  const handleRoleLevelChange = (e) => {
    const value = e.target.value;
    setRoleLevel(value);

    // Clear previous error
    setRoleLevelError("");

    // Validate role level
    if (value !== "") {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        setRoleLevelError("مستوى الدور يجب أن يكون رقم بين 0 و 100");
      }
    }
  };

  const formattedPermissions = permissions.map((permission) => ({
    value: permission.id,
    label: permission.name,
  }));

  const handleCloseModal = () => {
    setTimeout(() => {
      setRoleError("");
      setRoleLevelError("");
      setRoleName("");
      setRoleLevel("");
      setSelectedPermsForAdd([]);
      close();
    }, 100);
  };

  const handleSubmitAddRole = (e) => {
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

    if (selectedPermsForAdd.length === 0) {
      AlertWithSwal(
        "error",
        "خطأ!",
        "يجب تحديد صلاحية واحدة على الأقل",
        "danger"
      );
      return;
    }

    dispatch(createRole(roleName, selectedPermsForAdd, numRoleLevel))
      .then(() => {
        handleCloseModal();
      })
      .catch((err) => {
        AlertWithSwal("error", "خطأ!", err, "danger");
      });
  };

  return (
    <Modal
      show={open}
      onHide={handleCloseModal}
      keyboard={false}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6" className="modal-title">
          إضافة دور
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form
          className="d-flex flex-column gap-2"
          onSubmit={handleSubmitAddRole}
        >
          <Row>
            <Col>
              <Form.Label htmlFor="role-name">اسم الدور</Form.Label>
              <Form.Control
                type="text"
                placeholder="ادخل اسم الدور"
                id="role-name"
                value={roleName}
                onChange={(e) => {
                  setRoleName(e.target.value);
                  if (roleError) setRoleError("");
                }}
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
                <div className="text-danger small mt-1">{roleLevelError}</div>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="role-permissions">الصلاحيات</Form.Label>
              <Select
                options={formattedPermissions}
                classNamePrefix="Select2"
                isMulti
                isSearchable
                onChange={handlePermsChangeForAdd}
                placeholder="اختر الصلاحيات"
                id="role-permissions"
              />
            </Col>
          </Row>
          <Row className="g-2 mt-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-primary fw-md w-100"
                type="submit"
                disabled={isAddDisabled || loading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : "إضافة"}
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

export default AddRoleModal;
