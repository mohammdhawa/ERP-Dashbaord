import React, { Fragment, useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import {
  Loader,
  PageHeader,
  DataTable,
  PieUsersWithPackages,
  LineUsersWithPackages,
} from "../../components";
import {
  Accordion,
  Card,
  Col,
  Form,
  InputGroup,
  OverlayTrigger,
  Row,
  Tooltip,
} from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import {
  deletePackage,
  editPackage,
  fetchPackages,
} from "../../redux/actions/packageActions";
import { packagesColumns } from "../../data/Columns";
import Select from "react-select";
import { ShowPerPage } from "../../data/General";
import AddPackageModal from "./AddPackageModal";
import { AlertWithSwal } from "../../components/SwalAlerts";
import UpdatePackageModal from "./UpdatePackageModal";
import DetailPackageModal from "./DetailPackageModal";
import { NumericFormat } from "react-number-format";
import moment from "moment";
import { ProtectedElement } from "../../pages";
import Swal from "sweetalert2";

const Packages = () => {
  const [showStatistics, setShowStatistics] = useState(true);
  const { packages, fetchLoading } = useSelector((state) => state.packages);
  const [filters, setFilters] = useState({
    searchQuery: "",
    minPrice: "",
    maxPrice: "",
    minPeriod: "",
    maxPeriod: "",
    minAds: "",
    maxAds: "",
    minTotal: "",
    maxTotal: "",
    minActive: "",
    maxActive: "",
    fromDate: "",
    toDate: "",
    is_active: "",
  });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addPackageModalShow, setAddPackageModalShow] = useState(false);
  const [updatePackageModalShow, setUpdatePakageModalShow] = useState(false);
  const [willBeUpdate, setWillBeUpdate] = useState("");
  const [detailPackageModalShow, setDetailPackageModalShow] = useState(false);
  const [willBeShow, setWillBeShow] = useState("");
  const dispatch = useDispatch();
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  useEffect(() => {
    dispatch(fetchPackages());
  }, [dispatch]);

  const statistics = useMemo(() => {
    if (!packages || packages?.length === 0) {
      return {
        totalPackages: 0,
        mostUsedPackage: null,
        activePackages: 0,
        inactivePackages: 0,
      };
    }
    setStatisticsLoading(true);
    const totalPackages = packages?.length;
    const activePackages = packages?.filter(
      (pkg) => pkg.is_active === 1
    ).length;
    const inactivePackages = packages?.filter(
      (pkg) => pkg.is_active === 0
    ).length;

    const mostUsedPackage = packages?.reduce(
      (max, pkg) =>
        pkg.active_subscribers_count > (max?.active_subscribers_count || 0)
          ? pkg
          : max,
      null
    );
    setStatisticsLoading(false);
    return { totalPackages, mostUsedPackage, activePackages, inactivePackages };
  }, [packages]);
  const filteredData = useMemo(() => {
    return packages.filter((item) => {
      const matchesSearchQuery = item.name
        .toLowerCase()
        .includes(filters.searchQuery.toLowerCase());

      const matchesPrice =
        (filters.minPrice === "" || item.price >= filters.minPrice) &&
        (filters.maxPrice === "" || item.price <= filters.maxPrice);

      const matchesPeriod =
        (filters.minPeriod === "" || item.period >= filters.minPeriod) &&
        (filters.maxPeriod === "" || item.period <= filters.maxPeriod);

      const matchesAds =
        (filters.minAds === "" || item.max_of_ads >= filters.minAds) &&
        (filters.maxAds === "" || item.max_of_ads <= filters.maxAds);

      const matchesTotal =
        (filters.minTotal === "" ||
          item.total_subscribers_count >= filters.minTotal) &&
        (filters.maxTotal === "" ||
          item.total_subscribers_count <= filters.maxTotal);

      const matchesActive =
        (filters.minActive === "" ||
          item.active_subscribers_count >= filters.minActive) &&
        (filters.maxActive === "" ||
          item.active_subscribers_count <= filters.maxActive);

      const matchesFromDate =
        !filters.fromDate ||
        moment(item.created_at).tz("Europe/Istanbul").format("YYYY-MM-DD") >=
          moment(filters.fromDate).tz("Europe/Istanbul").format("YYYY-MM-DD");

      const matchesToDate =
        !filters.toDate ||
        moment(item.created_at).tz("Europe/Istanbul").format("YYYY-MM-DD") <=
          moment(filters.toDate).tz("Europe/Istanbul").format("YYYY-MM-DD");
      const matchesIsActive =
        filters.is_active === "" || item.is_active === filters.is_active;
      return (
        matchesSearchQuery &&
        matchesPrice &&
        matchesPeriod &&
        matchesAds &&
        matchesTotal &&
        matchesActive &&
        matchesFromDate &&
        matchesToDate &&
        matchesIsActive
      );
    });
  }, [packages, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [key]: value === null || value === undefined ? "" : value,
    }));
  };

  const handleUpdate = (pack) => {
    setWillBeUpdate(pack);
    setUpdatePakageModalShow(true);
  };

  const handleDetail = (pack) => {
    setWillBeShow(pack);
    setDetailPackageModalShow(true);
  };
  const handleActivatePackage = (pack) => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-2",
        cancelButton: "btn btn-light me-2",
      },
      buttonsStyling: false,
    });

    swalWithBootstrapButtons
      .fire({
        title: `هل أنت متأكد من تفعيل هذه الباقة؟`,
        text: "سيتم تفعيل الباقة!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "تفعيل",
        cancelButtonText: "إلغاء",
        reverseButtons: true,
        backdrop: true,
      })
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(
            editPackage(pack?.id, {
              ...pack,
              is_active: 1,
              name: `${pack?.id + 1}`,
            })
          );
        }
      });
  };
  const handleDisablePackage = (pack) => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-warning me-2",
        cancelButton: "btn btn-light me-2",
      },
      buttonsStyling: false,
    });

    swalWithBootstrapButtons
      .fire({
        title: `هل أنت متأكد من تعطيل هذه الباقة؟`,
        text: "ستظل الباقة موجودة ولكن سيتم تعطيلها!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "تعطيل",
        cancelButtonText: "إلغاء",
        reverseButtons: true,
        backdrop: true,
      })
      .then((result) => {
        if (result.isConfirmed) {
          dispatch(
            editPackage(pack?.id, {
              ...pack,
              is_active: 0,
              name: `${pack?.id + 1}`,
            })
          );
        }
      });
  };
  return (
    <Fragment>
      <Helmet>
        <title>Dashboard | Packages</title>
      </Helmet>
      {fetchLoading || statisticsLoading ? (
        <Loader />
      ) : (
        <Fragment>
          <PageHeader homepage="الباقات" activepage="الاشتراكات" page="الباقات">
            <button className="btn  btn-primary-transparent btn-wave">
              <i className="ri-user-star-line align-middle me-1"></i> تعيين باقة
            </button>
            <button
              onClick={() => {
                setAddPackageModalShow(true);
              }}
              className="btn btn-secondary btn-wave"
            >
              <i className="ri-add-line align-middle me-1"></i> اضافة باقة
            </button>
          </PageHeader>
          <Row>
            <Col xl={12}>
              <Card className="custom-card">
                <Card.Body className="p-0">
                  <Row className="g-0">
                    <Col xl={3} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-primary-transparent">
                            <i className="ri-instance-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">
                            {statistics.totalPackages}
                          </h5>
                          <p className="text-muted mb-0 fs-15">
                            إجمالي الباقات
                          </p>
                        </div>
                      </div>
                    </Col>
                    <Col xl={3} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-secondary-transparent">
                            <i className="ri-bar-chart-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">
                            {statistics?.mostUsedPackage?.name}
                          </h5>
                          <p className="text-muted mb-0 fs-15">
                            أكثر الباقات اشتراكًا
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
                            {statistics?.activePackages}
                          </h5>
                          <p className="text-muted mb-0 fs-15">
                            الباقات النشطة
                          </p>
                        </div>
                      </div>
                    </Col>
                    <Col xl={3}>
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-danger-transparent">
                            <i className="ri-prohibited-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <h5 className="fw-medium mb-1">
                            {statistics?.inactivePackages}
                          </h5>
                          <p className="text-muted mb-0 fs-15">
                            الباقات الغير نشطة
                          </p>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          {showStatistics && (
            <Row>
              <Col xl={8}>
                <LineUsersWithPackages />
              </Col>
              <Col xl={4}>
                <PieUsersWithPackages />
              </Col>
            </Row>
          )}
          <Row>
            <div className="w-100 text-center">
              <OverlayTrigger
                placement="bottom"
                overlay={
                  <Tooltip arrowProps={{}} className="tooltip-secondary ">
                    {showStatistics ? "إخفاء الإحصائيات" : "عرض الإحصائيات"}
                  </Tooltip>
                }
              >
                <button
                  className="btn btn-sm btn-light"
                  onClick={() => {
                    setShowStatistics(!showStatistics);
                  }}
                >
                  <i
                    className={`ri-arrow-${
                      !showStatistics ? "down" : "up"
                    }-wide-line`}
                  />
                </button>
              </OverlayTrigger>
            </div>
          </Row>
          <Row>
            <Card className="custom-card mt-3">
              <div className="row flex-wrap gx-2 gy-3 p-3 justify-content-between align-items-center">
                <Col md={8} lg={8} xl={3} xxl={2}>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="ابحث.."
                    onChange={(e) =>
                      handleFilterChange("searchQuery", e.target.value)
                    }
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
                              <Form.Label htmlFor="is_active">
                                حالة الباقة
                              </Form.Label>

                              <Select
                                options={[
                                  { label: "نشطة", value: 1 },
                                  { label: "خامدة", value: 0 },
                                ]}
                                placeholder="اختر الحالة"
                                aria-label="حالة الباقة"
                                classNamePrefix="Select2"
                                value={
                                  filters.is_active !== ""
                                    ? {
                                        label:
                                          filters.is_active === 1
                                            ? "نشطة"
                                            : "خامدة",
                                        value: filters.is_active,
                                      }
                                    : null
                                }
                                onChange={(selectedOption) =>
                                  handleFilterChange(
                                    "is_active",
                                    selectedOption ? selectedOption.value : ""
                                  )
                                }
                                isClearable
                              />
                            </Col>
                            <Col md={12} lg={6} xxl={3}>
                              <Form.Label htmlFor="price">
                                سعر الباقة
                              </Form.Label>
                              <InputGroup>
                                <InputGroup.Text>
                                  <i className="ri-cash-line"></i>
                                </InputGroup.Text>
                                <NumericFormat
                                  allowNegative={false}
                                  allowLeadingZeros
                                  className={`form-control`}
                                  id="price"
                                  placeholder="أدنى"
                                  value={filters.minPrice}
                                  onValueChange={(values) =>
                                    handleFilterChange(
                                      "minPrice",
                                      values.floatValue
                                    )
                                  }
                                />

                                <NumericFormat
                                  allowNegative={false}
                                  allowLeadingZeros
                                  className={`form-control`}
                                  id="price"
                                  placeholder="أقصى"
                                  value={filters.maxPrice}
                                  onValueChange={(values) =>
                                    handleFilterChange(
                                      "maxPrice",
                                      values.floatValue
                                    )
                                  }
                                />
                                <button
                                  className="btn btn-light z-0 border"
                                  onClick={() => {
                                    handleFilterChange("minPrice", "");
                                    handleFilterChange("maxPrice", "");
                                  }}
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              </InputGroup>
                            </Col>

                            <Col md={12} lg={6} xxl={3}>
                              <Form.Label htmlFor="period">
                                مدة الباقة (يوم)
                              </Form.Label>
                              <InputGroup>
                                <InputGroup.Text>
                                  <i className="ri-time-line"></i>
                                </InputGroup.Text>
                                <NumericFormat
                                  allowNegative={false}
                                  allowLeadingZeros
                                  className={`form-control`}
                                  id="period"
                                  placeholder="أدنى"
                                  value={filters.minPeriod}
                                  onValueChange={(values) =>
                                    handleFilterChange(
                                      "minPeriod",
                                      values.floatValue
                                    )
                                  }
                                />

                                <NumericFormat
                                  allowNegative={false}
                                  allowLeadingZeros
                                  className={`form-control`}
                                  id="period"
                                  placeholder="أقصى"
                                  value={filters.maxPeriod}
                                  onValueChange={(values) =>
                                    handleFilterChange(
                                      "maxPeriod",
                                      values.floatValue
                                    )
                                  }
                                />
                                <button
                                  className="btn btn-light z-0 border"
                                  onClick={() => {
                                    handleFilterChange("minPeriod", "");
                                    handleFilterChange("maxPeriod", "");
                                  }}
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              </InputGroup>
                            </Col>
                            <Col md={12} lg={6} xxl={3}>
                              <Form.Label htmlFor="adscount">
                                الإعلانات المسموحة
                              </Form.Label>
                              <InputGroup>
                                <InputGroup.Text>
                                  <i className="ri-megaphone-line"></i>
                                </InputGroup.Text>
                                <NumericFormat
                                  allowNegative={false}
                                  allowLeadingZeros
                                  className={`form-control`}
                                  id="adscount"
                                  placeholder="أدنى"
                                  value={filters.minAds}
                                  onValueChange={(values) =>
                                    handleFilterChange(
                                      "minAds",
                                      values.floatValue
                                    )
                                  }
                                />

                                <NumericFormat
                                  allowNegative={false}
                                  allowLeadingZeros
                                  className={`form-control`}
                                  id="adscount"
                                  placeholder="أقصى"
                                  value={filters.maxAds}
                                  onValueChange={(values) =>
                                    handleFilterChange(
                                      "maxAds",
                                      values.floatValue
                                    )
                                  }
                                />
                                <button
                                  className="btn btn-light z-0 border"
                                  onClick={() => {
                                    handleFilterChange("minAds", "");
                                    handleFilterChange("maxAds", "");
                                  }}
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              </InputGroup>
                            </Col>
                            <Col md={12} lg={6} xxl={3}>
                              <Form.Label htmlFor="totalUser">
                                إجمالي المشتركين
                              </Form.Label>
                              <InputGroup>
                                <InputGroup.Text>
                                  <i className="ri-time-line"></i>
                                </InputGroup.Text>
                                <NumericFormat
                                  allowNegative={false}
                                  allowLeadingZeros
                                  className={`form-control`}
                                  id="totalUser"
                                  placeholder="أدنى"
                                  value={filters.minTotal}
                                  onValueChange={(values) =>
                                    handleFilterChange(
                                      "minTotal",
                                      values.floatValue
                                    )
                                  }
                                />

                                <NumericFormat
                                  allowNegative={false}
                                  allowLeadingZeros
                                  className={`form-control`}
                                  id="totalUser"
                                  placeholder="أقصى"
                                  value={filters.maxTotal}
                                  onValueChange={(values) =>
                                    handleFilterChange(
                                      "maxTotal",
                                      values.floatValue
                                    )
                                  }
                                />
                                <button
                                  className="btn btn-light z-0 border"
                                  onClick={() => {
                                    handleFilterChange("minTotal", "");
                                    handleFilterChange("maxTotal", "");
                                  }}
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              </InputGroup>
                            </Col>
                            <Col md={12} lg={6} xxl={3}>
                              <Form.Label htmlFor="activeUser">
                                المشتركين النشطين
                              </Form.Label>
                              <InputGroup>
                                <InputGroup.Text>
                                  <i className="ri-time-line"></i>
                                </InputGroup.Text>
                                <NumericFormat
                                  allowNegative={false}
                                  allowLeadingZeros
                                  className={`form-control`}
                                  id="activeUser"
                                  placeholder="أدنى"
                                  value={filters.minActive}
                                  onValueChange={(values) =>
                                    handleFilterChange(
                                      "minActive",
                                      values.floatValue
                                    )
                                  }
                                />

                                <NumericFormat
                                  allowNegative={false}
                                  allowLeadingZeros
                                  className={`form-control`}
                                  id="activeUser"
                                  placeholder="أقصى"
                                  value={filters.maxActive}
                                  onValueChange={(values) =>
                                    handleFilterChange(
                                      "maxActive",
                                      values.floatValue
                                    )
                                  }
                                />
                                <button
                                  className="btn btn-light z-0 border"
                                  onClick={() => {
                                    handleFilterChange("minActive", "");
                                    handleFilterChange("maxActive", "");
                                  }}
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              </InputGroup>
                            </Col>
                            <Col md={12} lg={6} xxl={3}>
                              <Form.Label htmlFor="from">
                                تاريخ الإنشاء
                              </Form.Label>
                              <InputGroup>
                                <InputGroup.Text>
                                  <i className="ri-calendar-line"></i>
                                </InputGroup.Text>
                                <Form.Control
                                  type="date"
                                  name="from"
                                  placeholder="من"
                                  value={filters.fromDate}
                                  onChange={(e) =>
                                    handleFilterChange(
                                      "fromDate",
                                      e.target.value
                                    )
                                  }
                                />
                                <Form.Control
                                  type="date"
                                  name="to"
                                  placeholder="إلى"
                                  value={filters.toDate}
                                  onChange={(e) =>
                                    handleFilterChange("toDate", e.target.value)
                                  }
                                />
                                <button
                                  className="btn btn-light z-0 border"
                                  onClick={() => {
                                    handleFilterChange("fromDate", "");
                                    handleFilterChange("toDate", "");
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
                  columns={packagesColumns}
                  data={filteredData}
                  itemsPerPage={itemsPerPage}
                  dele
                  pageName={"package"}
                  functions={{
                    handleUpdate: handleUpdate,
                    handleDetail: handleDetail,
                  }}
                  renderActions={(item) =>
                    item?.is_active === 1 ? (
                      <ProtectedElement
                        element={
                          <OverlayTrigger
                            placement={"top"}
                            overlay={
                              <Tooltip id="tooltip-top">إيقاف الباقة</Tooltip>
                            }
                          >
                            <button
                              onClick={() => {
                                handleDisablePackage(item);
                              }}
                              className="btn btn-sm btn-danger-light btn-wave"
                            >
                              <i className="ri-shut-down-line align-middle"></i>
                            </button>
                          </OverlayTrigger>
                        }
                        requiredPermissions={[`package_status_change`]}
                      />
                    ) : (
                      <ProtectedElement
                        element={
                          <OverlayTrigger
                            placement={"top"}
                            overlay={
                              <Tooltip id="tooltip-top">تفعيل الباقة</Tooltip>
                            }
                          >
                            <button
                              onClick={() => {
                                handleActivatePackage(item);
                              }}
                              className="btn btn-sm btn-primary-light btn-wave"
                            >
                              <i className="ri-flashlight-line align-middle"></i>
                            </button>
                          </OverlayTrigger>
                        }
                        requiredPermissions={[`package_status_change`]}
                      />
                    )
                  }
                />
              </Card.Body>
            </Card>
          </Row>
        </Fragment>
      )}
      <AddPackageModal
        open={addPackageModalShow}
        close={() => {
          setAddPackageModalShow(false);
        }}
      />
      <UpdatePackageModal
        open={updatePackageModalShow}
        close={() => {
          setUpdatePakageModalShow(false);
        }}
        pack={willBeUpdate}
      />
      <DetailPackageModal
        open={detailPackageModalShow}
        close={() => {
          setDetailPackageModalShow(false);
        }}
        pack={willBeShow}
      />
    </Fragment>
  );
};

export default Packages;
