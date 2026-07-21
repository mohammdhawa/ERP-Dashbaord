import React, { useEffect, useState } from "react";
import { Col, Form, Modal, Row, Button, Spinner } from "react-bootstrap";
import { NumericFormat } from "react-number-format";
import Select from "react-select";
import { packagePeriod } from "../../data/General";
import { useDispatch, useSelector } from "react-redux";
import { AlertWithSwal } from "../../components/SwalAlerts";
import { createPackage } from "../../redux/actions/packageActions";
const AddPackageModal = ({ open, close }) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [maxOfAds, setMaxOfAds] = useState("");
  const [period, setPeriod] = useState(null);
  const [customPeriod, setCustomPeriod] = useState("");
  const [showCustomPeriod, setShowCustomPeriod] = useState(false);
  const [properties, setProperties] = useState([""]);
  const [isActive, setIsActive] = useState(null);

  const [errors, setErrors] = useState({});
  const [addPropertyDisable, setAddPropertyDisable] = useState(true);
  const { loading } = useSelector((state) => state.packages);
  const dispatch = useDispatch();

  useEffect(() => {
    if (period?.label === "مخصص") {
      setShowCustomPeriod(true);
    } else {
      setShowCustomPeriod(false);
      setCustomPeriod("");
    }
  }, [period]);

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "اسم الباقة مطلوب";
    if (!price || isNaN(price)) newErrors.price = "سعر الباقة مطلوب";
    if (!period) newErrors.period = "مدة الباقة مطلوبة";
    if (showCustomPeriod && (!customPeriod || isNaN(customPeriod))) {
      newErrors.customPeriod = "تحديد المدة مطلوب";
    }
    if (!properties[0].trim())
      newErrors.properties = "خاصية واحدة على الأقل مطلوبة";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formattedProperties = properties
      .filter((prop) => prop.trim())
      .join("#split_here#");

    const packageData = {
      name: name,
      price: parseFloat(price),
      max_of_ads: parseInt(maxOfAds),
      period: showCustomPeriod ? customPeriod : period.value,
      properties: formattedProperties,
      is_active: isActive ? 1 : 0,
    };

    dispatch(createPackage(packageData))
      .then(() => handleCloseModal())
      .catch((err) => {
        AlertWithSwal("error", "خطأ!", err, "danger");
      });
  };

  const handleCloseModal = () => {
    setName("");
    setPrice("");
    setMaxOfAds("");
    setPeriod(null);
    setCustomPeriod("");
    setProperties([""]);
    setShowCustomPeriod(false);
    setErrors({});
    close();
  };

  useEffect(() => {
    if (properties[properties.length - 1].trim() === "") {
      setAddPropertyDisable(true);
    } else {
      setAddPropertyDisable(false);
    }
  }, [properties]);

  const addPropertyField = () => {
    if (properties[properties.length - 1].trim() === "") {
      return;
    }
    setProperties([...properties, ""]);
  };

  const removePropertyField = (index) => {
    if (properties.length === 1) return;
    setProperties(properties.filter((_, i) => i !== index));
  };

  const handlePropertyChange = (index, value) => {
    const updatedProperties = [...properties];
    updatedProperties[index] = value;
    setProperties(updatedProperties);
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
        <Modal.Title as="h6">إضافة باقة</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-2" onSubmit={handleSubmit}>
          <Row>
            <Col>
              <Form.Label htmlFor="name">اسم الباقة</Form.Label>
              <Form.Control
                type="text"
                id="name"
                placeholder="ادخل اسم الباقة"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
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
              <Form.Label htmlFor="price">سعر الباقة</Form.Label>
              <NumericFormat
                className={`form-control ${errors.price ? "is-invalid" : ""}`}
                id="price"
                placeholder="ادخل سعر الباقة"
                value={price}
                onValueChange={(values) => setPrice(values.value)}
                thousandSeparator=","
                allowNegative={false}
                required
              />
              {errors.price && (
                <div className="invalid-feedback">{errors.price}</div>
              )}
            </Col>
          </Row>

          <Row>
            <Col>
              <Form.Label htmlFor="maxOfAds">
                عدد الإعلانات المسموح بها
              </Form.Label>
              <NumericFormat
                className="form-control"
                id="maxOfAds"
                placeholder="ادخل عدد الإعلانات"
                value={maxOfAds}
                onValueChange={(values) => setMaxOfAds(values.value)}
                thousandSeparator=","
                allowNegative={false}
                required
              />
            </Col>
          </Row>

          <Row>
            <Col>
              <Form.Label htmlFor="period">مدة الباقة</Form.Label>
              <Select
                options={packagePeriod}
                classNamePrefix="Select2"
                id="period"
                isClearable={false}
                onChange={setPeriod}
                placeholder="اختر مدة الباقة"
                value={period}
                required
              />
              {errors.period && (
                <div className="text-danger small mt-1">{errors.period}</div>
              )}
            </Col>
          </Row>

          {showCustomPeriod && (
            <Row>
              <Col>
                <Form.Label htmlFor="customPeriod">
                  تخصيص مدة الباقة (يوم)
                </Form.Label>
                <NumericFormat
                  className={`form-control ${
                    errors.customPeriod ? "is-invalid" : ""
                  }`}
                  id="customPeriod"
                  placeholder="ادخل مدة الباقة"
                  value={customPeriod}
                  onValueChange={(values) => setCustomPeriod(values.value)}
                  allowNegative={false}
                  required
                />
                {errors.customPeriod && (
                  <div className="invalid-feedback">{errors.customPeriod}</div>
                )}
              </Col>
            </Row>
          )}

          <Row>
            <Col>
              <Form.Label>ميزات الباقة</Form.Label>
              {properties.map((property, index) => (
                <div key={index} className="d-flex align-items-center mb-2">
                  <Form.Control
                    type="text"
                    placeholder={`ميزة رقم ${index + 1}`}
                    value={property}
                    onChange={(e) =>
                      handlePropertyChange(index, e.target.value)
                    }
                    required={index === 0}
                  />
                  {index > 0 && (
                    <button
                      className="btn btn-light btn-sm ms-2"
                      onClick={() => removePropertyField(index)}
                    >
                      <i className="ri-close-line "></i>
                    </button>
                  )}
                </div>
              ))}
              {errors.properties && (
                <div className="text-danger small mt-1">
                  {errors.properties}
                </div>
              )}
              <button
                type="button"
                className={`btn btn-${
                  addPropertyDisable ? `` : `success`
                }-light w-100`}
                onClick={addPropertyField}
                disabled={addPropertyDisable}
              >
                إضافة ميزة
              </button>
            </Col>
          </Row>
          <Row>
            <Col>
              <div className="form-check ">
                <input
                  className="form-check-input form-checked-outline form-checked-success"
                  type="checkbox"
                  id="successoutlineChecked"
                  checked={isActive}
                  onChange={(e) => {
                    setIsActive(e.target.checked);
                  }}
                />
                <label
                  className="form-check-label"
                  htmlFor="successoutlineChecked"
                >
                  تفعيل الباقة
                </label>
              </div>
            </Col>
          </Row>
          <Row className="g-2 mt-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-secondary fw-md w-100"
                type="submit"
                disabled={
                  loading ||
                  !name ||
                  !price ||
                  !maxOfAds ||
                  !period ||
                  !properties[0].trim()
                }
              >
                {loading ? <Spinner animation="border" size="sm" /> : "إضافة"}
              </button>
            </Col>
            <Col sm={12} md={6}>
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

export default AddPackageModal;
