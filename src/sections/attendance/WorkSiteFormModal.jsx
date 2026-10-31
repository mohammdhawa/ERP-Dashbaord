/* This boundary receives a server-backed site whose version shape is validated by the API. */
/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { toastNotify } from "../../utils";
import { buildSitePayload, siteErrorMessage, validateSiteForm } from "./workSiteForm";

const empty = {
  name: "",
  latitude: "",
  longitude: "",
  radius_m: "",
  effective_from: "",
};

const WorkSiteFormModal = ({ show, site, onHide, onSaved }) => {
  const editing = Boolean(site);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    const latest = site?.versions?.at(-1);
    setForm(
      site
        ? {
            name: latest?.name || site.name || "",
            latitude: String(latest?.latitude ?? ""),
            longitude: String(latest?.longitude ?? ""),
            radius_m: String(latest?.radius_m ?? ""),
            effective_from: "",
          }
        : empty
    );
    setErrors({});
  }, [show, site]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: null, _general: null }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const clientErrors = validateSiteForm(form, { editing });
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const payload = buildSitePayload(form, { editing });
      const response = editing
        ? await api.patch(`/attendance/work-sites/${site.id}`, payload)
        : await api.post("/attendance/work-sites", payload);
      toastNotify(response.data.message, "success");
      onSaved?.(response.data.data);
    } catch (error) {
      const parsed = parseApiError(error);
      setErrors({
        ...(parsed.errors || {}),
        _general: siteErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const message = (field) => {
    const value = errors[field];
    return Array.isArray(value) ? value[0] : value;
  };

  const input = (field, label, props = {}) => (
    <Col xs={12} md={6}>
      <Form.Group controlId={`work-site-${field}`}>
        <Form.Label>{label}</Form.Label>
        <Form.Control
          {...props}
          value={form[field]}
          onChange={(event) => setField(field, event.target.value)}
          isInvalid={Boolean(message(field))}
          disabled={saving}
        />
        <Form.Control.Feedback type="invalid">
          {message(field)}
        </Form.Control.Feedback>
      </Form.Group>
    </Col>
  );

  return (
    <Modal show={show} onHide={saving ? undefined : onHide} centered size="lg" dir="rtl">
      <Form onSubmit={submit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? `تعديل ${site.name}` : "إضافة موقع عمل"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {message("_general") && <Alert variant="danger">{message("_general")}</Alert>}
          <Row className="g-3">
            {input("name", "اسم الموقع", { type: "text", maxLength: 150, required: true })}
            {input("radius_m", "نصف القطر المسموح (متر)", {
              type: "number", min: "0.01", max: "100000", step: "0.01", required: true,
            })}
            {input("latitude", "خط العرض", {
              type: "number", min: "-90", max: "90", step: "any", required: true,
            })}
            {input("longitude", "خط الطول", {
              type: "number", min: "-180", max: "180", step: "any", required: true,
            })}
            {editing && input("effective_from", "وقت سريان النسخة الجديدة", {
              type: "datetime-local", required: true,
            })}
          </Row>
          {editing && (
            <div className="form-text mt-3">
              يُنشئ التعديل نسخة جديدة من حدود الموقع في الوقت المحدد. تبقى النسخ السابقة لأحداث الحضور القديمة.
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-light" onClick={onHide} disabled={saving}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <Spinner size="sm" className="me-2" />}
            {editing ? "حفظ نسخة جديدة" : "إضافة الموقع"}
          </button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default WorkSiteFormModal;
