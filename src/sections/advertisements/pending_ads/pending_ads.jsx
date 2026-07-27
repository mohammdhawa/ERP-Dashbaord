import { Fragment, useEffect, useState, lazy, Suspense, useCallback } from "react";
import { Helmet } from "react-helmet";
import { useDispatch, useSelector } from "react-redux";
import {
  Accordion,
  Card,
  Col,
  Form,
  OverlayTrigger,
  Row,
  Tooltip,
  Modal,
  Button,
} from "react-bootstrap";
import { PageHeader } from "../../../components";
import { adsColumns } from "../../../data/Columns";
import DataTableServer from "../../../components/DataTableServer";
import {
  deleteAdvertisement,
  fetchAdvertisements,
} from "../../../redux/actions/advertisementActions";
import Select from "react-select";
import { cities, ShowPerPage, adTypes } from "../../../data/General";
import { ProtectedElement } from "../../../pages";

const ProcessAdModal = lazy(() => import("../ads/ProcessAdModal"));

const PendingAds = () => {
  const dispatch = useDispatch();
  const { fetchAdsLoading, advertisements, totalPages, total } = useSelector(
    (state) => state.advertisements
  );

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activePage, setActivePage] = useState(1);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [willBeProcessed, setWillBeProcessed] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedActiveStatus] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const handleSearchChange = useCallback(
    debounce((value) => {
      setDebouncedSearchQuery(value);
      setActivePage(1);
    }, 500),
    []
  );

  useEffect(() => {
    handleSearchChange(searchQuery);
  }, [searchQuery, handleSearchChange]);

  useEffect(() => {
    dispatch(
      fetchAdvertisements(
        activePage,
        itemsPerPage,
        debouncedSearchQuery,
        "pending",
        selectedActiveStatus,
        selectedCity?.value,
        selectedCategory?.value
      )
    );
  }, [
    dispatch,
    activePage,
    itemsPerPage,
    debouncedSearchQuery,
    selectedCity,
    selectedCategory,
    selectedActiveStatus,
  ]);

  useEffect(() => {
    setActivePage(1);
  }, [
    debouncedSearchQuery,
    selectedCity,
    selectedCategory,
  ]);

  const handleDetail = (ad) =>
    window.open(`advertisements/ad/${ad.id}`, "_blank");
  const handleDelete = (id) => dispatch(deleteAdvertisement(id));
  const handleProcess = (ad) => {
    setWillBeProcessed(ad);
    setShowProcessModal(true);
  };
  const handlePageChange = (page) => setActivePage(page);

  return (
    <Fragment>
      <Helmet>
        <title>Dashboard | Pending Advertisements</title>
      </Helmet>

      <Fragment>
        <PageHeader
          homepage="لائحة الإعلانات"
          activepage="الإعلانات المعلّقة"
          page="لائحة الإعلانات المعلّقة"
        />
        <Row>
          <Col xl={12}>
            <Card className="custom-card mt-3">
              <div className="row flex-wrap gx-2 gy-3 p-3 justify-content-between align-items-center">
                <Col md={8} lg={8} xl={3} xxl={2}>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="ابحث.."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                  />
                </Col>
                <Col md={4} lg={4} xl={2} xxl={1}>
                  <Select
                    options={ShowPerPage}
                    placeholder={`عرض ${itemsPerPage}`}
                    classNamePrefix="Select2"
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
                </Col>
                <Col sm={12}>
                  <Accordion
                    flush
                    defaultActiveKey={"0"}
                    className="accordionicon-left z-0"
                  >
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>البحث المتقدم</Accordion.Header>
                      <Accordion.Body className="px-0">
                        <div>
                          <Row className="gy-3 gx-2">
                            <Col md={12} lg={6} xxl={4}>
                              <Form.Label htmlFor="city-select">
                                المحافظة
                              </Form.Label>
                              <Select
                                options={cities}
                                classNamePrefix="Select2"
                                isClearable
                                isSearchable
                                id="city-select"
                                placeholder="اختر المحافظة"
                                value={selectedCity}
                                onChange={setSelectedCity}
                              />
                            </Col>
                            <Col md={12} lg={6} xxl={4}>
                              <Form.Label htmlFor="category-select">
                                الفئة
                              </Form.Label>
                              <Select
                                options={adTypes}
                                classNamePrefix="Select2"
                                isClearable
                                isSearchable
                                id="category-select"
                                placeholder="اختر الفئة"
                                value={selectedCategory}
                                onChange={setSelectedCategory}
                              />
                            </Col>
                          </Row>
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </Col>
              </div>
              <Card.Body>
                <DataTableServer
                  columns={adsColumns}
                  data={advertisements}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  currentPage={activePage}
                  totalPages={totalPages}
                  pageName="ad"
                  onPageChange={handlePageChange}
                  functions={{
                    handleDelete,
                    handleDetail,
                  }}
                  dataCount={total}
                  loading={fetchAdsLoading}
                  renderActions={(item) => (
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
                      {item.ads_status === "pending" && (
                        <ProtectedElement
                          element={
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>تعديل حالة الإعلان</Tooltip>}
                            >
                              <button
                                onClick={() => handleProcess(item)}
                                className="btn btn-sm btn-secondary-light btn-wave"
                              >
                                <i className="ri-equalizer-2-line align-middle"></i>
                              </button>
                            </OverlayTrigger>
                          }
                          requiredPermissions={["process_ad"]}
                        />
                      )}
                    </div>
                  )}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Fragment>
      <Suspense fallback={<div>Loading...</div>}>
        <ProcessAdModal
          open={showProcessModal}
          close={() => setShowProcessModal(false)}
          adData={willBeProcessed}
        />
      </Suspense>
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

export default PendingAds;
