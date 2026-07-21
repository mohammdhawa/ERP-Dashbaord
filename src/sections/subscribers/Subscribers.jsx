import { Fragment, useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet";
import { useDispatch, useSelector } from "react-redux";
import { Card, Col, Row, Accordion, Form, InputGroup } from "react-bootstrap";
import { PageHeader } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import { fetchSubscriptions } from "../../redux/actions/subscriptionActions";
import Select from "react-select";
import { ShowPerPage } from "../../data/General";
import { subscribersColumns } from "../../data/Columns";
import SubscriptionDetailModal from "./SubscriptionDetailModal";
import api from "../../redux/api";

const Subscribers = () => {
  const dispatch = useDispatch();
  const { fetchSubscriptionsLoading, subscriptions, totalPages, total } =
    useSelector((state) => state.subscriptions);

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activePage, setActivePage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingFilters, setPendingFilters] = useState({
    userEmail: "",
    isActive: "",
    expiryDateFrom: "",
    expiryDateTo: "",
    selectedPackageType: null,
  });

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const [debouncedFilters, setDebouncedFilters] = useState(pendingFilters);

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

  useEffect(() => {
    dispatch(
      fetchSubscriptions(
        activePage,
        itemsPerPage,
        searchQuery,
        "",
        "",
        debouncedFilters.selectedPackageType?.value,
        debouncedFilters.userEmail,
        debouncedFilters.expiryDateFrom,
        debouncedFilters.expiryDateTo,
        debouncedFilters.isActive
      )
    );
  }, [dispatch, activePage, itemsPerPage, searchQuery, debouncedFilters]);

  useEffect(() => {
    setActivePage(1);
  }, [
    searchQuery,
    pendingFilters.selectedPackageType,
    pendingFilters.userEmail,
    pendingFilters.expiryDateFrom,
    pendingFilters.expiryDateTo,
    pendingFilters.isActive,
  ]);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleDetail = async (subscription) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res = await api.get(`/subscriptions/${subscription.id}`);
      setSelectedSubscription(res.data.data || res.data);
    } catch (e) {
      setSelectedSubscription({ error: "حدث خطأ أثناء جلب التفاصيل" });
    }
    setDetailLoading(false);
  };

  const handlePageChange = (page) => setActivePage(page);

  return (
    <Fragment>
      <Helmet>
        <title>Dashboard | المشتركين</title>
      </Helmet>

      <Fragment>
        <PageHeader
          homepage="المشتركين"
          activepage="المشتركين"
          page="لائحة المشتركين"
        />
        <Row>
          <Col xl={12}>
            <Card className="custom-card mt-3">
              <div className="row flex-wrap gx-2 gy-3 p-3 justify-content-between align-items-center">
                <Col md={8} lg={8} xl={3} xxl={2}>
                  <InputGroup>
                    <Form.Control
                      className="form-control"
                      type="text"
                      placeholder="ابحث.."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                    />
                    {searchQuery && (
                      <button
                        className="btn btn-light z-0 border"
                        type="button"
                        onClick={() => setSearchQuery("")}
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    )}
                  </InputGroup>
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
                    defaultActiveKey="0"
                    className="accordionicon-left z-0"
                  >
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>البحث المتقدم</Accordion.Header>
                      <Accordion.Body className="px-0">
                        <div>
                          <Row className="gy-3 gx-2">
                            <Col md={12} lg={6} xxl={4}>
                              <Form.Label htmlFor="user-email">
                                البريد الإلكتروني للمستخدم
                              </Form.Label>
                              <InputGroup>
                                <Form.Control
                                  type="email"
                                  id="user-email"
                                  placeholder="البريد الإلكتروني للمستخدم"
                                  value={pendingFilters.userEmail}
                                  onChange={(e) =>
                                    setPendingFilters((f) => ({
                                      ...f,
                                      userEmail: e.target.value,
                                    }))
                                  }
                                />
                                {pendingFilters.userEmail && (
                                  <button
                                    className="btn btn-light z-0 border"
                                    type="button"
                                    onClick={() =>
                                      setPendingFilters((f) => ({
                                        ...f,
                                        userEmail: "",
                                      }))
                                    }
                                  >
                                    <i className="ri-close-line"></i>
                                  </button>
                                )}
                              </InputGroup>
                            </Col>
                            <Col md={12} lg={6} xxl={4}>
                              <Form.Label htmlFor="expiry-date-range">
                                تاريخ نهاية الاشتراك
                              </Form.Label>
                              <InputGroup>
                                <InputGroup.Text>
                                  <i className="ri-calendar-line"></i>
                                </InputGroup.Text>
                                <Form.Control
                                  type="date"
                                  name="from"
                                  placeholder="من"
                                  value={pendingFilters.expiryDateFrom}
                                  onChange={(e) =>
                                    setPendingFilters((f) => ({
                                      ...f,
                                      expiryDateFrom: e.target.value,
                                    }))
                                  }
                                />
                                <Form.Control
                                  type="date"
                                  name="to"
                                  placeholder="إلى"
                                  value={pendingFilters.expiryDateTo}
                                  onChange={(e) =>
                                    setPendingFilters((f) => ({
                                      ...f,
                                      expiryDateTo: e.target.value,
                                    }))
                                  }
                                />
                                {(pendingFilters.expiryDateFrom ||
                                  pendingFilters.expiryDateTo) && (
                                  <button
                                    className="btn btn-light z-0 border"
                                    type="button"
                                    onClick={() =>
                                      setPendingFilters((f) => ({
                                        ...f,
                                        expiryDateFrom: "",
                                        expiryDateTo: "",
                                      }))
                                    }
                                  >
                                    <i className="ri-close-line"></i>
                                  </button>
                                )}
                              </InputGroup>
                            </Col>
                            <Col md={12} lg={6} xxl={4}>
                              <Form.Label htmlFor="is-active-select">
                                حالة الاشتراك
                              </Form.Label>
                              <InputGroup>
                                <Select
                                  options={[
                                    { value: "", label: "كل الحالات" },
                                    { value: "1", label: "نشط" },
                                    { value: "0", label: "غير نشط" },
                                  ]}
                                  placeholder="حالة الاشتراك"
                                  classNamePrefix="Select2"
                                  isClearable={true}
                                  id="is-active-select"
                                  value={
                                    [
                                      { value: "", label: "كل الحالات" },
                                      { value: "1", label: "نشط" },
                                      { value: "0", label: "غير نشط" },
                                    ].find(
                                      (opt) =>
                                        opt.value === pendingFilters.isActive
                                    ) || null
                                  }
                                  onChange={(e) =>
                                    setPendingFilters((f) => ({
                                      ...f,
                                      isActive: e ? e.value : "",
                                    }))
                                  }
                                  className="w-100"
                                />
                                {pendingFilters.isActive && (
                                  <button
                                    className="btn btn-light z-0 border"
                                    type="button"
                                    onClick={() =>
                                      setPendingFilters((f) => ({
                                        ...f,
                                        isActive: "",
                                      }))
                                    }
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
                </Col>
              </div>
              <Card.Body>
                <DataTableServer
                  columns={subscribersColumns}
                  data={subscriptions}
                  currentPage={activePage}
                  totalPages={totalPages}
                  pageName="subscription"
                  onPageChange={handlePageChange}
                  functions={{
                    handleDetail,
                  }}
                  dataCount={total}
                  loading={fetchSubscriptionsLoading}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Fragment>
      <SubscriptionDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        subscription={selectedSubscription}
        loading={detailLoading}
      />
    </Fragment>
  );
};

export default Subscribers;
