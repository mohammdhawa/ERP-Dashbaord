import React, { useEffect, useState } from "react";
import { Col, Form, Row, Modal, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { editVehicleModel } from "../../../redux/actions/VehicleModelsActions";
import { AlertWithSwal } from "../../../components/SwalAlerts";

const UpdateModelModal = ({ open, close, model }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.vehicleModels);
  const vehicleBrands = useSelector(
    (state) => state.vehicleBrands.vehicleBrands
  );
  const [modelName, setModelName] = useState(model?.name || "");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [nameError, setNameError] = useState("");
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    if (model) {
      const initialBrand = vehicleBrands.find(
        (brand) => brand.id === model.brand_id
      );
      setModelName(model.name);
      setSelectedBrand(
        initialBrand
          ? { value: initialBrand.id, label: initialBrand.name }
          : null
      );
      setIsChanged(false);
    }
  }, [model, vehicleBrands]);

  const handleBrandChange = (selectedOption) => {
    setSelectedBrand(selectedOption);
    checkIfChanged(modelName, selectedOption);
  };

  const handleModelNameChange = (e) => {
    setModelName(e.target.value);
    if (nameError) setNameError("");
    checkIfChanged(e.target.value, selectedBrand);
  };

  const checkIfChanged = (newName, newBrand) => {
    const hasChanged =
      newName !== model.name || newBrand?.value !== model.brand_id;
    setIsChanged(hasChanged);
  };

  const handleCloseModal = () => {
    setTimeout(() => {
      setNameError("");
      setModelName(model?.name || "");
      const initialBrand = vehicleBrands.find(
        (brand) => brand.id === model?.brand_id
      );
      setSelectedBrand(
        initialBrand
          ? { value: initialBrand.id, label: initialBrand.name }
          : null
      );
      setIsChanged(false);
      close();
    }, 100);
  };

  const handleSubmitEditModel = (e) => {
    e.preventDefault();
    setNameError("");

    if (!modelName) {
      setNameError("يجب إدخال اسم الموديل");
      return;
    }

    if (!selectedBrand) {
      setNameError("يجب اختيار ماركة");
      return;
    }

    const updatedModel = {
      name: modelName,
      brand_id: selectedBrand.value,
    };

    if (isChanged) {
      dispatch(editVehicleModel(model.id, updatedModel))
        .then(() => {
          handleCloseModal();
        })
        .catch((err) => {
          setNameError(
            err?.response?.data?.errors?.name?.[0] ||
              "حدث خطأ، يرجى المحاولة مجدداً"
          );
        });
    } else {
      AlertWithSwal(
        "error",
        "خطأ!",
        "لم يتم إجراء أي تعديلات على الموديل",
        "danger"
      );
    }
  };

  const brandsOptions = vehicleBrands.map((brand) => ({
    value: brand.id,
    label: brand.name,
  }));

  return (
    <Modal show={open} onHide={handleCloseModal} keyboard={false} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h6" className="modal-title">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{model?.id}#</span>
            <p className="m-0 fs-12 text-muted">تعديل الموديل {model?.name}</p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form
          className="d-flex flex-column gap-2"
          onSubmit={handleSubmitEditModel}
        >
          <Row>
            <Col>
              <Form.Label htmlFor="model-name">اسم الموديل</Form.Label>
              <Form.Control
                type="text"
                placeholder="ادخل اسم الموديل"
                id="model-name"
                value={modelName}
                onChange={handleModelNameChange}
                className={nameError ? "is-invalid" : ""}
                required
              />
              {nameError && (
                <div className="text-danger small">{nameError}</div>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="model-brand">الماركة</Form.Label>
              <Select
                options={brandsOptions}
                classNamePrefix="Select2"
                isClearable={false}
                isSearchable
                value={selectedBrand}
                onChange={handleBrandChange}
                placeholder="اختر الماركة"
                required
                id="model-brand"
              />
            </Col>
          </Row>
          <Row className="g-2 mt-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-success fw-md w-100"
                type="submit"
                disabled={!isChanged || loading}
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

export default UpdateModelModal;
