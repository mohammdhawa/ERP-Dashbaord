import React, { useState, useEffect } from "react";
import { Col, Form, Row, Modal, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { AlertWithSwal } from "../../../components/SwalAlerts";
import { createVehicleModel } from "../../../redux/actions/VehicleModelsActions";

const AddModelModal = ({ open, close }) => {
  const [modelName, setModelName] = useState("");
  const { loading } = useSelector((state) => state.vehicleModels);
  const vehicleBrands = useSelector(
    (state) => state.vehicleBrands.vehicleBrands
  );
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [modelError, setModelError] = useState("");
  const [isAddDisabled, setIsAddDisabled] = useState(true);

  const dispatch = useDispatch();

  useEffect(() => {
    setIsAddDisabled(!modelName.trim() || !selectedBrand);
  }, [modelName, selectedBrand]);

  const handleCloseModal = () => {
    setTimeout(() => {
      setModelError("");
      setModelName("");
      setSelectedBrand(null);
      close();
    }, 100);
  };

  const handleSubmitAddModel = (e) => {
    e.preventDefault();
    setModelError("");

    if (!modelName) {
      setModelError("يجب إدخال اسم الموديل");
      return;
    }

    if (!selectedBrand) {
      AlertWithSwal("error", "خطأ!", "يجب تحديد الماركة", "danger");
      return;
    }
    const modelData = {
      name: modelName,
      brand_id: selectedBrand.value,
    };
    dispatch(createVehicleModel(modelData))
      .then(() => {
        handleCloseModal();
      })
      .catch((err) => {
        AlertWithSwal("error", "خطأ!", err, "danger");
      });
  };

  const brandsOptions = vehicleBrands.map((brand) => ({
    value: brand.id,
    label: brand.name,
  }));

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
          إضافة موديل
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form
          className="d-flex flex-column gap-2"
          onSubmit={handleSubmitAddModel}
        >
          <Row>
            <Col>
              <Form.Label htmlFor="model-name">اسم الموديل</Form.Label>
              <Form.Control
                type="text"
                placeholder="ادخل اسم الموديل"
                id="model-name"
                value={modelName}
                onChange={(e) => {
                  setModelName(e.target.value);
                  if (modelError) setModelError("");
                }}
                className={modelError ? "is-invalid" : ""}
                required
              />
              {modelError && (
                <div className="text-danger small">{modelError}</div>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="model-brand">الماركة</Form.Label>
              <Select
                options={brandsOptions}
                classNamePrefix="Select2"
                isSearchable
                placeholder="اختر الماركة"
                id="model-brand"
                onChange={setSelectedBrand}
              />
            </Col>
          </Row>
          <Row className="g-2 mt-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-primary fw-md w-100"
                type="submit"
                disabled={isAddDisabled || loading}
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

export default AddModelModal;
