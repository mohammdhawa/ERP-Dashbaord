import React, { useEffect, useMemo, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { confirmDiscardChanges } from "../../utils";
import {
  createJobTitle,
  updateJobTitle,
} from "../../redux/actions/jobTitlesActions";
import { ACTIVITY_TYPE_OPTIONS, GRADE_OPTIONS } from "../../data/hrEnums";

// A job title carries NO department_id — this is one shared, company-wide
// catalogue, so there is no unit field here to add.

const emptyForm = {
  name: "",
  default_organizational_grade: "",
  default_activity_type: "",
  is_described: false,
  description: "",
  is_active: true,
};

const JobTitleFormModal = ({
  open,
  close,
  jobTitle,
  page,
  itemsPerPage,
  filters,
}) => {
  const dispatch = useDispatch();
  const { saving } = useSelector((state) => state.jobTitles);
  const isEdit = Boolean(jobTitle);

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  // The values the modal opened with, so "has anything been typed?" can be
  // answered without a dirty flag on every field — same shape as every other
  // form modal in the app.
  const [initialForm, setInitialForm] = useState(emptyForm);

  useEffect(() => {
    if (open) {
      const values = jobTitle
        ? {
            name: jobTitle.name || "",
            default_organizational_grade:
              jobTitle.default_organizational_grade ?? "",
            default_activity_type: jobTitle.default_activity_type ?? "",
            is_described: Boolean(jobTitle.is_described),
            description: jobTitle.description || "",
            is_active: Boolean(jobTitle.is_active),
          }
        : emptyForm;
      setForm(values);
      setInitialForm(values);
      setErrors({});
    }
  }, [open, jobTitle]);

  const isDirty = useMemo(
    () => Object.keys(form).some((key) => form[key] !== initialForm[key]),
    [form, initialForm]
  );

  // The header's × and "إلغاء" both run the guard. This modal already refuses
  // Escape and backdrop clicks (backdrop="static", keyboard={false}) to protect
  // the form — and then let these two throw it away with no warning, which is
  // the same loss by a different button. An untouched form still closes
  // instantly; only real edits are confirmed. Every other active data-entry
  // modal here does this; this one was the last that did not.
  const handleCancel = async () => {
    if (!isDirty) {
      close();
      return;
    }
    if (await confirmDiscardChanges()) close();
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!form.name.trim()) {
      setErrors({ name: ["اسم المسمى الوظيفي مطلوب."] });
      return;
    }
    if (form.description.length > 10000) {
      setErrors({ description: ["الوصف طويل جداً (الحد الأقصى 10000 حرف)."] });
      return;
    }

    // Both default_* are explicitly nullable, so "" clears them.
    const payload = {
      name: form.name.trim(),
      default_organizational_grade:
        form.default_organizational_grade === ""
          ? null
          : Number(form.default_organizational_grade),
      default_activity_type:
        form.default_activity_type === ""
          ? null
          : Number(form.default_activity_type),
      is_described: Boolean(form.is_described),
      description: form.description.trim() || null,
      is_active: Boolean(form.is_active),
    };

    try {
      if (isEdit) {
        await dispatch(
          updateJobTitle(jobTitle.id, payload, page, itemsPerPage, filters)
        );
      } else {
        await dispatch(createJobTitle(payload, page, itemsPerPage, filters));
      }
      close();
    } catch (parsed) {
      // A uniqueness 422 can mean the name is held by a SOFT-DELETED row: the
      // unique index counts them, so the name stays reserved. The server's own
      // message is shown rather than a cheerful "name is taken, pick another",
      // which would imply a free name is one edit away.
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
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          {isEdit ? `تعديل المسمى: ${jobTitle?.name}` : "إضافة مسمى وظيفي"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <Row className="g-3">
            <Col sm={12}>
              <Form.Label htmlFor="jt-name">اسم المسمى الوظيفي *</Form.Label>
              <Form.Control
                id="jt-name"
                type="text"
                maxLength={255}
                placeholder="مثال: مهندس مدني"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                isInvalid={!!fieldError("name")}
                autoFocus
              />
              {fieldError("name") && (
                <div className="text-danger small mt-1">
                  {fieldError("name")}
                </div>
              )}
            </Col>

            <Col sm={12}>
              <Alert variant="light" className="mb-0 py-2 px-3 fs-12">
                القيمتان التاليتان <strong>اقتراحات</strong> تُعبّأ تلقائياً في
                نموذج الموظف عند اختيار هذا المسمى، وليست قيوداً: يمكن أن يحمل
                رئيس شعبة ورئيس دائرة المسمى نفسه بدرجتين مختلفتين، ويبقى سجل
                الموظف هو المرجع.
              </Alert>
            </Col>

            <Col sm={12} md={6}>
              <Form.Label htmlFor="jt-grade">
                الدرجة التنظيمية الافتراضية
              </Form.Label>
              <Select
                inputId="jt-grade"
                classNamePrefix="Select2"
                options={GRADE_OPTIONS}
                value={
                  GRADE_OPTIONS.find(
                    (o) => o.value === Number(form.default_organizational_grade)
                  ) || null
                }
                onChange={(opt) =>
                  setField(
                    "default_organizational_grade",
                    opt ? opt.value : ""
                  )
                }
                isClearable
                placeholder="بدون"
                menuPosition="fixed"
              />
              {fieldError("default_organizational_grade") && (
                <div className="text-danger small mt-1">
                  {fieldError("default_organizational_grade")}
                </div>
              )}
            </Col>

            <Col sm={12} md={6}>
              <Form.Label htmlFor="jt-activity">
                نوع النشاط الافتراضي
              </Form.Label>
              <Select
                inputId="jt-activity"
                classNamePrefix="Select2"
                options={ACTIVITY_TYPE_OPTIONS}
                value={
                  ACTIVITY_TYPE_OPTIONS.find(
                    (o) => o.value === Number(form.default_activity_type)
                  ) || null
                }
                onChange={(opt) =>
                  setField("default_activity_type", opt ? opt.value : "")
                }
                isClearable
                placeholder="بدون"
                menuPosition="fixed"
              />
              {fieldError("default_activity_type") && (
                <div className="text-danger small mt-1">
                  {fieldError("default_activity_type")}
                </div>
              )}
            </Col>

            <Col sm={12} md={6}>
              <Form.Check
                type="switch"
                id="jt-is-described"
                label="تم توصيف المسمى"
                checked={form.is_described}
                onChange={(e) => setField("is_described", e.target.checked)}
              />
              <div className="text-muted small mt-1">
                المسميات غير الموصّفة هي قائمة عمل قسم التحليل والتوصيف.
              </div>
            </Col>
            <Col sm={12} md={6}>
              <Form.Check
                type="switch"
                id="jt-is-active"
                label="مُفعّل"
                checked={form.is_active}
                onChange={(e) => setField("is_active", e.target.checked)}
              />
            </Col>

            <Col sm={12}>
              <Form.Label htmlFor="jt-description">الوصف الوظيفي</Form.Label>
              <Form.Control
                id="jt-description"
                as="textarea"
                maxLength={10000}
                style={{ height: "8rem" }}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                isInvalid={!!fieldError("description")}
              />
              <div className="text-muted small mt-1">
                {form.description.length} / 10000
              </div>
              {fieldError("description") && (
                <div className="text-danger small mt-1">
                  {fieldError("description")}
                </div>
              )}
            </Col>
          </Row>

          {errors._general && (
            <Alert variant="danger" className="mb-0 py-2 px-3">
              {errors._general[0]}
            </Alert>
          )}

          <Row className="g-2">
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

export default JobTitleFormModal;
