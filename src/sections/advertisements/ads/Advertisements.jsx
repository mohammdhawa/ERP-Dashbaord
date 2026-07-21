import React, {
  Fragment,
  useEffect,
  useState,
  lazy,
  Suspense,
  useCallback,
} from "react";
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
  adActiveStatus,
  adStatus,
  cities,
  ShowPerPage,
  adTypes,
} from "../../../data/General";
import { ProtectedElement } from "../../../pages";

const ProcessAdModal = lazy(() => import("./ProcessAdModal"));

const Advertisements = () => {
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
  const [selectedAdsStatus, setSelectedAdsStatus] = useState("");
  const [selectedActiveStatus, setSelectedActiveStatus] = useState("");
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
        selectedAdsStatus?.value,
        selectedActiveStatus?.value,
        selectedCity?.value,
        selectedCategory?.value
      )
    );
  }, [
    dispatch,
    activePage,
    itemsPerPage,
    debouncedSearchQuery,
    selectedAdsStatus,
    selectedActiveStatus,
    selectedCity,
    selectedCategory,
  ]);
  useEffect(() => {
    setActivePage(1);
  }, [
    debouncedSearchQuery,
    selectedAdsStatus,
    selectedActiveStatus,
    selectedCity,
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
        <title>Dashboard | Advertisements</title>
      </Helmet>

      <Fragment>
        <PageHeader
          homepage="لائحة الإعلانات"
          activepage="الإعلانات"
          page="لائحة الإعلانات"
        />
        <Row className="gx-2 gy-2 align-items-end mb-3">
          <Col md={3} lg={2} xl={2} xxl={2}>
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
          <Col md={2} lg={2} xl={1} xxl={1}>
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
        </Row>
        <Row className="gx-2 gy-2 align-items-end mb-3">
          <Col md={3} lg={3} xl={3} xxl={3}>
            <Select
              options={adStatus}
              classNamePrefix="Select2"
              isClearable
              isSearchable
              id="ads-status-select"
              placeholder="اختر حالة الإعلان"
              value={selectedAdsStatus}
              onChange={setSelectedAdsStatus}
            />
          </Col>
          <Col md={3} lg={3} xl={3} xxl={3}>
            <Select
              options={adActiveStatus}
              classNamePrefix="Select2"
              isClearable
              isSearchable
              id="ads-active-status-select"
              placeholder="اختر حالة النشاط"
              value={selectedActiveStatus}
              onChange={setSelectedActiveStatus}
            />
          </Col>
          <Col md={3} lg={3} xl={3} xxl={3}>
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
          <Col md={3} lg={3} xl={3} xxl={3}>
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
        <Card className="custom-card mt-3">
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

export default Advertisements;
