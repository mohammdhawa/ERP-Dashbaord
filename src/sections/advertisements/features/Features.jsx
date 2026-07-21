import React, { Fragment, useEffect, useState } from "react";
import { Accordion, Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import { DataTable } from "../../../components";
import { useDispatch, useSelector } from "react-redux";
import { deleteFeature } from "../../../redux/actions/featuresActions";
import Select from "react-select";
import { adTypes, ShowPerPage } from "../../../data/General";
import { featuresColumns } from "../../../data/Columns";
import EditFeatureModal from "./EditFeatureModal";
import moment from "moment-timezone";

const Features = () => {
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const dispatch = useDispatch();
  const { features } = useSelector((state) => state.features);
  const { featureGroups } = useSelector((state) => state.featuresGroups);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [willBeUpdated, setWillBeUpdated] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  useEffect(() => {
    setFilteredData(features);
  }, [features]);
  const featuresGroupOptions = Array.from(
    new Map(
      featureGroups.map((group) => [
        group.name,
        { label: group.name, value: group.name },
      ])
    ).values()
  );

  useEffect(() => {
    let filtered = features;
    if (searchQuery || dateRange) {
      filtered = filtered.filter((feature) => {
        const featureId = String(feature.id).toLowerCase();
        const featureCreatedAt = moment(feature.created_at)
          .tz("Europe/Istanbul")
          .format("YYYY-MM-DD");
        const isInDateRange =
          (!dateRange.from ||
            featureCreatedAt >=
              moment(dateRange.from)
                .tz("Europe/Istanbul")
                .format("YYYY-MM-DD")) &&
          (!dateRange.to ||
            featureCreatedAt <=
              moment(dateRange.to).tz("Europe/Istanbul").format("YYYY-MM-DD"));
        return (
          (featureId.includes(searchQuery.toLowerCase()) ||
            feature.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
          isInDateRange
        );
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (feature) =>
          feature.feature_group?.category_id === selectedCategory.value
      );
    }

    if (selectedGroup) {
      filtered = filtered.filter(
        (feature) => feature.feature_group?.name === selectedGroup.value
      );
    }

    setFilteredData(filtered);
  }, [searchQuery, selectedCategory, selectedGroup, features, dateRange]);

  const handleDateChange = (e) => {
    setDateRange((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };
  const handleDelete = (id) => {
    dispatch(deleteFeature(id));
  };

  const handleUpdate = (feature) => {
    setWillBeUpdated(feature);
    setShowUpdateModal(true);
  };

  return (
    <Fragment>
      <Card className="custom-card m-0">
        <div className="row flex-wrap gx-2 gy-3 p-3 justify-content-between align-items-center">
          <Col md={8} lg={8} xl={3} xxl={2}>
            <input
              className="form-control input-primary"
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
              value={{ label: `عرض ${itemsPerPage}`, value: itemsPerPage }}
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
                        <Form.Label htmlFor="category-select">الفئة</Form.Label>
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
                      <Col md={12} lg={6} xxl={4}>
                        <Form.Label htmlFor="group-select">المجموعة</Form.Label>
                        <Select
                          options={featuresGroupOptions}
                          classNamePrefix="Select2"
                          isClearable
                          isSearchable
                          id="group-select"
                          placeholder="اختر المجموعة"
                          value={selectedGroup}
                          onChange={setSelectedGroup}
                        />
                      </Col>
                      <Col md={12} lg={6} xxl={4}>
                        <Form.Label htmlFor="from">تاريخ الإنشاء</Form.Label>
                        <InputGroup>
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
            columns={featuresColumns}
            itemsPerPage={itemsPerPage}
            data={filteredData}
            functions={{
              handleDelete,
              handleUpdate,
              handleDetail: null,
            }}
            pageName="feature"
          />
        </Card.Body>
      </Card>
      <EditFeatureModal
        open={showUpdateModal}
        close={() => {
          setShowUpdateModal(false);
          setWillBeUpdated(null);
        }}
        data={willBeUpdated}
      />
    </Fragment>
  );
};

export default Features;
