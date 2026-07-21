import React, { useEffect, useState } from "react";
import { Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { adTypes } from "../../../data/General";
import { editFeatureGroup } from "../../../redux/actions/featuresGroupsActions";

const EditGroupModal = ({ open, close, data }) => {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [errors, setErrors] = useState({});
  const { loading } = useSelector((state) => state.featuresGroups);
  const dispatch = useDispatch();

  useEffect(() => {
    if (data) {
      setName(data.name);
      setCategoryId(data.category_id);
    }
  }, [data]);

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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const groupData = {
      name: name.trim(),
      category_id: categoryId,
    };

    dispatch(editFeatureGroup(data.id, groupData))
      .then(() => {
        handleCloseModal();
      })
      .catch((err) => {
        setErrors({ submit: err.message || "فشل في إضافة المجموعة" });
      });
  };

  const handleCloseModal = () => {
    setName(data.name);
    setCategoryId(data.category_id);
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
            <p className="m-0 fs-12 text-muted">تعديل المجموعة {data?.name}</p>
          </div>
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

export default EditGroupModal;
