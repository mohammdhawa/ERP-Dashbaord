import React, { useEffect, useState } from "react";
import { Col, Form, Row, Modal, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { editVehicleBrand } from "../../../redux/actions/VehiclesBrandsActions";
import { AlertWithSwal } from "../../../components/SwalAlerts";
import { adTypes } from "../../../data/General";

const UpdateBrandModal = ({ open, close, brand }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.vehicleBrands);
  const [brandName, setBrandName] = useState(brand?.name || "");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [nameError, setNameError] = useState("");
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    if (brand) {
      const initialCategory = adTypes.find(
        (type) => type.value === brand.category_id
      );

      setBrandName(brand.name);
      setSelectedCategory(initialCategory || null);
      setIsChanged(false);
    }
  }, [brand]);

  const handleCategoryChange = (selectedOption) => {
    setSelectedCategory(selectedOption);
    checkIfChanged(brandName, selectedOption);
  };

  const handleBrandNameChange = (e) => {
    setBrandName(e.target.value);
    if (nameError) setNameError("");
    checkIfChanged(e.target.value, selectedCategory);
  };

  const checkIfChanged = (newName, newCategory) => {
    const hasChanged =
      newName !== brand.name || newCategory?.value !== brand.category_id;

    setIsChanged(hasChanged);
  };

  const handleCloseModal = () => {
    setTimeout(() => {
      setNameError("");
      setBrandName(brand?.name || "");
      setSelectedCategory(
        adTypes.find((type) => type.value === brand?.category_id) || null
      );
      setIsChanged(false);
      close();
    }, 100);
  };

  const handleSubmitEditBrand = (e) => {
    e.preventDefault();
    setNameError("");

    if (!brandName) {
      setNameError("يجب إدخال اسم الماركة");
      return;
    }

    if (!selectedCategory) {
      setNameError("يجب اختيار فئة");
      return;
    }

    const updatedBrand = {
      name: brandName,
      category_id: selectedCategory.value,
    };

    if (isChanged) {
      dispatch(editVehicleBrand(brand.id, updatedBrand))
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
        "لم يتم إجراء أي تعديلات على الماركة",
        "danger"
      );
    }
  };

  return (
    <Modal show={open} onHide={handleCloseModal} keyboard={false} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h6" className="modal-title">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{brand?.id}#</span>
            <p className="m-0 fs-12 text-muted">تعديل الماركة {brand?.name}</p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form
          className="d-flex flex-column gap-2"
          onSubmit={handleSubmitEditBrand}
        >
          <Row>
            <Col>
              <Form.Label htmlFor="brand-name">اسم الماركة</Form.Label>
              <Form.Control
                type="text"
                placeholder="ادخل اسم الماركة"
                id="brand-name"
                value={brandName}
                onChange={handleBrandNameChange}
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
              <Form.Label htmlFor="brand-category">الفئة</Form.Label>
              <Select
                options={adTypes.filter(
                  (adType) => adType.value !== 1 && adType.value !== 2
                )}
                classNamePrefix="Select2"
                isClearable={false}
                isSearchable
                value={selectedCategory}
                onChange={handleCategoryChange}
                placeholder="اختر الفئة"
                required
                className="selectsecondary"
                id="brand-category"
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

export default UpdateBrandModal;
