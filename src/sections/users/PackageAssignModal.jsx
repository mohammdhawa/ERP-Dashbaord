import React, { useEffect, useMemo, useState } from "react";
import { Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { fetchPackages } from "../../redux/actions/packageActions";
import { assignPackage } from "../../redux/actions/usersActions";

const PackageAssignModal = ({ open, close, user }) => {
  const [userData, setUserData] = useState("");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { packages } = useSelector((state) => state.packages);
  const { loading } = useSelector((state) => state.users);
  const dispatch = useDispatch();

  useEffect(() => {
    setUserData(user);
  }, [user]);

  useEffect(() => {
    dispatch(fetchPackages());
  }, [dispatch]);

  useEffect(() => {
    if (open) {
      setSelectedPackage(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const packageOptions = useMemo(() => {
    return packages.map((pkg) => ({
      value: pkg.id,
      label: pkg.name,
    }));
  }, [packages]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPackage) {
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(assignPackage(selectedPackage.value, userData?.id));
      close();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePackageChange = (selectedOption) => {
    setSelectedPackage(selectedOption);
  };

  return (
    <Modal
      show={open}
      onHide={close}
      keyboard={false}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{userData?.id}#</span>
            <p className="m-0 fs-12 text-muted">
              تخصيص باقة للمستخدم {userData?.name}
            </p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-2" onSubmit={handleSubmit}>
          <Row>
            <Col>
              <Form.Label htmlFor="user-package">الباقة</Form.Label>
              <Select
                options={packageOptions}
                classNamePrefix="Select2"
                placeholder="اختر الباقة"
                id="user-package"
                value={selectedPackage}
                onChange={handlePackageChange}
                isDisabled={isSubmitting || loading}
              />
            </Col>
          </Row>

          <Row className="g-2 mt-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-success fw-md w-100"
                type="submit"
                disabled={!selectedPackage || isSubmitting || loading}
              >
                {isSubmitting || loading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "تخصيص"
                )}
              </button>
            </Col>
            <Col>
              <button
                onClick={close}
                type="button"
                className="btn btn-light fw-md w-100"
                disabled={isSubmitting || loading}
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

export default PackageAssignModal;
