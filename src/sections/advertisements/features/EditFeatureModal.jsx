import React, { useEffect, useState } from "react";
import { Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { adTypes } from "../../../data/General";
import { editFeature } from "../../../redux/actions/featuresActions";

const EditFeatureModal = ({ open, close, data }) => {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [errors, setErrors] = useState({});
  const { featureGroups } = useSelector((state) => state.featuresGroups);
  const { loading } = useSelector((state) => state.features);
  const dispatch = useDispatch();

  useEffect(() => {
    if (data) {
      setName(data.name);
      setGroupId(data.feature_group_id);
    }
  }, [data]);
  const featuresGroupOptions = adTypes.map((category) => ({
    label: category.label,
    options: featureGroups
      .filter((group) => group.category_id === category.value)
      .map((group) => ({
        label: group.name,
        value: group.id,
      })),
  }));

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = "اسم الميزة مطلوب";
    } else if (name.length < 2) {
      newErrors.name = "اسم الميزة يجب أن يكون حرفين على الأقل";
    }

    if (!groupId) {
      newErrors.groupId = "الرجاء اختيار المجموعة";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const featureData = {
      name: name.trim(),
      feature_group_id: groupId,
    };

    dispatch(editFeature(data.id, featureData))
      .then(() => {
        handleCloseModal();
      })
      .catch((err) => {
        setErrors({ submit: err.message || "فشل في إضافة الميزة" });
      });
  };

  const handleCloseModal = () => {
    setName(data.name);
    setGroupId(data.feature_group_id);
    setErrors({});
    close();
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
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{data?.id}#</span>
            <p className="m-0 fs-12 text-muted">تعديل الميزة {data?.name}</p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-2">
          <Row>
            <Col>
              <Form.Label htmlFor="feature-name">اسم الميزة</Form.Label>
              <Form.Control
                type="text"
                placeholder="ادخل اسم الميزة"
                id="feature-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                isInvalid={!!errors.name}
                required
              />
              <Form.Control.Feedback type="invalid">
                {errors.name}
              </Form.Control.Feedback>
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="group">المجموعة</Form.Label>
              <Select
                options={featuresGroupOptions}
                classNamePrefix="Select2"
                isSearchable
                placeholder="اختر المجموعة"
                id="group"
                value={featuresGroupOptions
                  .flatMap((group) => group.options)
                  .find((option) => option.value === groupId)}
                onChange={(selectedOption) =>
                  setGroupId(selectedOption?.value || "")
                }
                className={errors.groupId ? "is-invalid" : ""}
                styles={{
                  groupHeading: (base) => ({
                    color: "var(--default-text-color)",
                    fontWeight: "bolder",
                    textAlign: "right",
                    padding: " 5px 8px",
                    background: "var(--default-background)",
                    marginTop: "0px",
                    fontSize: "13px",
                  }),
                }}
              />
              {errors.groupId && (
                <div className="invalid-feedback d-block">{errors.groupId}</div>
              )}
            </Col>
          </Row>

          <Row className="g-2 mt-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-success fw-md w-100"
                type="submit"
                disabled={loading}
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

export default EditFeatureModal;
