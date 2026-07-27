import { Fragment, useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet";
import {
  Card,
  Col,
  Row,
  Accordion,
  Form,
  Modal,
  Button,
  InputGroup,
  OverlayTrigger,
  Tooltip,
  Spinner,
} from "react-bootstrap";
import { PageHeader } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import Select from "react-select";
import { ShowPerPage } from "../../data/General";
import { paymentsRequestsColumns } from "../../data/Columns";
import api from "../../redux/api";
import { AlertWithSwal } from "../../components/SwalAlerts";
import Swal from "sweetalert2";

const packageOptions = [
  { value: "", label: "كل الباقات" },
  { value: 1, label: "الباقة المجانية" },
  { value: 2, label: "الباقة الفضية" },
  { value: 3, label: "الباقة الذهبية" },
];

const PendingSubscriptions = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activePage, setActivePage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Filters
  const [pendingFilters, setPendingFilters] = useState({
    packageId: "",
    createdAtFrom: "",
    createdAtTo: "",
  });
  const [debouncedFilters, setDebouncedFilters] = useState(pendingFilters);

  // Approve/Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [rejectError, setRejectError] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");

  // Debounce filter changes
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const handleFilterChange = useCallback(
    debounce((filters) => {
      setDebouncedFilters(filters);
      setActivePage(1);
    }, 500),
    []
  );

  useEffect(() => {
    handleFilterChange(pendingFilters);
  }, [pendingFilters, handleFilterChange]);

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const params = [
        `status=pending`,
        `per_page=${itemsPerPage}`,
        `page=${activePage}`,
      ];
      if (debouncedFilters.packageId) params.push(`package_id=${debouncedFilters.packageId}`);
      if (debouncedFilters.createdAtFrom) params.push(`created_at_from=${debouncedFilters.createdAtFrom}`);
      if (debouncedFilters.createdAtTo) params.push(`created_at_to=${debouncedFilters.createdAtTo}`);
      const query = params.join("&");
      const response = await api.get(`/subscription-requests?${query}`);
      const data = response.data.data;
      setRequests(data.subscription_requests || []);
      setTotalPages(data.total_pages || 0);
      setTotal(data.total || 0);
    } catch (err) {
      setError("حدث خطأ أثناء جلب بيانات الطلبات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line
  }, [itemsPerPage, activePage, debouncedFilters.packageId, debouncedFilters.createdAtFrom, debouncedFilters.createdAtTo]);

  const handlePageChange = (page) => setActivePage(page);

  // Approve handler
  const handleApprove = async (item) => {
    if (!item) return;
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-2",
        cancelButton: "btn btn-light me-2",
      },
      buttonsStyling: false,
    });
    const result = await swalWithBootstrapButtons.fire({
      title: "هل أنت متأكد من تأكيد هذا الطلب؟",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "تأكيد",
      cancelButtonText: "إلغاء",
      reverseButtons: true,
      backdrop: true,
    });
    if (!result.isConfirmed) return;
    try {
      await api.put(`/subscription-requests/${item.id}/process`, { status: "approved" });
      AlertWithSwal("success", "تم!", "تم تأكيد الطلب بنجاح.", "success");
      fetchRequests();
    } catch (err) {
      AlertWithSwal("error", "خطأ!", "حدث خطأ أثناء تأكيد الطلب.", "danger");
    }
  };

  // Reject handler
  const handleReject = (item) => {
    setProcessingId(item.id);
    setRejectReason("");
    setRejectError("");
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setRejectError("يرجى إدخال سبب الرفض.");
      return;
    }
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-danger me-2",
        cancelButton: "btn btn-light me-2",
      },
      buttonsStyling: false,
    });
    const result = await swalWithBootstrapButtons.fire({
      title: "هل أنت متأكد من رفض هذا الطلب؟",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "رفض",
      cancelButtonText: "إلغاء",
      reverseButtons: true,
      backdrop: true,
    });
    if (!result.isConfirmed) return;
    setRejectLoading(true);
    try {
      await api.put(`/subscription-requests/${processingId}/process`, { status: "rejected", message: rejectReason });
      AlertWithSwal("success", "تم!", "تم رفض الطلب بنجاح.", "success");
      setShowRejectModal(false);
      fetchRequests();
    } catch (err) {
      AlertWithSwal("error", "خطأ!", "حدث خطأ أثناء رفض الطلب.", "danger");
    } finally {
      setRejectLoading(false);
    }
  };

  return (
    <Fragment>
      <Helmet>
        <title>طلبات الاشتراك المعلقة</title>
      </Helmet>
      <PageHeader
        homepage="الاشتراكات"
        activepage="طلبات الاشتراك المعلقة"
        page="طلبات الاشتراك المعلقة"
      />
      <Row>
        <Col xl={12}>
          <Card className="custom-card mt-3">
            <div className="row flex-wrap gx-2 gy-3 p-3 justify-content-between align-items-center">
              <Col md={4} lg={4} xl={2} xxl={1}>
                <Select
                  options={ShowPerPage}
                  placeholder={`عرض ${itemsPerPage}`}
                  classNamePrefix="Select2"
                  defaultValue={{ label: itemsPerPage, value: itemsPerPage }}
                  onChange={(e) => {
                    setItemsPerPage(e.value);
                    setActivePage(1);
                  }}
                  value={{ label: `عرض ${itemsPerPage}`, value: itemsPerPage }}
                />
              </Col>
            </div>
            <Accordion flush defaultActiveKey="0" className="accordionicon-left z-0">
              <Accordion.Item eventKey="0">
                <Accordion.Header>البحث المتقدم</Accordion.Header>
                <Accordion.Body className="p-3">
                  <div className="container-fluid">
                    <Row className="gx-3 gy-2">
                      <Col xs={12} md={4} className="mb-0">
                        <Form.Label htmlFor="package-select">الباقة</Form.Label>
                        <Select
                          options={packageOptions}
                          classNamePrefix="Select2"
                          isClearable={false}
                          id="package-select"
                          value={packageOptions.find((opt) => opt.value === pendingFilters.packageId)}
                          onChange={e => setPendingFilters(f => ({ ...f, packageId: e.value }))}
                          className="w-100"
                        />
                      </Col>
                      <Col xs={12} md={8} className="mb-0">
                        <Form.Label htmlFor="created-at-range">تاريخ الطلب</Form.Label>
                        <InputGroup>
                          <InputGroup.Text>
                            <i className="ri-calendar-line"></i>
                          </InputGroup.Text>
                          <Form.Control
                            type="date"
                            name="from"
                            placeholder="من"
                            value={pendingFilters.createdAtFrom}
                            onChange={(e) => setPendingFilters(f => ({ ...f, createdAtFrom: e.target.value }))}
                          />
                          <Form.Control
                            type="date"
                            name="to"
                            placeholder="إلى"
                            value={pendingFilters.createdAtTo}
                            onChange={(e) => setPendingFilters(f => ({ ...f, createdAtTo: e.target.value }))}
                          />
                          {(pendingFilters.createdAtFrom || pendingFilters.createdAtTo) && (
                            <button
                              className="btn btn-light z-0 border"
                              type="button"
                              onClick={() => setPendingFilters(f => ({ ...f, createdAtFrom: "", createdAtTo: "" }))}
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          )}
                        </InputGroup>
                      </Col>
                    </Row>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
            <Card.Body>
              <DataTableServer
                columns={paymentsRequestsColumns}
                data={requests}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                currentPage={activePage}
                totalPages={totalPages}
                pageName="pending_subscriptions"
                onPageChange={handlePageChange}
                dataCount={total}
                loading={loading}
                renderActions={item => (
                  <div className="d-flex gap-2">
                    {item.receipt && (
                      <OverlayTrigger placement="top" overlay={<Tooltip>عرض/تحميل الإيصال</Tooltip>}>
                        <button
                          className="btn btn-sm btn-primary-light btn-wave"
                          onClick={() => {
                            setReceiptUrl(item.receipt);
                            setShowReceiptModal(true);
                          }}
                        >
                          <i className="ri-file-download-line align-middle"></i>
                        </button>
                      </OverlayTrigger>
                    )}
                    <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-accept-${item.id}`}>قبول</Tooltip>}>
                      <button className="btn btn-sm btn-success-light btn-wave" onClick={() => handleApprove(item)}>
                        <i className="ri-check-line align-middle"></i>
                      </button>
                    </OverlayTrigger>
                    <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-reject-${item.id}`}>رفض</Tooltip>}>
                      <button className="btn btn-sm btn-danger-light btn-wave" onClick={() => handleReject(item)}>
                        <i className="ri-close-line align-middle"></i>
                      </button>
                    </OverlayTrigger>
                  </div>
                )}
              />
              {error && <div className="alert alert-danger mt-3">{error}</div>}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title as="h6">
            <div className="d-flex flex-column align-items-start gap-2">
              <span className="fw-bold fs-5 text-primary">{processingId && `#${processingId}`}</span>
              <p className="m-0 fs-12 text-muted">رفض طلب الاشتراك</p>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form className="d-flex flex-column gap-2" onSubmit={handleRejectSubmit}>
            <Row>
              <Col>
                <Form.Label htmlFor="reject-reason">
                  سبب الرفض <span className="text-danger ml-1">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  placeholder="ادخل سبب الرفض"
                  id="reject-reason"
                  style={{ maxHeight: "10rem", height: "10rem" }}
                  value={rejectReason}
                  className={rejectError ? "is-invalid" : ""}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectError) setRejectError("");
                  }}
                  autoFocus
                />
                {rejectError && (
                  <Form.Control.Feedback type="invalid">
                    {rejectError}
                  </Form.Control.Feedback>
                )}
              </Col>
            </Row>
            <Row className="g-2 mt-2">
              <Col sm={12} md={6}>
                <button
                  className="btn btn-danger fw-md w-100"
                  type="submit"
                  disabled={rejectLoading}
                >
                  {rejectLoading ? <Spinner animation="border" size="sm" /> : "رفض الطلب"}
                </button>
              </Col>
              <Col>
                <button
                  onClick={() => setShowRejectModal(false)}
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
      <Modal show={showReceiptModal} onHide={() => setShowReceiptModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>عرض الإيصال</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ minHeight: 400 }}>
          {receiptUrl.endsWith('.pdf') ? (
            <iframe
              src={receiptUrl}
              title="Receipt PDF"
              width="100%"
              height="400px"
              style={{ border: 0 }}
            />
          ) : (
            <img src={receiptUrl} alt="Receipt" style={{ maxWidth: '100%', maxHeight: 400, display: 'block', margin: '0 auto' }} />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReceiptModal(false)}>
            إغلاق
          </Button>
          <Button variant="primary" as="a" href={receiptUrl} target="_blank" rel="noopener noreferrer">
            تحميل
          </Button>
        </Modal.Footer>
      </Modal>
    </Fragment>
  );
};

export default PendingSubscriptions;
