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
} from "react-bootstrap";
import { PageHeader } from "../../../components";
import { adsColumns } from "../../../data/Columns";
import DataTableServer from "../../../components/DataTableServer";
import {
  deleteAdvertisement,
  fetchAdvertisements,
} from "../../../redux/actions/advertisementActions";
import Select from "react-select";
import {
  cities,
  ShowPerPage,
  adTypes,
} from "../../../data/General";
import { ProtectedElement } from "../../../pages";

const ProcessAdModal = lazy(() => import("../ads/ProcessAdModal"));

const InfringingAds = () => {
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
        "rejected",
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
  ]);

  useEffect(() => {
    setActivePage(1);
  }, [debouncedSearchQuery, selectedCity, selectedCategory]);

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
        <title>Dashboard | Infringing Advertisements</title>
      </Helmet>

      <Fragment>
        <PageHeader
          homepage="لائحة الإعلانات"
          activepage="الإعلانات المخالفة"
          page="لائحة الإعلانات المخالفة"
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
                    item.ads_status === "pending" ? (
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
                    ) : null
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
    </Fragment>
  );
};

export default InfringingAds;
