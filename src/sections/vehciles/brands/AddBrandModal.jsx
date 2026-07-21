import React, { useState, useEffect } from "react";
import { Col, Form, Row, Modal, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { AlertWithSwal } from "../../../components/SwalAlerts";
import { adTypes } from "../../../data/General";
import { createVehicleBrand } from "../../../redux/actions/VehiclesBrandsActions";

const AddBrandModal = ({ open, close }) => {
  const [brandName, setBrandName] = useState("");
  const { loading } = useSelector((state) => state.vehicleBrands);
  const [selectedCategory, setSelectedCayegory] = useState([]);
  const [brandError, setBrandError] = useState("");
  const [isAddDisabled, setIsAddDisabled] = useState(true);

  const dispatch = useDispatch();

  useEffect(() => {
    setIsAddDisabled(!brandName.trim() || !selectedCategory);
  }, [brandName, setSelectedCayegory]);

  const handleCloseModal = () => {
    setTimeout(() => {
      setBrandError("");
      setBrandName("");
      setSelectedCayegory([]);
      close();
    }, 100);
  };

  const handleSubmitAddBrand = (e) => {
    e.preventDefault();
    setBrandError("");

    if (!brandName) {
      setBrandError("يجب إدخال اسم الماركة");
      return;
    }

    if (!selectedCategory) {
      AlertWithSwal("error", "خطأ!", "يجب تحديد الفئة", "danger");
      return;
    }
    const brandData = {
      name: brandName,
      category_id: selectedCategory?.value,
    };
    dispatch(createVehicleBrand(brandData))
      .then(() => {
        handleCloseModal();
      })
      .catch((err) => {
        AlertWithSwal("error", "خطأ!", err, "danger");
      });
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
          إضافة ماركة
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form
          className="d-flex flex-column gap-2"
          onSubmit={handleSubmitAddBrand}
        >
          <Row>
            <Col>
              <Form.Label htmlFor="brand-name">اسم الماركة</Form.Label>
              <Form.Control
                type="text"
                placeholder="ادخل اسم الماركة"
                id="brand-name"
                value={brandName}
                onChange={(e) => {
                  setBrandName(e.target.value);
                  if (brandError) setBrandError("");
                }}
                className={brandError ? "is-invalid" : ""}
                required
              />
              {brandError && (
                <div className="text-danger small">{brandError}</div>
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
                isSearchable
                placeholder="اختر الفئة"
                id="brand-category"
                onChange={setSelectedCayegory}
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

export default AddBrandModal;
