import React, { useEffect, useState } from "react";
import { Col, Form, Modal, Row, Button, Spinner } from "react-bootstrap";
import { NumericFormat } from "react-number-format";
import Select from "react-select";
import { useDispatch, useSelector } from "react-redux";
import { AlertWithSwal } from "../../components/SwalAlerts";
import { editPackage } from "../../redux/actions/packageActions";
import { packagePeriod } from "../../data/General";

const UpdatePackageModal = ({ open, close, pack }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.packages);

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
  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    if (pack) {
      setName(pack?.name || "");
      setPrice(pack?.price || "");
      setMaxOfAds(pack?.max_of_ads || "");
      setProperties(pack?.properties?.split("#split_here#") || [""]);
      setIsActive(pack?.is_active === 1 ? true : false);
      const foundPeriod = packagePeriod.find((p) => p.value === pack?.period);
      if (foundPeriod) {
        setPeriod(foundPeriod);
        setShowCustomPeriod(false);
      } else {
        setPeriod(packagePeriod.find((p) => p.value === 0));
        setShowCustomPeriod(true);
        setCustomPeriod(pack?.period?.toString() || "");
      }

      setInitialData({
        name: pack?.name || "",
        price: pack?.price || "",
        maxOfAds: pack?.max_of_ads || "",
        period: pack?.period,
        customPeriod: pack?.period?.toString() || "",
        properties: pack?.properties?.split("#split_here#") || [""],
        isActive: pack?.is_active === 1 ? true : false,
      });
    }
  }, [pack]);

  useEffect(() => {
    setShowCustomPeriod(period?.value === 0);
    if (period?.value !== 0) setCustomPeriod("");
  }, [period]);

  useEffect(() => {
    const lastProperty = properties[properties.length - 1];
    setAddPropertyDisable(lastProperty.trim() === "");
  }, [properties]);

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "اسم الباقة مطلوب";
    if (!price || isNaN(price)) newErrors.price = "سعر الباقة مطلوب";
    if (!maxOfAds || isNaN(maxOfAds))
      newErrors.maxOfAds = "عدد الإعلانات مطلوب";
    if (!period) newErrors.period = "مدة الباقة مطلوبة";
    if (showCustomPeriod && (!customPeriod || isNaN(customPeriod))) {
      newErrors.customPeriod = "تحديد المدة مطلوب";
    }
    if (!properties.some((prop) => prop.trim()))
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
      name,
      price: parseFloat(price),
      max_of_ads: parseInt(maxOfAds, 10),
      period: showCustomPeriod ? parseInt(customPeriod, 10) : period.value,
      properties: formattedProperties,
      is_active: isActive ? 1 : 0,
    };

    dispatch(editPackage(pack?.id, packageData))
      .then(() => handleCloseModal())
      .catch((err) => {
        AlertWithSwal("error", "خطأ!", err, "danger");
      });
  };

  const handleCloseModal = () => {
    setErrors({});
    close();
  };

  const handlePropertyChange = (index, value) => {
    setProperties(properties.map((prop, i) => (i === index ? value : prop)));
  };

  const addPropertyField = () => {
    setProperties([...properties, ""]);
  };

  const removePropertyField = (index) => {
    const newProperties = properties.filter((_, i) => i !== index);
    setProperties(newProperties);
  };

  const isDataChanged = () => {
    return (
      name !== initialData.name ||
      price !== initialData.price ||
      maxOfAds !== initialData.maxOfAds ||
      period?.value !== initialData.period ||
      customPeriod !== initialData.customPeriod ||
      properties.join("#split_here#") !==
        initialData.properties.join("#split_here#") ||
      isActive !== initialData.isActive
    );
  };

  return (
    <Modal show={open} onHide={handleCloseModal} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{pack?.id}#</span>
            <p className="m-0 fs-12 text-muted">تعديل الباقة {pack?.name}</p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-2" onSubmit={handleSubmit}>
          <Row>
            <Col>
              <Form.Label>اسم الباقة</Form.Label>
              <Form.Control
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                isInvalid={!!errors.name}
              />
              <Form.Control.Feedback type="invalid">
                {errors.name}
              </Form.Control.Feedback>
            </Col>
          </Row>

          <Row>
            <Col>
              <Form.Label>سعر الباقة</Form.Label>
              <NumericFormat
                className={`form-control ${errors.price ? "is-invalid" : ""}`}
                value={price}
                onValueChange={(values) => setPrice(values.value)}
                thousandSeparator=","
              />
              {errors.price && (
                <div className="invalid-feedback">{errors.price}</div>
              )}
            </Col>
          </Row>

          <Row>
            <Col>
              <Form.Label>عدد الإعلانات المسموح بها</Form.Label>
              <NumericFormat
                className="form-control"
                value={maxOfAds}
                onValueChange={(values) => setMaxOfAds(values.value)}
                thousandSeparator=","
              />
            </Col>
          </Row>

          <Row>
            <Col>
              <Form.Label>مدة الباقة</Form.Label>
              <Select
                options={packagePeriod}
                onChange={setPeriod}
                value={period}
                classNamePrefix="Select2"
              />
              {errors.period && (
                <div className="text-danger small">{errors.period}</div>
              )}
            </Col>
          </Row>

          {showCustomPeriod && (
            <Row>
              <Col>
                <Form.Label>تخصيص مدة الباقة (يوم)</Form.Label>
                <NumericFormat
                  className={`form-control ${
                    errors.customPeriod ? "is-invalid" : ""
                  }`}
                  value={customPeriod}
                  onValueChange={(values) => setCustomPeriod(values.value)}
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
                  addPropertyDisable ? "" : "success"
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
                type="submit"
                className="btn btn-success w-100"
                disabled={loading || !isDataChanged()}
              >
                {loading ? <Spinner animation="border" size="sm" /> : "تعديل"}
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

export default UpdatePackageModal;
