import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet";
import { useDispatch, useSelector } from "react-redux";
import { Card, Col, Row, Modal, Button } from "react-bootstrap";
import PageHeader from "../../components/Pageheader";
import DataTableServer from "../../components/DataTableServer";
import Select from "react-select";
import { ShowPerPage } from "../../data/General";
import { fetchComplaints } from "../../redux/actions/complaintsActions";
import { ComplaintsColumns } from "../../data/Columns";
import Loader from "../../components/Loader";
import moment from "moment-timezone";

const Complaints = () => {
  const dispatch = useDispatch();
  const {
    data: complaints = [],
    loading = false,
    totalPages = 0,
    totalCount = 0,
    error,
    currentPage = 1,
    perPage = 10,
  } = useSelector((state) => state.complaints || {});

  const [itemsPerPage, setItemsPerPage] = useState(perPage);
  const [activePage, setActivePage] = useState(currentPage);
  const [adIdFilter, setAdIdFilter] = useState("");
  const [debouncedAdId, setDebouncedAdId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const formatDate = (date) =>
    moment(date).tz("Europe/Istanbul").format("YYYY-MM-DD");
  const formatTime = (date) =>
    moment(date).tz("Europe/Istanbul").format("HH:mm:ss");

  // Debounce adId filter
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };
  const handleAdIdChange = useCallback(
    debounce((value) => setDebouncedAdId(value), 500),
    []
  );
  useEffect(() => {
    handleAdIdChange(adIdFilter);
  }, [adIdFilter, handleAdIdChange]);

  useEffect(() => {
    dispatch(fetchComplaints(activePage, itemsPerPage, "", debouncedAdId));
  }, [dispatch, activePage, itemsPerPage, debouncedAdId]);

  const handlePageChange = (page) => setActivePage(page);

  const handleViewComplaint = (complaint) => {
    setSelectedComplaint(complaint);
    setShowModal(true);
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>لوحة التحكم | الشكاوى</title>
      </Helmet>

      <PageHeader homepage="خدمة العملاء" activepage="الشكاوى" page="الشكاوى" />

      <Row>
        <Col xl={12}>
          <Card className="custom-card mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <input
                type="number"
                className="form-control m-4"
                style={{ maxWidth: 250 }}
                placeholder="رقم الإعلان..."
                value={adIdFilter}
                onChange={(e) => setAdIdFilter(e.target.value)}
                min={1}
              />
              <div style={{ minWidth: 120 }}>
                <Select
                  options={ShowPerPage}
                  placeholder={`عرض ${itemsPerPage}`}
                  classNamePrefix="Select2"
                  className="m-4"
                  defaultValue={{
                    label: itemsPerPage,
                    value: itemsPerPage,
                  }}
                  onChange={(e) => {
                    setItemsPerPage(e.value);
                    setActivePage(1);
                  }}
                  value={{
                    label: `عرض ${itemsPerPage}`,
                    value: itemsPerPage,
                  }}
                />
              </div>
            </div>
            <Card.Body>
              <DataTableServer
                columns={ComplaintsColumns}
                data={complaints}
                itemsPerPage={itemsPerPage}
                currentPage={activePage}
                totalPages={totalPages}
                pageName="complaint"
                onPageChange={handlePageChange}
                dataCount={totalCount}
                loading={loading}
                functions={{
                  handleDetail: handleViewComplaint,
                }}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Complaint Details Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>تفاصيل الشكوى</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedComplaint ? (
            <div className="text-center">
              <p>
                <strong>رقم الشكوى:</strong> {selectedComplaint.id}
              </p>
              <p>
                <strong>محتوى الشكوى:</strong> {selectedComplaint.content}
              </p>
              <p>
                <strong>رقم الإعلان:</strong> {selectedComplaint.advs_id}
              </p>
              <p>
                <strong>تاريخ الإنشاء:</strong>{" "}
                {formatDate(selectedComplaint.created_at)}
                <br />
                <span className="fs-11 text-muted">
                  {formatTime(selectedComplaint.created_at)}
                </span>
              </p>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            إغلاق
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Complaints;
