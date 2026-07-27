import React, { useEffect, useMemo, useState } from "react";
import { Col, Form, Row, Modal, Spinner } from "react-bootstrap";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import {
  createDepartment,
  updateDepartment,
} from "../../redux/actions/departmentsActions";
import { hasPermission } from "../../data/permissionsCatalog";
import { useResourceOptions } from "./useResourceOptions";

// Server-provided level range (defined tiers 1–3). We keep the tier NUMBERS
// here (the API constrains them) but resolve their Arabic labels from live
// server data — never a hardcoded level→label map.
const LEVELS = [1, 2, 3];

const departmentToOption = (d) => ({
  value: d.id,
  label: d.level_label ? `${d.name} — ${d.level_label}` : d.name,
});
const employeeToOption = (e) => ({
  value: e.id,
  label: e.name || `موظف #${e.id}`,
});

// Create + edit in one modal: `department` null → create, otherwise edit.
const DepartmentFormModal = ({
  open,
  close,
  department,
  currentPage,
  itemsPerPage,
}) => {
  const dispatch = useDispatch();
  const { saving } = useSelector((state) => state.departments);
  const { permissions } = useSelector((state) => state.auth);
  const isEdit = Boolean(department);

  const canReadDepartments = hasPermission(permissions, "departments.view");
  const canReadEmployees = hasPermission(permissions, "hr.employees.view");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [level, setLevel] = useState("");
  const [parentId, setParentId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [errors, setErrors] = useState({});

  // Lookup lists load only while the modal is open and only when the user owns
  // the endpoint's view permission (documented list endpoints only).
  const parents = useResourceOptions(
    "/departments",
    departmentToOption,
    open && canReadDepartments
  );
  const employees = useResourceOptions(
    "/hr/employees",
    employeeToOption,
    open && canReadEmployees
  );

  // Level labels come from real server rows; tiers absent from the data fall
  // back to a neutral, number-based label (no invented tier names).
  const levelLabelByValue = useMemo(() => {
    const map = new Map();
    parents.items.forEach((d) => {
      if (d.level != null && d.level_label) map.set(d.level, d.level_label);
    });
    return map;
  }, [parents.items]);
  const levelOptions = LEVELS.map((v) => ({
    value: v,
    label: levelLabelByValue.get(v) || `المستوى ${v}`,
  }));

  // A unit cannot be its own parent — exclude self from the picker (the server
  // remains the source of truth for the full hierarchy rules).
  const parentOptions = useMemo(
    () => parents.options.filter((o) => o.value !== department?.id),
    [parents.options, department]
  );

  useEffect(() => {
    if (open) {
      setName(department?.name || "");
      setCode(department?.code || "");
      setDescription(department?.description || "");
      setIsActive(department?.is_active ?? true);
      setLevel(department?.level ?? "");
      setParentId(department?.parent_id ?? "");
      setManagerId(department?.manager_id ?? "");
      setErrors({});
    }
  }, [open, department]);

  const clearFieldError = (field) =>
    setErrors((prev) => ({ ...prev, [field]: null }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Light client checks only; hierarchy truth stays on the server.
    const localErrors = {};
    if (!name.trim()) localErrors.name = ["اسم الوحدة التنظيمية مطلوب."];
    if (!isEdit && level === "") localErrors.level = ["المستوى مطلوب."];
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }

    const payload = {
      name: name.trim(),
      // nullable fields: never send "" where the API expects null.
      code: code.trim() === "" ? null : code.trim(),
      description: description.trim() === "" ? null : description.trim(),
      is_active: isActive,
      parent_id: parentId === "" || parentId == null ? null : Number(parentId),
      manager_id:
        managerId === "" || managerId == null ? null : Number(managerId),
    };
    // `level` is required on create; on update send it only when set.
    if (level !== "" && level != null) payload.level = Number(level);

    try {
      if (isEdit) {
        await dispatch(
          updateDepartment(department.id, payload, currentPage, itemsPerPage)
        );
      } else {
        await dispatch(createDepartment(payload, currentPage, itemsPerPage));
      }
      close();
    } catch (parsed) {
      // 422: map the Laravel error bag onto the fields; other errors show the
      // server's Arabic message under the form.
      setErrors(parsed.errors || { _general: [parsed.message] });
    }
  };

  const fieldError = (field) =>
    errors[field] ? (
      <div className="text-danger small mt-1">{errors[field][0]}</div>
    ) : null;

  return (
    <Modal show={open} onHide={close} keyboard={false} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          {isEdit ? "تعديل الوحدة التنظيمية" : "إضافة وحدة تنظيمية"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
          <Row>
            <Col sm={12}>
              <Form.Label htmlFor="department-name">اسم الوحدة</Form.Label>
              <Form.Control
                id="department-name"
                type="text"
                placeholder="ادخل اسم الوحدة التنظيمية"
                value={name}
                maxLength={255}
                onChange={(e) => {
                  setName(e.target.value);
                  clearFieldError("name");
                }}
                isInvalid={!!errors.name}
                autoFocus
              />
              {fieldError("name")}
            </Col>
          </Row>

          <Row className="g-3">
            <Col sm={6}>
              <Form.Label htmlFor="department-code">
                الرمز <span className="text-muted">(اختياري)</span>
              </Form.Label>
              <Form.Control
                id="department-code"
                type="text"
                placeholder="مثال: SW"
                value={code}
                maxLength={50}
                onChange={(e) => {
                  setCode(e.target.value);
                  clearFieldError("code");
                }}
                isInvalid={!!errors.code}
              />
              {fieldError("code")}
            </Col>
            <Col sm={6}>
              <Form.Label htmlFor="department-level">المستوى</Form.Label>
              <Select
                inputId="department-level"
                classNamePrefix="Select2"
                options={levelOptions}
                value={levelOptions.find((o) => o.value === Number(level)) || null}
                onChange={(opt) => {
                  setLevel(opt ? opt.value : "");
                  clearFieldError("level");
                }}
                placeholder="اختر المستوى"
                isDisabled={parents.loading}
                menuPosition="fixed"
              />
              {fieldError("level")}
            </Col>
          </Row>

          <Row>
            <Col sm={12}>
              <Form.Label htmlFor="department-parent">
                الوحدة الأصل <span className="text-muted">(اختياري)</span>
              </Form.Label>
              {canReadDepartments && !parents.error ? (
                <>
                  <Select
                    inputId="department-parent"
                    classNamePrefix="Select2"
                    options={parentOptions}
                    value={
                      parentOptions.find((o) => o.value === Number(parentId)) ||
                      null
                    }
                    onChange={(opt) => {
                      setParentId(opt ? opt.value : "");
                      clearFieldError("parent_id");
                    }}
                    isClearable
                    isLoading={parents.loading}
                    placeholder="بدون وحدة أصل (الجذر)"
                    noOptionsMessage={() => "لا توجد وحدات"}
                    menuPosition="fixed"
                  />
                  {parents.incomplete && (
                    <div className="text-warning small mt-1">
                      تعذّر تحميل كل الوحدات، القائمة غير مكتملة.
                    </div>
                  )}
                </>
              ) : (
                // Truthful fallback: list unreadable → accept a raw parent id.
                <>
                  <Form.Control
                    id="department-parent"
                    type="number"
                    min={1}
                    placeholder="معرّف الوحدة الأصل (ID)"
                    value={parentId}
                    onChange={(e) => {
                      setParentId(e.target.value);
                      clearFieldError("parent_id");
                    }}
                    isInvalid={!!errors.parent_id}
                  />
                  <div className="text-muted small mt-1">
                    تعذّر تحميل قائمة الوحدات، أدخل المعرّف يدويًا.
                  </div>
                </>
              )}
              {fieldError("parent_id")}
            </Col>
          </Row>

          <Row>
            <Col sm={12}>
              <Form.Label htmlFor="department-manager">
                المدير <span className="text-muted">(اختياري)</span>
              </Form.Label>
              {canReadEmployees && !employees.error ? (
                <>
                  <Select
                    inputId="department-manager"
                    classNamePrefix="Select2"
                    options={employees.options}
                    value={
                      employees.options.find(
                        (o) => o.value === Number(managerId)
                      ) || null
                    }
                    onChange={(opt) => {
                      setManagerId(opt ? opt.value : "");
                      clearFieldError("manager_id");
                    }}
                    isClearable
                    isLoading={employees.loading}
                    placeholder="بدون مدير"
                    noOptionsMessage={() => "لا يوجد موظفون"}
                    menuPosition="fixed"
                  />
                  {employees.incomplete && (
                    <div className="text-warning small mt-1">
                      تعذّر تحميل كل الموظفين، القائمة غير مكتملة.
                    </div>
                  )}
                </>
              ) : (
                // Truthful fallback: no hr.employees.view (or load failed).
                <>
                  <Form.Control
                    id="department-manager"
                    type="number"
                    min={1}
                    placeholder="معرّف الموظف المدير (ID)"
                    value={managerId}
                    onChange={(e) => {
                      setManagerId(e.target.value);
                      clearFieldError("manager_id");
                    }}
                    isInvalid={!!errors.manager_id}
                  />
                  <div className="text-muted small mt-1">
                    تعذّر تحميل قائمة الموظفين، أدخل المعرّف يدويًا.
                  </div>
                </>
              )}
              {fieldError("manager_id")}
            </Col>
          </Row>

          <Row>
            <Col sm={12}>
              <Form.Label htmlFor="department-description">
                الوصف <span className="text-muted">(اختياري)</span>
              </Form.Label>
              <Form.Control
                id="department-description"
                as="textarea"
                rows={3}
                placeholder="وصف مختصر للوحدة التنظيمية"
                value={description}
                maxLength={1000}
                onChange={(e) => {
                  setDescription(e.target.value);
                  clearFieldError("description");
                }}
                isInvalid={!!errors.description}
              />
              {fieldError("description")}
            </Col>
          </Row>

          <Row>
            <Col sm={12}>
              <Form.Check
                type="switch"
                id="department-active"
                label="مُفعّلة"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {fieldError("is_active")}
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
                disabled={saving}
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

export default DepartmentFormModal;
