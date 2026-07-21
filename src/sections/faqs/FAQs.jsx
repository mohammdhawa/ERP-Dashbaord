import React, {
  Fragment,
  useEffect,
  useMemo,
  useState,
  Suspense,
  lazy,
} from "react";
import { Helmet } from "react-helmet";
import {
  DataTable,
  Loader,
  PageHeader,
} from "../../components";
import { useDispatch, useSelector } from "react-redux";
import { deleteFaq, fetchFaqs } from "../../redux/actions/faqActions";
import { faqsColumns } from "../../data/Columns";
import {
  Card,
  Col,
  Row,
  Form,
  Accordion,
  InputGroup,
} from "react-bootstrap";
import Select from "react-select";
import moment from "moment";
import { ShowPerPage, faqCategories, faqsPriority } from "../../data/General";
import ProtectedElement from "../../pages/layout/ProtectedElement";

const AddFaqModal = lazy(() => import("./AddFaqModal"));
const EditFaqModal = lazy(() => import("./EditFaqModal"));
const DetailFaqModal = lazy(() => import("./DetailFaqModal"));
const FAQs = () => {
  const { fetchFaqLoading, faqs } = useSelector((state) => state.faqs);
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState([]);
  const [addFaqModalShow, setAddFaqModalShow] = useState(false);
  const [updateFaqModalShow, setUpdateFaqModalShow] = useState(false);
  const [willBeUpdate, setWillBeUpdate] = useState("");
  const [detailFaqModalShow, setDetailFaqModalShow] = useState(false);
  const [willBeShow, setWillBeShow] = useState("");
  useEffect(() => {
    dispatch(fetchFaqs());
  }, [dispatch]);

  useEffect(() => {
    setFilteredData(faqs);
  }, [faqs]);

  useEffect(() => {
    let filtered = faqs;
    if (searchQuery || dateRange.from || dateRange.to) {
      filtered = filtered.filter((faq) => {
        const faqTitle = faq.question.toLowerCase();
        const faqAnswer = faq.answer.toLowerCase();
        const faqCreatedAt = moment(faq.created_at)
          .tz("Europe/Istanbul")
          .format("YYYY-MM-DD");
        const fromDate = moment(dateRange.from)
          .tz("Europe/Istanbul")
          .format("YYYY-MM-DD");
        const toDate = moment(dateRange.to)
          .tz("Europe/Istanbul")
          .format("YYYY-MM-DD");
        const isInDateRange =
          (!dateRange.from || faqCreatedAt >= fromDate) &&
          (!dateRange.to || faqCreatedAt <= toDate);
        return (
          (faqAnswer.includes(searchQuery.toLowerCase()) ||
            faqTitle.includes(searchQuery.toLowerCase())) &&
          isInDateRange
        );
      });
    }

    if (selectedCategory && selectedCategory.length > 0) {
      filtered = filtered.filter((faq) =>
        selectedCategory.some((category) => category.value === faq.category)
      );
    }

    if (selectedPriority && selectedPriority.length > 0) {
      filtered = filtered.filter((faq) =>
        selectedPriority.some((priority) => priority.value === faq.priority)
      );
    }
    setFilteredData(filtered);
  }, [searchQuery, dateRange, faqs, selectedCategory, selectedPriority]);

  const handleSearch = (e) => setSearchQuery(e.target.value);
  const handleDateChange = (e) => {
    setDateRange((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCategoryChange = (selectedOptions) => {
    if (!selectedOptions) {
      setSelectedCategory(null);
      return;
    }
    setSelectedCategory(selectedOptions);
  };
  const handlePriorityChange = (selectedOptions) => {
    setSelectedPriority(selectedOptions);
  };

  const calculateCategoryFrequency = () => {
    const categoryCount = {};
    faqs.forEach((faq) => {
      const category = faq.category;
      if (categoryCount[category]) {
        categoryCount[category] += 1;
      } else {
        categoryCount[category] = 1;
      }
    });
    return categoryCount;
  };

  const categoryFrequency = useMemo(() => calculateCategoryFrequency(), [faqs]);

  const mostUsedCategory = useMemo(() => {
    if (Object.keys(categoryFrequency).length > 0) {
      return Object.keys(categoryFrequency).reduce((a, b) =>
        categoryFrequency[a] > categoryFrequency[b] ? a : b
      );
    }
    return null;
  }, [categoryFrequency]);

  const matchedCategory = useMemo(() => {
    if (mostUsedCategory) {
      return faqCategories.find(
        (category) => category.value === mostUsedCategory
      );
    }
    return null;
  }, [mostUsedCategory]);

  const activeQuestionsCount = useMemo(() => {
    return faqs.filter((faq) => faq.status === 1).length;
  }, [faqs]);
  const unActiveQuestionsCount = useMemo(() => {
    return faqs.filter((faq) => faq.status === 0).length;
  }, [faqs]);

  function handleDelete(id) {
    dispatch(deleteFaq(id));
  }
  const handleUpdate = (faq) => {
    setWillBeUpdate(faq);
    setUpdateFaqModalShow(true);
  };
  const handleDetail = (faq) => {
    setWillBeShow(faq);
    setDetailFaqModalShow(true);
  };
  return (
    <Fragment>
      <Helmet>
        <title>Dashboard | FAQs</title>
      </Helmet>
      {fetchFaqLoading ? (
        <Loader />
      ) : (
        <Fragment>
          <PageHeader
            homepage="الاسئلة الشائعة"
            activepage="خدمة العملاء"
            page="الاسئلة الشائعة"
          >
            <ProtectedElement
              element={
                <button
                  onClick={() => {
                    setAddFaqModalShow(true);
                  }}
                  className="btn btn-secondary  btn-wave"
                >
                  <i className="ri-add-line align-middle me-1"></i> اضافة سؤال
                </button>
              }
              requiredPermissions={["create_faq"]}
            />
          </PageHeader>
          <Row>
            <Col xl={12}>
              <Card className="custom-card">
                <Card.Body className="p-0">
                  <Row className="g-0">
                    <Col xl={3} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-secondary-transparent">
                            <i className="ri-question-answer-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">{faqs?.length}</h5>
                          <p className="text-muted mb-0 fs-15">
                            إجمالي الاسئلة
                          </p>
                        </div>
                      </div>
                    </Col>
                    <Col xl={3} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-success-transparent">
                            <i className="ri-flashlight-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">
                            {activeQuestionsCount}
                          </h5>
                          <p className="text-muted mb-0 fs-15">
                            الاسئلة النشطة
                          </p>
                        </div>
                      </div>
                    </Col>
                    <Col xl={3} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-info-transparent">
                            <i className="ri-shining-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">
                            {matchedCategory?.label}
                          </h5>
                          <p className="text-muted mb-0 fs-15">
                            الفئة الاكثر استخداماً
                          </p>
                        </div>
                      </div>
                    </Col>
                    <Col xl={3} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-danger-transparent">
                            <i className="ri-prohibited-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">
                            {unActiveQuestionsCount}
                          </h5>
                          <p className="text-muted mb-0 fs-15">
                            الاسئلة الغير نشطة
                          </p>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="custom-card mt-3">
                <div className="row flex-wrap gx-2 gy-3 p-3 justify-content-between align-items-center">
                  <Col md={8} lg={8} xl={3} xxl={2}>
                    <input
                      className="form-control"
                      type="text"
                      placeholder="ابحث.."
                      onChange={handleSearch}
                    />
                  </Col>
                  <Col md={4} lg={4} xl={2} xxl={1}>
                    <Select
                      options={ShowPerPage}
                      placeholder={`عرض ${itemsPerPage}`}
                      aria-label="Show Per Page"
                      classNamePrefix="Select2"
                      className=""
                      defaultValue={{
                        label: itemsPerPage,
                        value: itemsPerPage,
                      }}
                      onChange={(e) => setItemsPerPage(e.value)}
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
                              <Col md={12} lg={6} xxl={3}>
                                <Form.Label>الأولوية</Form.Label>
                                <Select
                                  options={faqsPriority}
                                  placeholder="اختر الأولوية"
                                  aria-label="Priority Filter"
                                  classNamePrefix="Select2"
                                  onChange={handlePriorityChange}
                                  value={selectedPriority}
                                  isClearable
                                  isMulti
                                />
                              </Col>
                              <Col md={12} lg={6} xxl={3}>
                                <Form.Label>الفئة</Form.Label>
                                <Select
                                  options={faqCategories}
                                  placeholder="اختر الفئة"
                                  aria-label="Category Filter"
                                  classNamePrefix="Select2"
                                  onChange={handleCategoryChange}
                                  value={selectedCategory}
                                  isClearable
                                  isMulti
                                />
                              </Col>
                              <Col md={12} lg={6} xxl={3}>
                                <Form.Label htmlFor="from">
                                  تاريخ الإنشاء
                                </Form.Label>
                                <InputGroup >
                                  <InputGroup.Text>
                                    <i className="ri-calendar-line"></i>
                                  </InputGroup.Text>
                                  <Form.Control
                                    type="date"
                                    name="from"
                                    placeholder="من"
                                    value={dateRange.from}
                                    onChange={handleDateChange}
                                  />
                                  <Form.Control
                                    type="date"
                                    name="to"
                                    placeholder="إلى"
                                    value={dateRange.to}
                                    onChange={handleDateChange}
                                  />
                                  <button
                                    className="btn btn-light z-0 border"
                                    onClick={() => {
                                      setDateRange({ from: "", to: "" });
                                    }}
                                  >
                                    <i className="ri-close-line"></i>
                                  </button>
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
                  <DataTable
                    columns={faqsColumns}
                    data={filteredData}
                    itemsPerPage={itemsPerPage}
                    pageName={"faq"}
                    functions={{
                      handleDelete: handleDelete,
                      handleUpdate: handleUpdate,
                      handleDetail: handleDetail,
                    }}
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Fragment>
      )}
      <Suspense fallback={<div>Loading...</div>}>
        <AddFaqModal
          open={addFaqModalShow}
          close={() => {
            setAddFaqModalShow(false);
          }}
        />
        <EditFaqModal
          open={updateFaqModalShow}
          close={() => {
            setUpdateFaqModalShow(false);
          }}
          faq={willBeUpdate}
        />
        <DetailFaqModal
          open={detailFaqModalShow}
          close={() => {
            setDetailFaqModalShow(false);
          }}
          faq={willBeShow}
        />
      </Suspense>
    </Fragment>
  );
};

export default FAQs;
