import React, { useEffect, useState } from "react";
import { Col, Form, Row, Modal, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import {
  createEmployee,
  updateEmployee,
} from "../../redux/actions/employeesActions";

const STATUS_OPTIONS = [
  { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
  { value: "terminated", label: "منتهي الخدمة" },
];

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  department_id: "",
  job_title: "",
  hire_date: "",
  salary: "",
  status: "active",
};

// Employee file — full field set from §8 (create + edit in one modal).
const EmployeeFormModal = ({ open, close, employee, currentPage }) => {
  const dispatch = useDispatch();
  const { saving } = useSelector((state) => state.employees);
  const isEdit = Boolean(employee);

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(
        employee
          ? {
              name: employee.name || "",
              phone: employee.phone || "",
              email: employee.email || "",
              address: employee.address || "",
              department_id: employee.department_id ?? "",
              job_title: employee.job_title || "",
              hire_date: employee.hire_date || "",
              salary: employee.salary ?? "",
              status: employee.status || "active",
            }
          : emptyForm
      );
      setErrors({});
    }
  }, [open, employee]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  // Client validation mirroring the server rules so most 422s are caught
  // before the request.
  const validate = () => {
    const clientErrors = {};
    if (!form.name.trim()) clientErrors.name = ["اسم الموظف مطلوب."];
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email))
      clientErrors.email = ["يرجى إدخال بريد إلكتروني صالح."];
    if (form.phone && form.phone.length > 50)
      clientErrors.phone = ["رقم الهاتف طويل جداً (الحد الأقصى 50)."];
    if (form.salary !== "" && Number(form.salary) < 0)
      clientErrors.salary = ["يجب أن يكون الراتب صفراً أو أكثر."];
    return clientErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    // Optional fields are nullable server-side: send null instead of "".
    const payload = {
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      department_id:
        form.department_id === "" ? null : Number(form.department_id),
      job_title: form.job_title || null,
      hire_date: form.hire_date || null,
      salary: form.salary === "" ? null : Number(form.salary),
      status: form.status,
    };

    try {
      if (isEdit) {
        await dispatch(updateEmployee(employee.id, payload, currentPage));
      } else {
        await dispatch(createEmployee(payload, currentPage));
      }
      close();
    } catch (parsed) {
      // e.g. unknown department_id → "القسم المحدد غير موجود."
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
          {isEdit ? `تعديل بيانات الموظف: ${employee?.name}` : "إضافة موظف جديد"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
          <Row className="g-3">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="emp-name">الاسم الكامل *</Form.Label>
              <Form.Control
                id="emp-name"
                type="text"
                maxLength={255}
                placeholder="اسم الموظف"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                isInvalid={!!fieldError("name")}
                autoFocus
              />
              {fieldError("name") && (
                <div className="text-danger small mt-1">{fieldError("name")}</div>
              )}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="emp-job">المسمى الوظيفي</Form.Label>
              <Form.Control
                id="emp-job"
                type="text"
                maxLength={255}
                placeholder="مثال: مهندس برمجيات"
                value={form.job_title}
                onChange={(e) => setField("job_title", e.target.value)}
                isInvalid={!!fieldError("job_title")}
              />
              {fieldError("job_title") && (
                <div className="text-danger small mt-1">
                  {fieldError("job_title")}
                </div>
              )}
            </Col>

            <Col sm={12} md={6}>
              <Form.Label htmlFor="emp-phone">رقم الهاتف</Form.Label>
              <Form.Control
                id="emp-phone"
                type="tel"
                maxLength={50}
                placeholder="+9665xxxxxxxx"
                dir="ltr"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                isInvalid={!!fieldError("phone")}
              />
              {fieldError("phone") && (
                <div className="text-danger small mt-1">{fieldError("phone")}</div>
              )}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="emp-email">البريد الإلكتروني</Form.Label>
              <Form.Control
                id="emp-email"
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
              <Form.Label htmlFor="emp-address">العنوان</Form.Label>
              <Form.Control
                id="emp-address"
                as="textarea"
                maxLength={1000}
                style={{ height: "4rem", maxHeight: "6rem" }}
                placeholder="عنوان السكن"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                isInvalid={!!fieldError("address")}
              />
              {fieldError("address") && (
                <div className="text-danger small mt-1">
                  {fieldError("address")}
                </div>
              )}
            </Col>

            <Col sm={12} md={6}>
              <Form.Label htmlFor="emp-department">رقم القسم</Form.Label>
              <Form.Control
                id="emp-department"
                type="number"
                min={1}
                placeholder="معرّف القسم (ID)"
                value={form.department_id}
                onChange={(e) => setField("department_id", e.target.value)}
                isInvalid={!!fieldError("department_id")}
              />
              {fieldError("department_id") && (
                <div className="text-danger small mt-1">
                  {fieldError("department_id")}
                </div>
              )}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="emp-hire-date">تاريخ التعيين</Form.Label>
              <Form.Control
                id="emp-hire-date"
                type="date"
                value={form.hire_date}
                onChange={(e) => setField("hire_date", e.target.value)}
                isInvalid={!!fieldError("hire_date")}
              />
              {fieldError("hire_date") && (
                <div className="text-danger small mt-1">
                  {fieldError("hire_date")}
                </div>
              )}
            </Col>

            <Col sm={12} md={6}>
              <Form.Label htmlFor="emp-salary">الراتب</Form.Label>
              <Form.Control
                id="emp-salary"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                dir="ltr"
                value={form.salary}
                onChange={(e) => setField("salary", e.target.value)}
                isInvalid={!!fieldError("salary")}
              />
              {fieldError("salary") && (
                <div className="text-danger small mt-1">{fieldError("salary")}</div>
              )}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="emp-status">الحالة</Form.Label>
              <Select
                inputId="emp-status"
                options={STATUS_OPTIONS}
                classNamePrefix="Select2"
                isClearable={false}
                placeholder="اختر الحالة"
                value={STATUS_OPTIONS.find((o) => o.value === form.status)}
                onChange={(option) => setField("status", option.value)}
              />
              {fieldError("status") && (
                <div className="text-danger small mt-1">{fieldError("status")}</div>
              )}
            </Col>
          </Row>

          {errors._general && (
            <p className="text-danger mb-0">{errors._general[0]}</p>
          )}

          <Row className="g-2 mt-1">
            <Col sm={12} md={6}>
              <button
                className="btn btn-secondary fw-md w-100"
                type="submit"
                disabled={saving || !form.name.trim()}
              >
                {saving ? (
                  <Spinner animation="border" size="sm" />
                ) : isEdit ? (
                  "حفظ التعديلات"
                ) : (
                  "إضافة"
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

export default EmployeeFormModal;
