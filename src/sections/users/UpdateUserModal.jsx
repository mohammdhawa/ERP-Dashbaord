import React, { useEffect, useState } from "react";
import { Col, Form, Modal, Row } from "react-bootstrap";

import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import { NumericFormat } from "react-number-format";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import { fetchRoles } from "../../redux/actions/rolesActions";
import { fetchPermissions } from "../../redux/actions/permissionActions";
import { editUser } from "../../redux/actions/usersActions";
import { AlertWithSwal } from "../../components/SwalAlerts";
registerPlugin(FilePondPluginImagePreview, FilePondPluginImageExifOrientation);

const UpdateUserModal = ({ open, close, user }) => {
  const [userData, setUserData] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    role: "",
  });
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (user) {
      setUserData({
        id: user?.id,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role.id,
      });

      // Set the user's image if it exists
      if (user?.image?.url) {
        setFiles([
          {
            source: user.image.url,
            options: {
              type: "local",
            },
          },
        ]);
      } else {
        setFiles([]);
      }
    }
  }, [user]);

  const { roles } = useSelector((state) => state.roles);
  const { permissions } = useSelector((state) => state.permissions);
  const dispatch = useDispatch();

  useEffect(() => {
    if (open) {
      dispatch(fetchRoles());
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (open) {
      dispatch(fetchPermissions());
    }
  }, [open, dispatch]);

  const rolesOptions = roles.map((role) => ({
    value: role.id,
    label: role.name,
  }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const updatedUser = {
      name: userData.name.trim(),
      email: userData.email,
      phone: userData.phone,
      role_id: userData.role?.value || userData.role,
    };

    dispatch(editUser(userData.id, updatedUser))
      .then(() => {
        handleCloseModal();
      })
      .catch((err) => {
        AlertWithSwal("error", "خطأ!", err, "danger");
      });
  };

  const handleCloseModal = () => {
    close();
  };

  return (
    <Modal
      show={open}
      onHide={handleCloseModal}
      keyboard={false}
      centered
      backdrop="static"
      size="lg"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{user?.id}#</span>
            <p className="m-0 fs-12 text-muted">
              تعديل معلومات المستخدم {user?.name}
            </p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-2">
          <Row className="mb-3">
            <FilePond
              className="filepond single-fileupload"
              labelIdle="صورة الملف الشخصي"
              stylePanelLayout="compact circle"
              styleLoadIndicatorPosition="center bottom"
              styleButtonRemoveItemPosition="center bottom"
              files={files}
              onupdatefiles={setFiles}
              server={{
                load: (source, load, error, progress, abort, headers) => {
                  const request = new Request(source);
                  fetch(request)
                    .then((response) => {
                      response.blob().then(load);
                    })
                    .catch(error);
                  return {
                    abort: () => {
                      abort();
                    },
                  };
                },
              }}
            />
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="user-name">الاسم الكامل</Form.Label>
              <Form.Control
                type="text"
                placeholder="ادخل الاسم الكامل"
                id="user-name"
                name="name"
                autoFocus
                value={userData.name}
                onChange={handleInputChange}
                required
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="user-email">البريد الالكتروني</Form.Label>
              <Form.Control
                type="email"
                placeholder="name@example.com"
                id="user-email"
                name="email"
                value={userData.email}
                onChange={handleInputChange}
                required
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="user-phone">رقم الهاتف</Form.Label>
              <NumericFormat
                className="form-control"
                id="phone"
                placeholder="ادخل رقم الهاتف"
                name="phone"
                allowNegative={false}
                value={userData.phone}
                onChange={handleInputChange}
                required
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="user-role">دور المستخدم</Form.Label>
              <Select
                options={rolesOptions}
                classNamePrefix="Select2"
                isSearchable
                id="user-role"
                name="selectedRole"
                placeholder="اختر الدور"
                required
                value={rolesOptions.find(
                  (option) => option.value === userData.role
                )}
                onChange={(selectedOption) =>
                  setUserData((prev) => ({ ...prev, role: selectedOption }))
                }
              />
            </Col>
          </Row>
          <Row className="g-2 mt-2">
            <Col sm={12} md={6}>
              <button className="btn btn-success fw-md w-100" type="submit">
                تعديل
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

export default UpdateUserModal;
