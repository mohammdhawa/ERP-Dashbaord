import React, { useEffect, useState } from "react";
import { Col, Form, InputGroup, Modal, Row, Spinner } from "react-bootstrap";
import { NumericFormat } from "react-number-format";
import { useDispatch, useSelector } from "react-redux";
import { generatePassword } from "../../utils";
import Select from "react-select";
import { countryCodeOptions } from "../../data/General";
import { fetchRoles } from "../../redux/actions/rolesActions";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import "filepond/dist/filepond.css";
import { fetchPermissions } from "../../redux/actions/permissionActions";
import { createUser } from "../../redux/actions/usersActions";
import { ProtectedElement } from "../../pages";
import { AlertWithSwal } from "../../components/SwalAlerts";
registerPlugin(FilePondPluginImagePreview, FilePondPluginImageExifOrientation);

const AddUserModal = ({ open, close, excludeRoles = [] }) => {
  const { loading } = useSelector((state) => state.users);
  const { profile } = useSelector((state) => state.auth);

  const dispatch = useDispatch();
  const [selectedCountry, setSelectedCountry] = useState(
    countryCodeOptions[207]
  );
  const { roles } = useSelector((state) => state.roles);
  const roleLoading = useSelector((state) => state.roles.loading);
  const { permissions } = useSelector((state) => state.permissions);
  const [isVerified, setIsVerified] = useState(false);
  const [userData, setUserData] = useState({
    fname: "",
    mname: "",
    lname: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [passwordInputFocus, setPasswordInputFocus] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [customRole, setCustomRole] = useState(false);
  const [customRoleData, setCustomRoleData] = useState({
    name: "",
    level: "",
    permissions: [],
  });
  const [errors, setErrors] = useState({});
  const formattedPermissions = permissions.map((permission) => ({
    value: permission.id,
    label: permission.name,
  }));
  const rolesOptions = roles
    .filter((role) => !excludeRoles.includes(role.name))
    .map((role) => ({
      value: role.id,
      label: role.name,
    }));

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleCustomRoleLevelChange = (e) => {
    const value = e.target.value;
    setCustomRoleData({
      ...customRoleData,
      level: value,
    });

    setErrors((prev) => ({ ...prev, customRoleLevel: "" }));
    if (value !== "") {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        setErrors((prev) => ({
          ...prev,
          customRoleLevel: "مستوى الدور يجب أن يكون رقم بين 0 و 100",
        }));
      }
    }
  };

  const handleGeneratePassword = () => {
    let generatedPassword = generatePassword();
    setUserData({
      ...userData,
      password: generatedPassword,
      confirmPassword: generatedPassword,
    });
    setErrors({
      ...errors,
      password: "",
      confirmPassword: "",
    });
  };

  const handleCloseModal = () => {
    setUserData({
      fname: "",
      mname: "",
      lname: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    });
    setErrors("");
    setSelectedCountry(countryCodeOptions[207]);
    setPasswordInputFocus(false);
    setCustomRole(false);
    setCustomRoleData({
      name: "",
      level: "",
      permissions: [],
    });
    close();
  };

  const handleSelectChange = (selectedOption) => {
    if (selectedOption) {
      setSelectedCountry(selectedOption);
    }
  };

  const isMinLength = userData.password.length >= 8;
  const isMaxLength = userData.password.length <= 16;
  const hasUpperCase = /[A-Z]/.test(userData.password);
  const hasLowerCase = /[a-z]/.test(userData.password);
  const hasNumber = /\d/.test(userData.password);
  const hasSymbol = userData.password.replace(/[A-Za-z0-9]/g, "").length > 0;

  const isPasswordValid =
    isMinLength &&
    isMaxLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSymbol;

  const validateForm = () => {
    let newErrors = {};
    if (!userData.fname.trim()) newErrors.fname = "الاسم الأول مطلوب";
    if (!userData.lname.trim()) newErrors.lname = "الاسم الأخير مطلوب";
    if (!userData.email.trim()) newErrors.email = "البريد الالكتروني مطلوب";
    if (!userData.phone.trim()) newErrors.phone = "رقم الهاتف مطلوب";
    if (!userData.password.trim()) newErrors.password = "كلمة المرور مطلوبة";
    if (!userData.confirmPassword)
      newErrors.confirmPassword = "تأكيد كلمة المرور مطلوب";
    if (
      userData.confirmPassword &&
      userData.confirmPassword !== userData.password
    ) {
      newErrors.confirmPassword = "كلمات المرور غير متطابقة";
    }
    if (customRole) {
      if (!customRoleData.name) {
        newErrors.customRoleName = "اسم الدور المخصص مطلوب";
      }
      if (customRoleData.level === "") {
        newErrors.customRoleLevel = "مستوى الدور المخصص مطلوب";
      } else {
        const numLevel = parseInt(customRoleData.level, 10);
        if (isNaN(numLevel) || numLevel < 0 || numLevel > 100) {
          newErrors.customRoleLevel = "مستوى الدور يجب أن يكون رقم بين 0 و 100";
        }
      }
      if (
        !customRoleData.permissions ||
        customRoleData.permissions.length === 0
      ) {
        newErrors.customRolePerms = "صلاحيات الدور المخصص مطلوبة";
      }
    }
    if (!selectedRole && !customRole) {
      newErrors.selectedRole = "دور المستخدم مطلوب";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handlePermsChangeForAdd = (selectedOptions) => {
    setCustomRoleData({
      ...customRoleData,
      permissions: selectedOptions.map((option) => option.value),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const user = {
      name: `${userData.fname} ${userData.lname}`,
      email: `${userData.email}`,
      phone: `00${selectedCountry.value.slice(1)} ${userData.phone}`,
      password: `${userData.password}`,
      role_id: selectedRole,
      image: "",
      is_verified: isVerified ? 1 : 0,
    };

    const roleData = customRole
      ? {
          ...customRoleData,
          level: parseInt(customRoleData.level, 10),
        }
      : customRoleData;

    dispatch(createUser(user, roleData))
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
      size="lg"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6" className="modal-title">
          إضافة مستخدم جديد
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
            />
          </Row>
          <Row className="g-2">
            <Col xs={12} md={6}>
              <Form.Label htmlFor="user-fname">
                الاسم الأول <span className="text-danger ml-1">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="ادخل اسم الأول"
                id="user-fname"
                name="fname"
                autoFocus
                className={errors.fname ? "is-invalid" : ""}
                value={userData.fname}
                onChange={handleInputChange}
                required
              />

              {errors.fname && (
                <Form.Control.Feedback type="invalid">
                  {errors.fname}
                </Form.Control.Feedback>
              )}
            </Col>
            <Col xs={12} md={6}>
              <Form.Label htmlFor="user-lname">
                الاسم الأخير <span className="text-danger ml-1">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="ادخل لقب الأخير"
                id="user-lname"
                name="lname"
                value={userData.lname}
                className={errors.lname ? "is-invalid" : ""}
                onChange={handleInputChange}
                required
              />
              {errors.lname && (
                <Form.Control.Feedback type="invalid">
                  {errors.lname}
                </Form.Control.Feedback>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="user-email">
                البريد الالكتروني <span className="text-danger ml-1">*</span>
              </Form.Label>
              <Form.Control
                type="email"
                placeholder="name@example.com"
                id="user-email"
                name="email"
                value={userData.email}
                className={errors.email ? "is-invalid" : ""}
                onChange={handleInputChange}
                required
              />
              {errors.email && (
                <Form.Control.Feedback type="invalid">
                  {errors.email}
                </Form.Control.Feedback>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <div className="form-check ">
                <input
                  className="form-check-input form-checked-outline form-checked-success"
                  type="checkbox"
                  value=""
                  id="successoutlineChecked"
                  checked={isVerified}
                  onChange={(e) => {
                    setIsVerified(e.target.checked);
                  }}
                />
                <label
                  className="form-check-label"
                  htmlFor="successoutlineChecked"
                >
                  تأكيد البريد الالكتروني
                </label>
              </div>
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="user-phone">
                رقم الهاتف <span className="text-danger ml-1">*</span>
              </Form.Label>
              <Row className="columns-10 g-2">
                <Col>
                  <Select
                    options={countryCodeOptions}
                    classNamePrefix="Select2"
                    isSearchable
                    onChange={handleSelectChange}
                    id="country-codes"
                    name="countryCode"
                    value={selectedCountry}
                    required
                  />
                </Col>
                <Col md={9}>
                  <NumericFormat
                    className={`form-control ${
                      errors.phone ? "is-invalid" : ""
                    }`}
                    id="phone"
                    placeholder="ادخل رقم الهاتف"
                    name="phone"
                    allowNegative={false}
                    value={userData.phone}
                    onChange={handleInputChange}
                    required
                    dir="ltr"
                    style={{ unicodeBidi: "isolate" }}
                  />
                  {errors.phone && (
                    <Form.Control.Feedback type="invalid">
                      {errors.phone}
                    </Form.Control.Feedback>
                  )}
                </Col>
              </Row>
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="user-password">
                كلمة المرور <span className="text-danger ml-1">*</span>
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="كلمة المرور"
                  name="password"
                  id="user-password"
                  value={userData.password}
                  onChange={handleInputChange}
                  maxLength={16}
                  onFocus={() => {
                    setPasswordInputFocus(true);
                  }}
                  className={`form-control ${
                    errors.password ? "is-invalid" : ""
                  }`}
                  required
                />

                <button
                  onClick={handleGeneratePassword}
                  className="btn btn-outline-success z-0"
                  type="button"
                >
                  <i className="ri-lock-password-line align-middle me-2" />
                  توليد كلمة مرور
                </button>
                {errors.password && (
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                )}
              </InputGroup>

              {!isPasswordValid && passwordInputFocus && (
                <div className="row my-2">
                  <Col className="d-flex flex-column gap-2">
                    <small
                      className={`text-${
                        isMinLength && isMaxLength ? "success" : "danger"
                      }`}
                    >
                      • من 8 إلى 16 حرفًا
                    </small>
                    <small
                      className={`text-${hasUpperCase ? "success" : "danger"}`}
                    >
                      • حرف واحد كبير على الأقل
                    </small>
                    <small
                      className={`text-${hasLowerCase ? "success" : "danger"}`}
                    >
                      • حرف واحد صغير على الأقل
                    </small>
                  </Col>
                  <Col className="d-flex flex-column gap-2">
                    <small
                      className={`text-${hasNumber ? "success" : "danger"}`}
                    >
                      • رقم واحد على الأقل
                    </small>
                    <small
                      className={`text-${hasSymbol ? "success" : "danger"}`}
                    >
                      • رمز واحد على الأقل
                    </small>
                  </Col>
                </div>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="user-confirmPassword">
                تأكيد كلمة المرور <span className="text-danger ml-1">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="ادخل تأكيد كلمة المرور"
                id="user-confirmPassword"
                value={userData.confirmPassword}
                onChange={handleInputChange}
                name="confirmPassword"
                className={`form-control ${
                  errors.confirmPassword ? "is-invalid" : ""
                }`}
                required
              />
              {errors.confirmPassword && (
                <Form.Control.Feedback type="invalid">
                  {errors.confirmPassword}
                </Form.Control.Feedback>
              )}
            </Col>
          </Row>
          {!customRole && (
            <Row>
              <Col>
                <Form.Label htmlFor="user-role">
                  تعيين الدور <span className="text-danger ml-1">*</span>
                </Form.Label>
                <Select
                  options={rolesOptions}
                  classNamePrefix="Select2"
                  isSearchable
                  onChange={(selectedOption) => {
                    setSelectedRole(selectedOption.value);
                    setErrors({ ...errors, selectedRole: "" });
                  }}
                  id="user-role"
                  name="selectedRole"
                  placeholder="اختر الدور"
                  aria-invalid={errors.selectedRole}
                  className={`${errors.selectedRole ? "is-invalid" : ""}`}
                  required
                />
                {errors.selectedRole && (
                  <Form.Control.Feedback type="invalid">
                    {errors.selectedRole}
                  </Form.Control.Feedback>
                )}
              </Col>
            </Row>
          )}
          {profile?.user?.role_id === 2 && (
            <ProtectedElement
              element={
                <>
                  <Row>
                    <Col>
                      <div className="form-check form-switch mb-2">
                        <label
                          className="form-check-label"
                          htmlFor="switch-primary"
                        >
                          دور مخصص
                        </label>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="switch-primary"
                          checked={customRole}
                          onChange={(e) => {
                            setCustomRole(e.target.checked);
                            setCustomRoleData({
                              name: "",
                              level: "",
                              permissions: [],
                            });
                          }}
                        />
                      </div>
                    </Col>
                  </Row>
                  {customRole && profile?.user?.role_id === 2 && (
                    <>
                      <Row>
                        <Col>
                          <Form.Label htmlFor="custom-role-name">
                            اسم الدور{" "}
                            <span className="text-danger ml-1">*</span>
                          </Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="ادخل اسم الدور المخصص"
                            id="custom-role-name"
                            name="customRoleName"
                            value={customRoleData.name}
                            onChange={(e) => {
                              setCustomRoleData({
                                ...customRoleData,
                                name: e.target.value,
                              });
                            }}
                            required
                            className={`${
                              errors.customRoleName ? "is-invalid" : ""
                            }`}
                          />
                          {errors.customRoleName && (
                            <Form.Control.Feedback type="invalid">
                              {errors.customRoleName}
                            </Form.Control.Feedback>
                          )}
                        </Col>
                      </Row>
                      <Row>
                        <Col>
                          <Form.Label htmlFor="custom-role-level">
                            مستوى الدور{" "}
                            <span className="text-danger ml-1">*</span>
                          </Form.Label>
                          <Form.Control
                            type="number"
                            placeholder="ادخل مستوى الدور المخصص"
                            id="custom-role-level"
                            name="customRoleLevel"
                            value={customRoleData.level}
                            onChange={handleCustomRoleLevelChange}
                            min="0"
                            max="100"
                            required
                            className={`${
                              errors.customRoleLevel ? "is-invalid" : ""
                            }`}
                          />
                          {errors.customRoleLevel && (
                            <Form.Control.Feedback type="invalid">
                              {errors.customRoleLevel}
                            </Form.Control.Feedback>
                          )}
                        </Col>
                      </Row>
                      <Row>
                        <Col>
                          <Form.Label htmlFor="custom-role-perms">
                            صلاحيات الدور{" "}
                            <span className="text-danger ml-1">*</span>
                          </Form.Label>
                          <Select
                            options={formattedPermissions}
                            classNamePrefix="Select2"
                            isMulti
                            isSearchable
                            onChange={handlePermsChangeForAdd}
                            placeholder="اختر الصلاحيات"
                            id="custom-role-perms"
                            name="customRolePerms"
                            className={`${
                              errors.customRolePerms ? "is-invalid" : ""
                            }`}
                            required
                          />
                          {errors.customRolePerms && (
                            <Form.Control.Feedback type="invalid">
                              {errors.customRolePerms}
                            </Form.Control.Feedback>
                          )}
                        </Col>
                      </Row>
                    </>
                  )}
                </>
              }
              requiredPermissions={["create_role"]}
            />
          )}
          <Row className="g-2 mt-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-primary fw-md w-100"
                type="submit"
                disabled={loading || roleLoading}
              >
                {loading || roleLoading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "إضافة"
                )}
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

export default AddUserModal;
