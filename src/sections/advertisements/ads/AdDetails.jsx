import React, { Fragment, Suspense, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../redux/api";
import { Loader, PageHeader } from "../../../components";
import { Helmet } from "react-helmet";
import {
  Card,
  Col,
  ListGroup,
  ListGroupItem,
  Row,
  Spinner,
} from "react-bootstrap";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Navigation, Pagination, Thumbs } from "swiper/modules";
import { ProtectedElement } from "../../../pages";
import { adStatus, adTypes, cities, colors, conditionTypes, transmissionTypes, fuelTypes, marineTypes, coolingTypes, motorcycleTypes, carTypes } from "../../../data/General";
import moment from "moment";
import { useDispatch } from "react-redux";
import { deleteAdvertisement } from "../../../redux/actions/advertisementActions";
import {
  LandFeatures,
  HouseFeatures,
  CarFeatures,
  MotorFeatures,
  MarineFeatures,
  FeatureBadge,
} from "../../../components/ads/Features";
// Direct import, not via data/Imagedata — see the note at the top of that file.
import NoUserProfile from "../../../assets/images/NoUserProfile.jpg";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
const DetailUserModal = React.lazy(() => import("../../users/DetailUserModal"));
const ProcessAdModal = React.lazy(() => import("./ProcessAdModal"));

// Fallback for houseTypes if not defined
const houseTypes = typeof window !== 'undefined' && window.houseTypes ? window.houseTypes : [];

const categoryConfigs = {
  1: {
    detailsKey: "landAdvertisement_details",
    properties: [
      {
        key: "square_meters",
        label: "المساحة",
        icon: "bx bx-area",
        format: (value) => value ? `${parseInt(value)} م²` : "غير محدد",
      },
    ],
  },
  2: {
    detailsKey: "houseAdvertisement_details",
    properties: [
      {
        key: "building_age",
        label: "عمر المبنى",
        icon: "ri-time-line",
        format: (value) => value ? `${value} سنة` : "غير محدد",
      },
      {
        key: "house_type",
        label: "نوع المنزل",
        icon: "ri-home-gear-line",
        format: (value) => {
          const type = houseTypes?.find((c) => c.value === value);
          return type ? type.label : value;
        },
      },
      {
        key: "floor",
        label: "الطابق",
        icon: "ri-building-line",
      },
      {
        key: "square_meters",
        label: "المساحة",
        icon: "bx bx-area",
        format: (value) => value ? `${parseInt(value)} م²` : "غير محدد",
      },
      {
        key: "number_of_rooms",
        label: "عدد الغرف",
        icon: "ri-hotel-bed-line",
      },
      {
        key: "number_of_bathrooms",
        label: "عدد الحمامات",
        icon: "ri-bathtub-line",
      },
    ],
  },
  3: {
    detailsKeys: [
      "vehicleAdvertisement_details",
      "carAdvertisement_details",
      "landVehicleAttributes_details",
    ],
    properties: [
      {
        key: "brand.name",
        label: "الماركة",
        icon: "ri-car-line",
        detailsKeyIndex: 0,
      },
      {
        key: "model.name",
        label: "الموديل",
        icon: "ri-menu-line",
        detailsKeyIndex: 0,
      },
      {
        key: "year",
        label: "سنة التصنيع",
        icon: "ri-tools-line",
        detailsKeyIndex: 0,
      },
      {
        key: "color",
        label: "اللون",
        icon: "ri-paint-brush-line",
        detailsKeyIndex: 0,
        format: (value) => {
          const color = colors?.find((c) => c.value === value);
          return color ? color.label : value;
        },
      },
      {
        key: "condition",
        label: "الحالة",
        icon: "ri-star-line",
        detailsKeyIndex: 0,
        format: (value) => {
          const condition = conditionTypes?.find((c) => c.value === value);
          return condition ? condition.label : value;
        },
      },
      {
        key: "transmission_type",
        label: "نوع الغيار",
        icon: "ri-exchange-dollar-line",
        detailsKeyIndex: 2,
        format: (value) => {
          const type = transmissionTypes?.find((t) => t.value === value);
          return type ? type.label : value;
        },
      },
      {
        key: "cylinders",
        label: "الأسطوانات",
        icon: "ri-drag-move-2-line",
        detailsKeyIndex: 2,
        format: (value) => value ? `V${value}` : value,
      },
      {
        key: "engine_capacity",
        label: "سعة المحرك",
        icon: "ri-settings-3-line",
        detailsKeyIndex: 2,
        format: (value) => value ? `${parseInt(value)}CC` : value,
      },
      {
        key: "fuel_type",
        label: "نوع الوقود",
        icon: "ri-gas-station-line",
        detailsKeyIndex: 0,
        format: (value) => {
          const fuel = fuelTypes?.find((f) => f.value === value);
          return fuel ? fuel.label : value;
        },
      },
      {
        key: "horsepower",
        label: "قوة المحرك",
        icon: "ri-flashlight-line",
        detailsKeyIndex: 0,
        format: (value) => value ? `${value} حصان` : value,
      },
      {
        key: "mileage",
        label: "الكيلومتراج",
        icon: "ri-dashboard-line",
        detailsKeyIndex: 2,
        format: (value) => value ? `${value} كم` : value,
      },
      {
        key: "car_type",
        label: "نوع السيارة",
        icon: "ri-car-washing-line",
        detailsKeyIndex: 1,
        format: (value) => {
          const type = carTypes?.find((c) => c.value?.toLowerCase() === value?.toLowerCase());
          return type ? type.label : value;
        },
      },
      {
        key: "doors",
        label: "الأبواب",
        icon: "ri-door-lock-line",
        detailsKeyIndex: 1,
      },
      {
        key: "seats",
        label: "المقاعد",
        icon: "ri-seat-line",
        detailsKeyIndex: 1,
      },
      {
        key: "seats_color",
        label: "لون المقاعد",
        icon: "ri-palette-line",
        detailsKeyIndex: 1,
        format: (value) => {
          const color = colors?.find((c) => c.value === value);
          return color ? color.label : value;
        },
      },
    ],
  },
  4: {
    detailsKeys: [
      "vehicleAdvertisement_details",
      "marineAdvertisement_details",
    ],
    properties: [
      {
        key: "brand.name",
        label: "الماركة",
        icon: "ri-ship-line",
        detailsKeyIndex: 0,
      },
      {
        key: "model.name",
        label: "الموديل",
        icon: "ri-menu-line",
        detailsKeyIndex: 0,
      },
      {
        key: "year",
        label: "سنة التصنيع",
        icon: "ri-tools-line",
        detailsKeyIndex: 0,
      },
      {
        key: "color",
        label: "اللون",
        icon: "ri-paint-brush-line",
        detailsKeyIndex: 0,
        format: (value) => {
          const color = colors?.find((c) => c.value === value);
          return color ? color.label : value;
        },
      },
      {
        key: "condition",
        label: "الحالة",
        icon: "ri-star-line",
        detailsKeyIndex: 0,
        format: (value) => {
          const condition = conditionTypes?.find((c) => c.value === value);
          return condition ? condition.label : value;
        },
      },
      {
        key: "fuel_type",
        label: "نوع الوقود",
        icon: "ri-gas-station-line",
        detailsKeyIndex: 0,
        format: (value) => {
          const fuel = fuelTypes?.find((f) => f.value === value);
          return fuel ? fuel.label : value;
        },
      },
      {
        key: "horsepower",
        label: "قوة المحرك",
        icon: "ri-flashlight-line",
        detailsKeyIndex: 0,
        format: (value) => value ? `${value} حصان` : value,
      },
      {
        key: "length",
        label: "الطول",
        icon: "ri-arrow-up-down-line",
        detailsKeyIndex: 1,
        format: (value) => value ? `${value} م` : value,
      },
      {
        key: "width",
        label: "العرض",
        icon: "ri-arrow-left-right-line",
        detailsKeyIndex: 1,
        format: (value) => value ? `${value} م` : value,
      },
      {
        key: "marine_type",
        label: "نوع المركبة البحرية",
        icon: "ri-ship-2-line",
        detailsKeyIndex: 1,
        format: (value) => {
          const type = marineTypes?.find((t) => t.value === value);
          return type ? type.label : value;
        },
      },
      {
        key: "engine_brand",
        label: "ماركة المحرك",
        icon: "ri-cpu-line",
        detailsKeyIndex: 1,
        format: (value) => value || "غير محدد",
      },
      {
        key: "body_material",
        label: "نوع الجسم",
        icon: "ri-shape-line",
        detailsKeyIndex: 1,
        format: (value) => value || "غير محدد",
      },
      {
        key: "max_capacity",
        label: "السعة القصوى",
        icon: "ri-group-line",
        detailsKeyIndex: 1,
        format: (value) => value ? `${value} شخص` : value,
      },
    ],
  },
  5: {
    detailsKeys: [
      "vehicleAdvertisement_details",
      "motorcycleAdvertisement_details",
      "landVehicleAttributes_details",
    ],
    properties: [
      {
        key: "brand.name",
        label: "الماركة",
        icon: "ri-motorbike-line",
        detailsKeyIndex: 0,
      },
      {
        key: "model.name",
        label: "الموديل",
        icon: "ri-menu-line",
        detailsKeyIndex: 0,
      },
      {
        key: "year",
        label: "سنة التصنيع",
        icon: "ri-tools-line",
        detailsKeyIndex: 0,
      },
      {
        key: "color",
        label: "اللون",
        icon: "ri-paint-brush-line",
        detailsKeyIndex: 0,
        format: (value) => {
          const color = colors?.find((c) => c.value === value);
          return color ? color.label : value;
        },
      },
      {
        key: "condition",
        label: "الحالة",
        icon: "ri-star-line",
        detailsKeyIndex: 0,
        format: (value) => {
          const condition = conditionTypes?.find((c) => c.value === value);
          return condition ? condition.label : value;
        },
      },
      {
        key: "transmission_type",
        label: "نوع الغيار",
        icon: "ri-exchange-dollar-line",
        detailsKeyIndex: 2,
        format: (value) => {
          const type = transmissionTypes?.find((t) => t.value === value);
          return type ? type.label : value;
        },
      },
      {
        key: "cylinders",
        label: "الأسطوانات",
        icon: "ri-drag-move-2-line",
        detailsKeyIndex: 2,
        format: (value) => value ? `V${value}` : value,
      },
      {
        key: "engine_capacity",
        label: "سعة المحرك",
        icon: "ri-settings-3-line",
        detailsKeyIndex: 2,
        format: (value) => value ? `${parseInt(value)}CC` : value,
      },
      {
        key: "fuel_type",
        label: "نوع الوقود",
        icon: "ri-gas-station-line",
        detailsKeyIndex: 0,
        format: (value) => {
          const fuel = fuelTypes?.find((f) => f.value === value);
          return fuel ? fuel.label : value;
        },
      },
      {
        key: "horsepower",
        label: "قوة المحرك",
        icon: "ri-flashlight-line",
        detailsKeyIndex: 0,
        format: (value) => value ? `${value} حصان` : value,
      },
      {
        key: "mileage",
        label: "الكيلومتراج",
        icon: "ri-dashboard-line",
        detailsKeyIndex: 2,
        format: (value) => value ? `${value} كم` : value,
      },
      {
        key: "cooling_type",
        label: "توع التبريد",
        icon: "ri-drop-line",
        detailsKeyIndex: 1,
        format: (value) => {
          const cooling = coolingTypes?.find((c) => c.value === value);
          return cooling ? cooling.label : value;
        },
      },
      {
        key: "motorcycle_type",
        label: "نوع الدراجة",
        icon: "ri-motorbike-line",
        detailsKeyIndex: 1,
        format: (value) => {
          const motorcycle = motorcycleTypes?.find((m) => m.value === value);
          return motorcycle ? motorcycle.label : value;
        },
      },
    ],
  },
};

// Helper to get nested value by key path (e.g., 'brand.name')
function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

const AdDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [user, setUser] = useState(null);
  const [adCategory, setAdCategory] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [showAdStatusModal, setShowAdStatusModal] = useState(false);
  const [location, setLocation] = useState({});
  const dispatch = useDispatch();
  useEffect(() => {
    const fetchAdDetails = async () => {
      try {
        const response = await api.get(`/advertisements/${id}`);
        setAd(response.data.data);
        setAdCategory(response.data.data.category.id);
        const [lat, lng] = response.data.data.location.split(",").map(Number);
        setLocation({ lat, lng });
      } catch (err) {
        if (
          err.response &&
          (err.response.status === 404 || err.response.status === 500)
        ) {
          navigate("/404", { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAdDetails();
  }, [id, navigate]);

  useEffect(() => {
    if (ad?.user?.id) {
      const fetchUserDetails = async () => {
        try {
          const response = await api.get(`/users/${ad.user.id}`);
          setUser(response.data);
        } catch (err) {
          // 
        }
      };
      fetchUserDetails();
    }
  }, [ad]);

  const handleDeleteAd = async (id) => {
    try {
      const result = await dispatch(deleteAdvertisement(id));
      if (result) {
        setTimeout(() => {
          navigate("/advertisements", { replace: true });
        }, [2000]);
      }
    } catch (err) {
      // 
    }
  };
  return (
    <Fragment>
      <Helmet>
        <title>{loading ? "Advertisement Details" : `${ad?.title}`}</title>
      </Helmet>
      {loading ? (
        <Loader />
      ) : (
        <Fragment>
          <PageHeader
            homepage={`تفاصيل الإعلان`}
            activepage="الإعلانات"
            page={loading ? "تفاصيل الإعلان" : `${ad?.title}`}
          >
            <ProtectedElement
              element={
                <button
                  onClick={() => {
                    handleDeleteAd(ad?.id);
                  }}
                  className="btn btn-danger btn-wave"
                >
                  <i className="ri-delete-bin-line align-middle me-1"></i> حذف
                  الإعلان
                </button>
              }
              requiredPermissions={["delete_ad"]}
            />
            {ad?.ads_status === "pending" && (
              <ProtectedElement
                element={
                  <button
                    onClick={() => {
                      setShowAdStatusModal(true);
                    }}
                    className="btn btn-dark btn-wave"
                  >
                    <i className="ri-equalizer-2-line align-middle me-1"></i>{" "}
                    تغيير الحالة
                  </button>
                }
                requiredPermissions={["process_ad"]}
              />
            )}
          </PageHeader>

          <Row>
            <Col xl={12}>
              <Card className="custom-card">
                <Card.Body className="p-0">
                  <Row className="g-0">
                    <Col xl={4} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-success-transparent">
                            <i className="ri-cash-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <p className="text-muted mb-0 fs-15">
                            السعر المعلن عنه
                          </p>
                          <h5 className="fw-medium mb-1">
                            {ad?.price}
                            <span className="text-muted fs-6 fw-light">
                              {ad?.currency}

                              {ad?.type === "rent" &&
                                `/${ad?.rentDetail_details?.rental_period}`}
                            </span>
                          </h5>
                        </div>
                      </div>
                    </Col>
                    <Col xl={4} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-info-transparent">
                            <i className="bx bx-category fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <p className="text-muted mb-0 fs-15">فئة الإعلان</p>
                          <h5 className="fw-medium mb-1">
                            {adTypes.find(
                              (type) => type.value === ad?.category?.id
                            )?.label || "غير معروف"}
                          </h5>
                        </div>
                      </div>
                    </Col>
                    <Col xl={4} className="border-end border-inline-end-dashed">
                      <div className="d-flex flex-wrap align-items-center p-4">
                        <div className="me-3 lh-1">
                          <span className="avatar avatar-lg avatar-rounded bg-warning-transparent">
                            <i className="ri-contract-line fs-18"></i>
                          </span>
                        </div>
                        <div className="flex-fill">
                          <p className="text-muted mb-0 fs-15">نوع العقد</p>
                          <h5 className="fw-medium mb-1">
                            {ad?.type === "rent"
                              ? "إيجــــار"
                              : ad?.type === "sale"
                              ? "بـــــيع"
                              : "غير معروف"}
                          </h5>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Row className="g-3 mb-4">
            <Col xs={12} xxl={8}>
              <Row>
                <Col xl={12} className="">
                  <Card className="custom-card m-0">
                    <Card.Body>
                      <Row className="g-3">
                        <Col xs={12} className="p-3">
                          <div className="d-flex align-items-start flex-column gap-1">
                            <span className="fs-4  d-flex flex-column">
                              <p className="m-0 fs-4 fw-bold ">
                                <span className="text-primary ">
                                  {ad?.id}#{" "}
                                </span>
                                {ad?.title}
                              </p>
                            </span>
                            <div className="d-flex flex-wrap gap-3">
                              <span className="d-flex align-items-center gap-1 text-muted">
                                <i className="ri-map-pin-line "></i>
                                <p className="m-0 fs-6">{(cities.find(c => c.value === ad?.city)?.label) || ad?.city || "غير معروف"}</p>
                              </span>
                              <span className="d-flex align-items-center gap-1 text-muted">
                                <i className="ri-calendar-line"></i>
                                <p className="m-0 fs-6">
                                  {moment(ad?.created_at)
                                    .tz("Europe/Istanbul")
                                    .format("YYYY-MM-DD")}
                                </p>
                              </span>
                            </div>
                          </div>
                        </Col>

                        <Col xs={12}>
                          <Swiper
                            style={{
                              "--swiper-navigation-color": "#fff",
                              "--swiper-pagination-color": "#fff",
                              direction: "rtl",
                              height: "50vh",
                            }}
                            loop={true}
                            navigation={true}
                            spaceBetween={10}
                            grabCursor={true}
                            thumbs={{ swiper: thumbsSwiper }}
                            modules={[FreeMode, Navigation, Thumbs, Pagination]}
                            pagination={
                              (true,
                              {
                                type: "bullets",
                                clickable: true,
                                dynamicBullets: true,
                              })
                            }
                            className="mySwiper2 swiper-preview-details bg-light "
                            onSlideChange={(swiper) =>
                              setSelectedIndex(swiper.realIndex)
                            }
                          >
                            {ad?.images.map((image) => (
                              <SwiperSlide
                                style={{ height: "auto" }}
                                key={image?.id}
                              >
                                <img
                                  style={{
                                    objectFit: "cover !important",
                                    height: "100%",
                                  }}
                                  loading="lazy"
                                  key={image?.id}
                                  src={image?.url}
                                  alt="img"
                                />
                              </SwiperSlide>
                            ))}
                            <div
                              style={{
                                position: "absolute",
                                top: "0rem",
                                left: "0rem",
                                zIndex: "1",
                                width: "100%",
                                height: "3rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "end",
                                padding: "2rem 1rem",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setShowGallery(true);
                                }}
                                className="btn btn-dark btn-sm"
                              >
                                <i className="ri-fullscreen-line align-middle"></i>
                              </button>
                            </div>
                          </Swiper>
                          {ad?.images?.length > 1 ? (
                            <Swiper
                              onSwiper={setThumbsSwiper}
                              loop={false}
                              spaceBetween={10}
                              slidesPerView={5}
                              freeMode={true}
                              watchSlidesProgress={true}
                              className="mySwiper swiper-view-details mt-2"
                              style={{
                                direction: "rtl",
                              }}
                            >
                              {ad?.images.map((image, index) => (
                                <SwiperSlide
                                  style={{ height: "auto" }}
                                  key={image?.id}
                                  onClick={() => {
                                    setSelectedIndex(index);
                                  }}
                                >
                                  <img
                                    loading="lazy"
                                    src={image?.url}
                                    alt="img"
                                  />
                                </SwiperSlide>
                              ))}
                            </Swiper>
                          ) : (
                            <></>
                          )}
                        </Col>
                      </Row>
                    </Card.Body>
                    <Card.Footer>
                      <Row className={"g-3"}>
                        <Col xs={12}>
                          <Row>
                            <Col xs={12}>
                              <div className="d-flex gap-2 flex-column">
                                <p className="m-0 fs-18 text-primary  fw-medium">
                                  شرح تفصيلي للإعلان
                                </p>
                                <p className="m-0 ">{ad?.description}</p>
                              </div>
                            </Col>
                          </Row>
                        </Col>

                        <Col xs={12}>
                          <Row>
                            <Col>
                              <p className="m-0 fs-18 text-primary  fw-medium">
                                المميزات
                              </p>
                            </Col>
                          </Row>
                          <Row className="mt-2">
                            {categoryConfigs[adCategory] && (
                              <Row className="g-2">
                                {categoryConfigs[adCategory].properties.map((prop) => {
                                  let value;
                                  if (categoryConfigs[adCategory].detailsKeys && typeof prop.detailsKeyIndex === 'number') {
                                    const detailsObj = ad?.[categoryConfigs[adCategory].detailsKeys[prop.detailsKeyIndex]];
                                    value = getNestedValue(detailsObj || {}, prop.key);
                                  } else {
                                    const detailsObj = ad?.[categoryConfigs[adCategory].detailsKey];
                                    value = getNestedValue(detailsObj || {}, prop.key);
                                  }
                                  if (prop.format) value = prop.format(value);
                                  return (
                                    <Col key={prop.key} xs={12} sm={6} md={4} lg={3} className="mb-2">
                                      <div className="d-flex align-items-center gap-2 p-2 bg-light rounded-2">
                                        <i className={`${prop.icon} fs-4 text-primary`} />
                                        <span className="fw-bold">{prop.label}:</span>
                                        <span className="ms-1">{value ?? "غير محدد"}</span>
                                      </div>
                                    </Col>
                                  );
                                })}
                              </Row>
                            )}
                          </Row>
                        </Col>
                      </Row>
                    </Card.Footer>
                  </Card>
                </Col>
              </Row>
            </Col>
            <Col xs={12} xxl={4}>
              <Row className="g-3">
                <Col xs={12}>
                  <ListGroup variant="flush" className="rounded-4 shadow-sm">
                    <ListGroupItem
                      style={{ padding: "16px 20px" }}
                      className="d-flex align-items-center justify-content-between"
                    >
                      <p className="fs-6 m-0 fw-bolder">خواص ومزايا الإعلان</p>
                      <div className="d-flex align-items-center gap-2">
                        <p
                          className={`btn  m-0 bg-${
                            ad?.active_status === "active"
                              ? "success"
                              : "danger"
                          }-transparent`}
                        >
                          <i
                            className={`ri-${
                              ad?.active_status === "active"
                                ? "flashlight"
                                : "shut-down"
                            }-line align-middle me-1`}
                          ></i>
                          {ad?.active_status === "active" ? "نشط" : "متوقف"}
                        </p>
                        <p
                          className={`btn  m-0 bg-${
                            ad?.ads_status === "accepted" ? (
                              "success"
                            ) : ad?.ads_status === "pending" ? (
                              "warning"
                            ) : ad?.ads_status === "rejected" ? (
                              "danger"
                            ) : (
                              <></>
                            )
                          }-transparent`}
                        >
                          <i
                            className={`ri-${
                              ad?.ads_status === "accepted" ? (
                                "check"
                              ) : ad?.ads_status === "pending" ? (
                                "hourglass"
                              ) : ad?.ads_status === "rejected" ? (
                                "prohibited"
                              ) : (
                                <></>
                              )
                            }-line align-middle me-1`}
                          ></i>
                          {adStatus.find((s) => s.value === ad?.ads_status)
                            ?.label || "غير معروف"}
                        </p>
                      </div>
                    </ListGroupItem>
                    {ad?.type === "sale" && (
                      <FeatureBadge
                        title={"إمكانية المقايضة"}
                        value={
                          ad?.saleDetail_details?.is_swap === 1
                            ? "نعم"
                            : ad?.saleDetail_details?.is_swap === 0
                            ? "لا"
                            : "غير معروف"
                        }
                        icon={"ri-exchange-line"}
                      />
                    )}
                    {adCategory === 1 ? (
                      <LandFeatures ad={ad ? ad : null} />
                    ) : adCategory === 2 ? (
                      <HouseFeatures ad={ad ? ad : null} />
                    ) : adCategory === 3 ? (
                      <CarFeatures ad={ad ? ad : null} />
                    ) : adCategory === 4 ? (
                      <MarineFeatures ad={ad ? ad : null} />
                    ) : adCategory === 5 ? (
                      <MotorFeatures ad={ad ? ad : null} />
                    ) : (
                      <></>
                    )}
                  </ListGroup>
                </Col>
                <Col sm={12}>
                  <Card className="custom-card m-0">
                    <Card.Header className="d-flex align-items-center justify-content-between">
                      <p className="fs-6 m-0 fw-bolder">معلومات المعلن</p>
                      <ProtectedElement
                        element={
                          <button
                            onClick={() => {
                              setShowUserDetailModal(true);
                            }}
                            className="btn btn-light"
                          >
                            <i className="ri-eye-2-line align-middle me-1"></i>{" "}
                            عرض الكل
                          </button>
                        }
                        requiredPermissions={["view_user"]}
                      />
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col xs={12}>
                          <div className={"d-flex gap-2 align-items-center"}>
                            <span
                              style={{
                                overflow: "hidden",
                              }}
                              className="avatar avatar-xl bg-light rounded-pill d-flex align-items-center justify-content-center text-uppercase"
                            >
                              <img
                                src={
                                  user?.image
                                    ? user?.image
                                    : NoUserProfile
                                }
                                alt="User"
                                className="rounded-pill"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  transform: user?.image ? "" : "scale(1.3)",
                                }}
                              />
                            </span>
                            <div className={"d-flex flex-column "}>
                              <span className="fw-bolder">{user?.name}</span>
                              <p className="m-0 text-muted">{user?.email}</p>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
                <Col sm={12}>
                  <Card className="custom-card m-0">
                    <Card.Header className="d-flex align-items-center justify-content-between">
                      <p className="fs-6 m-0 fw-bolder">الموقع</p>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col xs={12}>
                          <LoadScript
                            googleMapsApiKey={
                              "AIzaSyCN_Q7aVEdQARG6Yz0RwceXu1U2zFlLFrE"
                            }
                          >
                            <GoogleMap
                              mapContainerStyle={{
                                width: "100%",
                                height: "400px",
                                borderRadius: "0.875rem",
                              }}
                              center={{
                                lat: location?.lat,
                                lng: location?.lng,
                              }}
                              zoom={15}
                            >
                              <Marker
                                position={{
                                  lat: location?.lat,
                                  lng: location?.lng,
                                }}
                              />
                            </GoogleMap>
                          </LoadScript>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Col>
          </Row>
          {showGallery && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0, 0, 0, 0.8)",
                zIndex: 1000,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                userSelect: "none",
                caretColor: "transparent",
              }}
            >
              <Swiper
                loop={true}
                navigation={true}
                spaceBetween={10}
                grabCursor={true}
                modules={[Navigation, Pagination]}
                pagination={{
                  type: "fraction",
                  clickable: true,
                  dynamicBullets: true,
                }}
                style={{ width: "90vw", height: "90vh" }}
                initialSlide={selectedIndex}
              >
                {ad?.images.map((image) => (
                  <SwiperSlide key={image?.id}>
                    <img
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                      src={image?.url}
                      alt="img"
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
              <button
                onClick={() => setShowGallery(false)}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  border: "none",
                  borderRadius: "50%",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
                className="btn btn-sm btn-dark d-flex align-items-center justify-content-center"
              >
                <i className="ri-close-line align-middle" />
              </button>
            </div>
          )}
          <Suspense fallback={<Spinner color="primary" />}>
            <DetailUserModal
              open={showUserDetailModal}
              close={() => {
                setShowUserDetailModal(false);
              }}
              user={user ? user : null}
            />

            <ProcessAdModal
              open={showAdStatusModal}
              close={() => {
                setShowAdStatusModal(false);
              }}
              adData={ad ? ad : null}
            />
          </Suspense>
        </Fragment>
      )}
    </Fragment>
  );
};

export default AdDetails;
