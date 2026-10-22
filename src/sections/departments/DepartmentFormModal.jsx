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
import {
  buildDepartmentCreatePayload,
  buildDepartmentPatch,
  DEPARTMENT_LEVELS,
  DEPARTMENT_SECTORS,
  getDepartmentFormValues,
} from "./departmentPayload";
import { confirmDiscardChanges } from "../../utils";

const SECTOR_FALLBACK_LABELS = new Map([
  [1, "المكاتب الإدارية"],
  [2, "الأجسام الإدارية"],
]);

const departmentToOption = (d) => ({
  value: d.id,
  label: [d.code, d.name, d.level_label].filter(Boolean).join(" — "),
});
// `full_name`, NOT `name`. The employee resource has no `name` key — it was
// replaced by the read-only `full_name` accessor — so every option here
// degraded to the `موظف #id` fallback and this picker listed a column of id
// numbers instead of people. The same regression was found and fixed in
// UserFormModal and WarningFormModal; this file was missed.
//
// The label pairs the name with `employee_number` for the same reason those two
// do: الاسم الثلاثي is not unique in a company this size, and the staff number
// is what tells two people apart. The id is shown only when there is no staff
// number to show.
const employeeToOption = (e) => {
  const name = e.full_name || `موظف #${e.id}`;
  return {
    value: e.id,
    label: e.employee_number
      ? `${name} — ${e.employee_number}`
      : `${name} (#${e.id})`,
  };
};

// Create + edit in one modal: `department` null → create, otherwise edit.
const DepartmentFormModal = ({
  open,
  close,
  department,
  currentPage,
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
  const [sector, setSector] = useState("");
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
  const levelOptions = DEPARTMENT_LEVELS.map((v) => ({
    value: v,
    label: levelLabelByValue.get(v) || `المستوى ${v}`,
  }));

  // Sector labels are also taken from resolved API resources. The numeric
  // values are the documented write contract; the Arabic display text remains
  // server-owned whenever at least one matching row is available.
  const sectorLabelByValue = useMemo(() => {
    const map = new Map();
    parents.items.forEach((d) => {
      if (d.sector != null && d.sector_label) {
        map.set(d.sector, d.sector_label);
      }
    });
    if (department?.sector != null && department?.sector_label) {
      map.set(department.sector, department.sector_label);
    }
    return map;
  }, [parents.items, department]);
  const sectorOptions = DEPARTMENT_SECTORS.map((value) => ({
    value,
    label:
      sectorLabelByValue.get(value) ||
      SECTOR_FALLBACK_LABELS.get(value) ||
      `الجهة ${value}`,
  }));

  // All documented pages are loaded before this client-side narrowing. This
  // avoids offering structurally impossible parents without pretending the
  // API supports a level filter.
  const parentOptions = useMemo(
    () => {
      const selectedLevel = Number(level);
      if (!selectedLevel || selectedLevel === 1) return [];

      return parents.items
        .filter(
          (candidate) =>
            candidate.id !== department?.id &&
            Number(candidate.level) === selectedLevel - 1
        )
        .map(departmentToOption);
    },
    [parents.items, department, level]
  );

  const selectedParent = useMemo(
    () => parents.items.find((candidate) => candidate.id === Number(parentId)),
    [parents.items, parentId]
  );

  // ⚠️ The SELECT VALUE is resolved against every loaded unit, not against the
  // level-filtered `parentOptions`.
  //
  // Looking it up in the filtered list meant that whenever the stored parent
  // was not in it, `.find(...) || null` fell through to null and the control
  // rendered its placeholder — "بدون وحدة أصل (الجذر)" — stating that a unit
  // with a parent is a root. That happened on EVERY first render, because the
  // page walk is async and `parentOptions` is empty until it finishes, and
  // permanently for an imported row whose parent is not exactly one level up.
  //
  // The save was never wrong (parentId state is untouched, so buildDepartmentPatch
  // omits parent_id), but the form asserted a false fact about the hierarchy.
  const selectedParentOption = useMemo(() => {
    if (parentId === "" || parentId == null) return null;

    const withinLevel = parentOptions.find((o) => o.value === Number(parentId));
    if (withinLevel) return withinLevel;

    // Loaded, but outside the level this form would offer. Show it, and say so,
    // rather than silently dropping the unit's actual parent.
    if (selectedParent) {
      return {
        value: selectedParent.id,
        label: `${selectedParent.name || `وحدة #${selectedParent.id}`} (خارج المستوى المتوقع)`,
      };
    }

    // Not loaded yet. The id is the only truthful thing we can show.
    return { value: Number(parentId), label: `وحدة #${parentId}` };
  }, [parentId, parentOptions, selectedParent]);

  // The current parent stays selectable even when it falls outside the filter,
  // so opening and saving the form cannot quietly re-parent the unit.
  const parentSelectOptions = useMemo(() => {
    if (
      !selectedParentOption ||
      parentOptions.some((o) => o.value === selectedParentOption.value)
    ) {
      return parentOptions;
    }
    return [selectedParentOption, ...parentOptions];
  }, [parentOptions, selectedParentOption]);
  const inheritedSectorLabel =
    selectedParent?.sector_label || department?.sector_label || "";

  // The opening snapshot for the discard guard. This form keeps its eight
  // fields in eight separate useState hooks rather than one object, so the
  // comparison is written out per field instead of looped.
  const [initialValues, setInitialValues] = useState(null);

  useEffect(() => {
    if (open) {
      const values = getDepartmentFormValues(department);
      setName(values.name);
      setCode(values.code);
      setDescription(values.description);
      setIsActive(values.isActive);
      setLevel(values.level);
      setSector(values.sector);
      setParentId(values.parentId);
      setManagerId(values.managerId);
      setInitialValues(values);
      setErrors({});
    }
  }, [open, department]);

  const isDirty =
    initialValues !== null &&
    (name !== initialValues.name ||
      code !== initialValues.code ||
      description !== initialValues.description ||
      isActive !== initialValues.isActive ||
      level !== initialValues.level ||
      sector !== initialValues.sector ||
      parentId !== initialValues.parentId ||
      managerId !== initialValues.managerId);

  const handleCancel = async () => {
    if (!isDirty) {
      close();
      return;
    }
    if (await confirmDiscardChanges()) close();
  };

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

    const values = {
      name,
      code,
      description,
      isActive,
      level,
      sector,
      parentId,
      managerId,
    };
    const payload = isEdit
      ? buildDepartmentPatch(department, values)
      : buildDepartmentCreatePayload(values);

    try {
      if (isEdit) {
        // An unchanged edit has no fields to PATCH.
        if (Object.keys(payload).length === 0) {
          close();
          return;
        }
        await dispatch(updateDepartment(department.id, payload, currentPage));
      } else {
        await dispatch(createDepartment(payload, currentPage));
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
    <Modal
      show={open}
      onHide={handleCancel}
      keyboard={false}
      centered
      backdrop="static"
    >
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
                placeholder="مثال: FIN-CASH"
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
                  const nextLevel = opt ? opt.value : "";
                  if (
                    nextLevel === 1 ||
                    (selectedParent &&
                      Number(selectedParent.level) !== Number(nextLevel) - 1)
                  ) {
                    setParentId("");
                    clearFieldError("parent_id");
                  }
                  setLevel(nextLevel);
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
              <Form.Label htmlFor="department-sector">الجهة</Form.Label>
              {Number(level) === 2 ? (
                <Select
                  inputId="department-sector"
                  classNamePrefix="Select2"
                  options={sectorOptions}
                  value={
                    sectorOptions.find((o) => o.value === Number(sector)) ||
                    null
                  }
                  onChange={(opt) => {
                    setSector(opt ? opt.value : "");
                    clearFieldError("sector");
                  }}
                  isClearable
                  placeholder="بدون جهة محددة"
                  menuPosition="fixed"
                />
              ) : (
                <Form.Control
                  id="department-sector"
                  type="text"
                  value={inheritedSectorLabel}
                  placeholder="تُحدَّد تلقائيًا من الوحدة الأصل"
                  readOnly
                />
              )}
              {Number(level) !== 2 && (
                <div className="text-muted small mt-1">
                  الجهة موروثة للعرض فقط في هذا المستوى ولا تُرسل عند الحفظ.
                </div>
              )}
              {parents.incomplete && Number(level) === 2 && (
                <div className="text-warning small mt-1">
                  تعذّر تحميل كل تسميات الجهات؛ القيم الرقمية ما زالت متاحة.
                </div>
              )}
              {fieldError("sector")}
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
                    options={parentSelectOptions}
                    value={selectedParentOption}
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

export default DepartmentFormModal;
