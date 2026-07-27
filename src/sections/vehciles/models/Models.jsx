import React, { Fragment, lazy, Suspense, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteVehicleModel,
  fetchVehicleModels,
} from "../../../redux/actions/VehicleModelsActions";
import { fetchVehicleBrands } from "../../../redux/actions/VehiclesBrandsActions";
import { Helmet } from "react-helmet";
import { DataTable, Loader, PageHeader } from "../../../components";
import { ProtectedElement } from "../../../pages";
import { Accordion, Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import Select from "react-select";
import { ShowPerPage } from "../../../data/General";
import moment from "moment-timezone";
import { vehicleModelsColumns } from "../../../data/Columns";

const AddModelModal = lazy(() => import("./AddModelModal"));
const DetailModelModal = lazy(() => import("./DetailModelModal"));
const UpdateModelModal = lazy(() => import("./UpdateModelModal"));

const Models = () => {
  const dispatch = useDispatch();
  const { vehicleModels, fetchVehicleModelsLoading } = useSelector(
    (state) => state.vehicleModels
  );
  const { vehicleBrands } = useSelector((state) => state.vehicleBrands);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addModelModalShow, setAddModelModalShow] = useState(false);
  const [updateModelModalShow, setUpdateModelModalShow] = useState(false);
  const [willBeUpdate, setWillBeUpdate] = useState("");
  const [detailModelModalShow, setDetailModelModalShow] = useState(false);
  const [willBeShow, setWillBeShow] = useState("");
  const [createdDateRange, setCreatedDateRange] = useState({
    from: "",
    to: "",
  });
  const [updatedDateRange, setUpdatedDateRange] = useState({
    from: "",
    to: "",
  });
  const [selectedBrands, setSelectedBrands] = useState([]);

  useEffect(() => {
    dispatch(fetchVehicleModels());
    dispatch(fetchVehicleBrands());
  }, [dispatch]);

  useEffect(() => {
    setFilteredData(vehicleModels);
  }, [vehicleModels]);

  useEffect(() => {
    let filtered = [...vehicleModels];
    filtered = filtered.filter((model) => {
      const modelName = model.name.toLowerCase();
      const modelId = model.id;
      const modelBrandId = model.brand_id;
      const modelCreatedAt = moment(model.created_at)
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
      const modelUpdatedAt = moment(model.updated_at)
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

      const selectedBrandIds = selectedBrands.map((brand) => brand.value);

      const matchesSearch =
        !searchQuery ||
        modelName.includes(searchQuery.toLowerCase()) ||
        modelId === Number(searchQuery);
      const matchesCreatedDate =
        (!createdFromDate || modelCreatedAt >= createdFromDate) &&
        (!createdToDate || modelCreatedAt <= createdToDate);
      const matchesUpdatedDate =
        (!updatedFromDate || modelUpdatedAt >= updatedFromDate) &&
        (!updatedToDate || modelUpdatedAt <= updatedToDate);
      const matchesBrand =
        selectedBrandIds.length === 0 ||
        selectedBrandIds.includes(modelBrandId);

      return (
        matchesSearch &&
        matchesCreatedDate &&
        matchesUpdatedDate &&
        matchesBrand
      );
    });
    setFilteredData(filtered);
  }, [
    searchQuery,
    createdDateRange,
    updatedDateRange,
    selectedBrands,
    vehicleModels,
  ]);

  function handleDelete(id) {
    dispatch(deleteVehicleModel(id));
  }

  const handleShow = (model) => {
    setWillBeShow(model);
    setDetailModelModalShow(true);
  };

  const handleUpdate = (model) => {
    setWillBeUpdate(model);
    setUpdateModelModalShow(true);
  };

  const brandsOptions = vehicleBrands.map((brand) => ({
    value: brand.id,
    label: brand.name,
  }));

  return (
    <Fragment>
      <Helmet>
        <title>Dashboard | Vehicle Models</title>
      </Helmet>
      {fetchVehicleModelsLoading ? (
        <Loader />
      ) : (
        <Fragment>
          <PageHeader
            homepage="موديلات المركبات"
            activepage="المركبات"
            page="موديلات المركبات"
          >
            <ProtectedElement
              element={
                <button
                  onClick={() => setAddModelModalShow(true)}
                  className="btn btn-secondary btn-wave"
                >
                  <i className="ri-add-line align-middle me-1"></i> اضافة موديل
                </button>
              }
              requiredPermissions={["create_vehicleModels"]}
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
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </Col>
                <Col md={4} lg={4} xl={2} xxl={1}>
                  <Select
                    options={ShowPerPage}
                    placeholder={`عرض ${itemsPerPage}`}
                    aria-label="Show Per Page"
                    classNamePrefix="Select2"
                    defaultValue={{ label: itemsPerPage, value: itemsPerPage }}
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
                    defaultActiveKey="0"
                    className="accordionicon-left z-0"
                  >
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>البحث المتقدم</Accordion.Header>
                      <Accordion.Body className="px-0">
                        <Row className="gy-3 gx-2">
                          <Col md={12} lg={6} xxl={4}>
                            <Form.Label>الماركة</Form.Label>
                            <Select
                              isMulti
                              options={brandsOptions}
                              value={selectedBrands}
                              onChange={setSelectedBrands}
                              placeholder="اختر الماركات"
                              aria-label="Brand Filter"
                              classNamePrefix="Select2"
                              isClearable
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
                                value={createdDateRange.from}
                                onChange={(e) =>
                                  setCreatedDateRange({
                                    ...createdDateRange,
                                    from: e.target.value,
                                  })
                                }
                              />
                              <Form.Control
                                type="date"
                                name="to"
                                placeholder="إلى"
                                value={createdDateRange.to}
                                onChange={(e) =>
                                  setCreatedDateRange({
                                    ...createdDateRange,
                                    to: e.target.value,
                                  })
                                }
                              />
                              <button
                                className="btn btn-light z-0 border"
                                onClick={() =>
                                  setCreatedDateRange({ from: "", to: "" })
                                }
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
                                value={updatedDateRange.from}
                                onChange={(e) =>
                                  setUpdatedDateRange({
                                    ...updatedDateRange,
                                    from: e.target.value,
                                  })
                                }
                              />
                              <Form.Control
                                type="date"
                                name="to"
                                placeholder="إلى"
                                value={updatedDateRange.to}
                                onChange={(e) =>
                                  setUpdatedDateRange({
                                    ...updatedDateRange,
                                    to: e.target.value,
                                  })
                                }
                              />
                              <button
                                className="btn btn-light z-0 border"
                                onClick={() =>
                                  setUpdatedDateRange({ from: "", to: "" })
                                }
                              >
                                <i className="ri-close-line"></i>
                              </button>
                            </InputGroup>
                          </Col>
                        </Row>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </Col>
              </div>
              <Card.Body>
                <DataTable
                  columns={vehicleModelsColumns}
                  data={filteredData}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  pageName="vehicleModels"
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
        <AddModelModal
          open={addModelModalShow}
          close={() => setAddModelModalShow(false)}
        />
        <DetailModelModal
          open={detailModelModalShow}
          close={() => setDetailModelModalShow(false)}
          model={willBeShow}
        />
        <UpdateModelModal
          open={updateModelModalShow}
          close={() => setUpdateModelModalShow(false)}
          model={willBeUpdate}
        />
      </Suspense>
    </Fragment>
  );
};

export default Models;
