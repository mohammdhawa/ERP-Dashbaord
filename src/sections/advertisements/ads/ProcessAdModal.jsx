import React, { useEffect, useState } from "react";
import { Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { processAdvertisement } from "../../../redux/actions/advertisementActions";

export const adStatus = [
  {
    value: "accepted",
    label: "مقبول",
  },
  {
    value: "rejected",
    label: "مرفوض",
  },
];

const ProcessAdModal = ({ open, close, adData }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.advertisements);
  const [rejectReason, setRejectReason] = useState("");
  const [errors, setErrors] = useState({});
  const [ad, setAd] = useState({
    id: "",
    ads_status: "",
  });

  useEffect(() => {
    if (adData) {
      setAd({
        id: adData.id,
        ads_status: adData.ads_status,
      });
    }
  }, [adData]);

  const validateForm = () => {
    let newErrors = {};
    if (ad.ads_status === "rejected" && !rejectReason.trim()) {
      newErrors.rejectReason = "سبب الرفض مطلوب";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const processData = {
      status: ad.ads_status,
      message: ad.ads_status === "rejected" ? rejectReason : undefined,
    };
    dispatch(processAdvertisement(adData?.id, processData)).then(() => {
      handleCloseModal();
    });
  };

  const handleCloseModal = () => {
    setAd({
      id: adData?.id || "",
      ads_status: adData?.ads_status || "",
    });
    setErrors({});
    close();
  };

  const isUpdateDisabled =
    ad.ads_status === adData?.ads_status && ad.id === adData?.id;

  return (
    <Modal
      show={open}
      onHide={handleCloseModal}
      keyboard={false}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{ad?.id}#</span>
            <p className="m-0 fs-12 text-muted">تعديل حالة الإعلان</p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-2" onSubmit={handleSubmit}>
          <Row>
            <Col>
              <Form.Label htmlFor="ad-status">حالة الإعلان</Form.Label>
              <Select
                options={adStatus}
                classNamePrefix="Select2"
                placeholder="اختر حالة الإعلان الجديدة"
                id="ad-status"
                value={
                  adStatus.find((status) => status.value === ad?.ads_status) ||
                  null
                }
                onChange={(selected) => {
                  setAd({
                    ...ad,
                    ads_status: selected.value,
                  });
                  setRejectReason("");
                  setErrors({});
                }}
              />
            </Col>
          </Row>
          {ad.ads_status === "rejected" && adData.ads_status !== "rejected" && (
            <Row>
              <Col>
                <Form.Label htmlFor="reject-reason">
                  سبب الرفض <span className="text-danger ml-1">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  placeholder="ادخل سبب الرفض"
                  id="reject-reason"
                  style={{
                    maxHeight: "10rem",
                    height: "10rem",
                  }}
                  value={rejectReason}
                  className={errors.rejectReason ? "is-invalid" : ""}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (errors.rejectReason) {
                      setErrors({});
                    }
                  }}
                />
                {errors.rejectReason && (
                  <Form.Control.Feedback type="invalid">
                    {errors.rejectReason}
                  </Form.Control.Feedback>
                )}
              </Col>
            </Row>
          )}
          <Row className="g-2 mt-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-success fw-md w-100"
                type="submit"
                disabled={loading || isUpdateDisabled}
              >
                {loading ? <Spinner animation="border" size="sm" /> : "تعديل"}
              </button>
            </Col>
            <Col>
              <button
                onClick={handleCloseModal}
                type="button"
                className="btn btn-light fw-md w-100"
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

export default ProcessAdModal;
