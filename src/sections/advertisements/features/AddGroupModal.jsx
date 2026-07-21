import React, { useState } from "react";
import { Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { adTypes } from "../../../data/General";
import { createFeatureGroup } from "../../../redux/actions/featuresGroupsActions";
import { AlertWithSwal } from "../../../components/SwalAlerts";

const AddGroupModal = ({ open, close }) => {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [features, setFeatures] = useState([""]);
  const [addFeatures, setAddFeatures] = useState(false);
  const addFeatureDisable = features[features.length - 1]?.trim() === "";
  const [errors, setErrors] = useState({});

  const { loading } = useSelector((state) => state.featuresGroups);
  const dispatch = useDispatch();

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = "اسم المجموعة مطلوب";
    } else if (name.length < 2) {
      newErrors.name = "اسم المجموعة يجب أن يكون حرفين على الأقل";
    }

    if (!categoryId) {
      newErrors.categoryId = "الرجاء اختيار الفئة";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleFeatureChange = (index, value) => {
    const updatedFeatures = [...features];
    updatedFeatures[index] = value;
    setFeatures(updatedFeatures);
  };

  const addFeatureField = () => {
    if (!addFeatureDisable) {
      setFeatures([...features, ""]);
    }
  };

  const removeFeatureField = (index) => {
    const updatedFeatures = features.filter((_, i) => i !== index);
    setFeatures(updatedFeatures);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }
    const validFeatures = features.map((f) => f.trim()).filter((f) => f !== "");

    const featureCounts = {};
    const duplicates = [];

    validFeatures.forEach((feature, index) => {
      if (featureCounts[feature]) {
        featureCounts[feature].push(index + 1);
      } else {
        featureCounts[feature] = [index + 1];
      }
    });

    Object.entries(featureCounts).forEach(([feature, indexes]) => {
      if (indexes.length > 1) {
        duplicates.push(
          `"${feature}" (موجود في الخانات: ${indexes.join(", ")})`
        );
      }
    });

    if (duplicates.length > 0) {
      const message = `${duplicates.join(" | ")}`;
      AlertWithSwal("error", "هناك ميزات مكررة", message, "danger");
      return;
    }

    const groupData = {
      name: name.trim(),
      category_id: categoryId,
      features:
        validFeatures.length > 0 ? [...new Set(validFeatures)] : undefined,
    };
    dispatch(createFeatureGroup(groupData))
      .then(() => {
        handleCloseModal();
      })
      .catch((err) => {
        setErrors({ submit: err.message || "فشل في إضافة المجموعة" });
      });
  };

  const handleCloseModal = () => {
    setName("");
    setCategoryId("");
    setErrors({});
    setAddFeatures(false);
    setFeatures([""]);
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
          إضافة مجموعة
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-2">
          <Row>
            <Col>
              <Form.Label htmlFor="group-name">اسم المجموعة</Form.Label>
              <Form.Control
                type="text"
                placeholder="ادخل اسم المجموعة"
                id="group-name"
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
              <Form.Label htmlFor="category">الفئة</Form.Label>
              <Select
                options={adTypes}
                classNamePrefix="Select2"
                isSearchable
                placeholder="اختر الفئة"
                id="category"
                value={adTypes.find((option) => option.value === categoryId)}
                onChange={(selectedOption) =>
                  setCategoryId(selectedOption?.value || "")
                }
                className={errors.categoryId ? "is-invalid" : ""}
                required
              />
              {errors.categoryId && (
                <div className="invalid-feedback d-block">
                  {errors.categoryId}
                </div>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="switch-primary"
                  checked={addFeatures}
                  onChange={(e) => {
                    setAddFeatures(e.target.checked);
                    setFeatures([""]);
                  }}
                />
                <label className="form-check-label" htmlFor="switch-primary">
                  إضافة ميزات إلى المجموعة
                </label>
              </div>
            </Col>
          </Row>

          {addFeatures && (
            <Row>
              <Col>
                <Form.Label>الميزات</Form.Label>
                {features.map((feature, index) => (
                  <div key={index} className="d-flex align-items-center mb-2">
                    <Form.Control
                      type="text"
                      placeholder={`ميزة رقم ${index + 1}`}
                      value={feature}
                      onChange={(e) =>
                        handleFeatureChange(index, e.target.value)
                      }
                    />
                    {index > 0 && (
                      <button
                        type="button"
                        className="btn btn-light btn-sm ms-2"
                        onClick={() => removeFeatureField(index)}
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className={`btn btn-${
                    addFeatureDisable ? "" : "success"
                  }-light w-100`}
                  onClick={addFeatureField}
                  disabled={addFeatureDisable}
                >
                  إضافة ميزة
                </button>
              </Col>
            </Row>
          )}

          <Row className="g-2 mt-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-primary fw-md w-100"
                type="submit"
                disabled={loading}
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

export default AddGroupModal;
