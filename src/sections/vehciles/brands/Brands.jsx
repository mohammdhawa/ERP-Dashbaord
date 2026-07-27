import React, { Fragment, lazy, Suspense, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteVehicleBrand,
  fetchVehicleBrands,
} from "../../../redux/actions/VehiclesBrandsActions";
import { Helmet } from "react-helmet";
import { DataTable, Loader, PageHeader } from "../../../components";
import { ProtectedElement } from "../../../pages";
import { Accordion, Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import Select from "react-select";
import { adTypes, ShowPerPage } from "../../../data/General";
import { vehicleBrandsColumns } from "../../../data/Columns";
import moment from "moment-timezone";

const AddBrandModal = lazy(() => import("./AddBrandModal"));
const DetailBrandModal = lazy(() => import("./DetailBrandModal"));
const UpdateBrandModal = lazy(() => import("./UpdateBrandModal"));

const Brands = () => {
  const dispatch = useDispatch();
  const { vehicleBrands, fetchVehicleBrandsLoading } = useSelector(
    (state) => state.vehicleBrands
  );
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addBrandModalShow, setAddBrandModalShow] = useState(false);
  const [updateBrandModalShow, setUpdateBrandModalShow] = useState(false);
  const [willBeUpdate, setWillBeUpdate] = useState("");
  const [detailBrandModalShow, setDetailBrandModalShow] = useState(false);
  const [willBeShow, setWillBeShow] = useState("");
  const [createdDateRange, setCreatedDateRange] = useState({
    from: "",
    to: "",
  });
  const [updatedDateRange, setUpdatedDateRange] = useState({
    from: "",
    to: "",
  });
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    dispatch(fetchVehicleBrands());
  }, [dispatch]);

  useEffect(() => {
    setFilteredData(vehicleBrands);
  }, [vehicleBrands]);

  useEffect(() => {
    let filtered = [...vehicleBrands];
    filtered = filtered.filter((brand) => {
      const brandName = brand.name.toLowerCase();
      const brandId = brand.id;
      const brandCategory = brand.category_id;
      const brandCreatedAt = moment(brand.created_at)
        .tz("Europe/Istanbul")
        .format("YYYY-MM-DD");
      const createdFromDate = createdDateRange.from
        ? moment(createdDateRange.from)
            .tz("Europe/Istanbul")
            .format("YYYY-MM-DD")
        : null;
      const createdToDate = createdDateRange.to
        ? moment(createdDateRange.to).tz("Europe/Istanbul").format("YYYY-MM-DD")
        : null;
      const brandUpdatedAt = moment(brand.updated_at)
        .tz("Europe/Istanbul")
        .format("YYYY-MM-DD");
      const updatedFromDate = updatedDateRange.from
        ? moment(updatedDateRange.from)
            .tz("Europe/Istanbul")
            .format("YYYY-MM-DD")
        : null;
      const updatedToDate = updatedDateRange.to
        ? moment(updatedDateRange.to).tz("Europe/Istanbul").format("YYYY-MM-DD")
        : null;


      const selectedCategoryValues = selectedCategories.map((cat) => cat.value);

      const matchesSearch =
        !searchQuery ||
        brandName.includes(searchQuery.toLowerCase()) ||
        brandId === Number(searchQuery);
      const matchesCreatedDate =
        (!createdFromDate || brandCreatedAt >= createdFromDate) &&
        (!createdToDate || brandCreatedAt <= createdToDate);
      const matchesUpdatedDate =
        (!updatedFromDate || brandUpdatedAt >= updatedFromDate) &&
        (!updatedToDate || brandUpdatedAt <= updatedToDate);

      const matchesCategory =
        selectedCategoryValues.length === 0 ||
        selectedCategoryValues.includes(brandCategory);

      return (
        matchesSearch &&
        matchesCreatedDate &&
        matchesUpdatedDate &&
        matchesCategory
      );
    });

    setFilteredData(filtered);
  }, [
    searchQuery,
    createdDateRange,
    updatedDateRange,
    selectedCategories,
    vehicleBrands,
  ]);

  function handleDelete(id) {
    dispatch(deleteVehicleBrand(id));
  }

  const handleShow = (brand) => {
    setWillBeShow(brand);
    setDetailBrandModalShow(true);
  };

  const handleUpdate = (brand) => {
    setWillBeUpdate(brand);
    setUpdateBrandModalShow(true);
  };

  return (
    <Fragment>
      <Helmet>
        <title>Dashboard | Vehicles Brands</title>
      </Helmet>
      {fetchVehicleBrandsLoading ? (
        <Loader />
      ) : (
        <Fragment>
          <PageHeader
            homepage="ماركات المركبات"
            activepage="المركبات"
            page="ماركات المركبات"
          >
            <ProtectedElement
              element={
                <button
                  onClick={() => {
                    setAddBrandModalShow(true);
                  }}
                  className="btn btn-secondary btn-wave"
                >
                  <i className="ri-add-line align-middle me-1"></i> اضافة ماركة
                </button>
              }
              requiredPermissions={["create_vehicleBrands"]}
            />
          </PageHeader>
          <Row>
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
                            <Col md={12} lg={6} xxl={4}>
                              <Form.Label>الفئات</Form.Label>
                              <Select
                                isMulti 
                                placeholder="اختر الفئات"
                                aria-label="Category Filter"
                                classNamePrefix="Select2"
                                isClearable
                                options={adTypes.filter(
                                  (adType) =>
                                    adType.value !== 1 && adType.value !== 2
                                )}
                                onChange={setSelectedCategories}
                              />
                            </Col>
                            <Col md={12} lg={6} xxl={4}>
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
                                  value={createdDateRange?.from}
                                  onChange={(e) => {
                                    setCreatedDateRange({
                                      ...createdDateRange,
                                      from: e.target.value,
                                    });
                                  }}
                                />
                                <Form.Control
                                  type="date"
                                  name="to"
                                  placeholder="إلى"
                                  value={createdDateRange?.to}
                                  onChange={(e) => {
                                    setCreatedDateRange({
                                      ...createdDateRange,
                                      to: e.target.value,
                                    });
                                  }}
                                />
                                <button
                                  className="btn btn-light z-0 border"
                                  onClick={() => {
                                    setCreatedDateRange({ from: "", to: "" });
                                  }}
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              </InputGroup>
                            </Col>
                            <Col md={12} lg={6} xxl={4}>
                              <Form.Label htmlFor="from">
                                تاريخ اخر تعديل
                              </Form.Label>
                              <InputGroup>
                                <InputGroup.Text>
                                  <i className="ri-calendar-line"></i>
                                </InputGroup.Text>
                                <Form.Control
                                  type="date"
                                  name="from"
                                  placeholder="من"
                                  value={updatedDateRange?.from}
                                  onChange={(e) => {
                                    setUpdatedDateRange({
                                      ...updatedDateRange,
                                      from: e.target.value,
                                    });
                                  }}
                                />
                                <Form.Control
                                  type="date"
                                  name="to"
                                  placeholder="إلى"
                                  value={updatedDateRange?.to}
                                  onChange={(e) => {
                                    setUpdatedDateRange({
                                      ...updatedDateRange,
                                      to: e.target.value,
                                    });
                                  }}
                                />
                                <button
                                  className="btn btn-light z-0 border"
                                  onClick={() => {
                                    setUpdatedDateRange({ from: "", to: "" });
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
                  columns={vehicleBrandsColumns}
                  data={filteredData}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  pageName={"vehicleBrands"}
                  functions={{
                    handleDelete: handleDelete,
                    handleUpdate: handleUpdate,
                    handleDetail: handleShow,
                  }}
                />
              </Card.Body>
            </Card>
          </Row>
        </Fragment>
      )}
      <Suspense fallback={<div>Loading...</div>}>
        <AddBrandModal
          open={addBrandModalShow}
          close={() => {
            setAddBrandModalShow(false);
          }}
        />
        <DetailBrandModal
          open={detailBrandModalShow}
          close={() => {
            setDetailBrandModalShow(false);
          }}
          brand={willBeShow}
        />
        <UpdateBrandModal
          open={updateBrandModalShow}
          close={() => setUpdateBrandModalShow(false)}
          brand={willBeUpdate}
        />
      </Suspense>
    </Fragment>
  );
};

export default Brands;
