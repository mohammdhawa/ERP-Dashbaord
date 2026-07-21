import React, { useState, useEffect, Fragment } from "react";
import { Card, Form, Row, Col, Accordion, InputGroup } from "react-bootstrap";
import Select from "react-select";
import moment from "moment";
import { ShowPerPage } from "../../data/General";
import { DataTable } from "../../components";
import { useDispatch, useSelector } from "react-redux";
import { deleteRole } from "../../redux/actions/rolesActions";
import { rolesColumns } from "../../data/Columns";

import EditRoleModal from "./EditRoleModal";
import DetailRoleModal from "./DetailRoleModal";
import { NumericFormat } from "react-number-format";

const Roles = () => {
  const dispatch = useDispatch();
  const { roles, error } = useSelector((state) => state.roles);
  const { profile } = useSelector((state) => state.auth);

  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [minUsers, setMinUsers] = useState("");
  const [maxUsers, setMaxUsers] = useState("");
  const [editModalShow, setEditModalShow] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [detailModalShow, setDetailModalShow] = useState(false);
  const [showingRole, setShowingRole] = useState(null);
  const [isEditableFilter, setIsEditableFilter] = useState(null);
  const [isDeleteableFilter, setIsDeleteableFilter] = useState(null);
  const yesNoOptions = [
    { value: 1, label: "نعم" },
    { value: 0, label: "لا" },
  ];

  useEffect(() => {
    setFilteredData(roles);
  }, [roles]);

  const generatePermissionOptions = () => {
    const permissionsSet = new Set();
    roles.forEach((role) => {
      role?.permissions?.forEach((permission) => {
        permissionsSet.add(permission.name);
      });
    });
    return Array.from(permissionsSet).map((permissionName) => ({
      value: permissionName,
      label: permissionName,
    }));
  };

  const MultipleSelect = generatePermissionOptions();

  useEffect(() => {
    let filtered = roles;

    if (
      searchQuery ||
      selectedPermissions.length ||
      dateRange.from ||
      dateRange.to ||
      minUsers ||
      maxUsers
    ) {
      filtered = roles.filter((role) => {
        const roleId = String(role.id).toLowerCase();
        const roleCreatedAt = moment(role.created_at)
          .tz("Europe/Istanbul")
          .format("YYYY-MM-DD");

        const isInDateRange =
          (!dateRange.from ||
            roleCreatedAt >=
              moment(dateRange.from)
                .tz("Europe/Istanbul")
                .format("YYYY-MM-DD")) &&
          (!dateRange.to ||
            roleCreatedAt <=
              moment(dateRange.to).tz("Europe/Istanbul").format("YYYY-MM-DD"));

        const permissionMatch =
          selectedPermissions.length === 0 ||
          selectedPermissions.every((selected) =>
            role.permissions.some((perm) =>
              perm.name.toLowerCase().includes(selected.value.toLowerCase())
            )
          );

        return (
          (roleId.includes(searchQuery.toLowerCase()) ||
            role.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
          permissionMatch &&
          isInDateRange
        );
      });
    }

    if (isEditableFilter !== null) {
      filtered = filtered.filter(
        (role) => role.is_editable === isEditableFilter
      );
    }
    if (isDeleteableFilter !== null) {
      filtered = filtered.filter(
        (role) => role.is_deleteable === isDeleteableFilter
      );
    }
    if (minUsers)
      filtered = filtered.filter((item) => item.users_count >= minUsers);
    if (maxUsers)
      filtered = filtered.filter((item) => item.users_count <= maxUsers);
    setFilteredData(filtered);
  }, [
    searchQuery,
    selectedPermissions,
    dateRange,
    isEditableFilter,
    isDeleteableFilter,
    roles,
    minUsers,
    maxUsers,
  ]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handlePermissionChange = (selectedOptions) => {
    setSelectedPermissions(selectedOptions || []);
  };

  const handleDateChange = (e) => {
    setDateRange((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  function handleDelete(id, name) {
    dispatch(deleteRole(id, name));
  }

  const handleEdit = (role) => {
    setEditingRole(role);
    setEditModalShow(true);
  };
  const handleShow = (role) => {
    setShowingRole(role);
    setDetailModalShow(true);
  };
  return (
    <Fragment>
      <Card className="custom-card m-0">
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
              defaultValue={{ label: itemsPerPage, value: itemsPerPage }}
              onChange={(e) => setItemsPerPage(e.value)}
              value={{ label: `عرض ${itemsPerPage}`, value: itemsPerPage }}
            />
          </Col>

          <Col sm={12}>
            <Accordion
              flush
              defaultActiveKey={"0"}
              className="accordionicon-left  z-0"
            >
              <Accordion.Item eventKey="0">
                <Accordion.Header>البحث المتقدم</Accordion.Header>
                <Accordion.Body className="px-0">
                  <div>
                    <Row className="gy-3 gx-2">
                      <Col md={12} lg={6} xxl={3}>
                        <Form.Label htmlFor="permissions-select">
                          الصلاحيات
                        </Form.Label>
                        <Select
                          options={MultipleSelect}
                          classNamePrefix="Select2"
                          isClearable={false}
                          isMulti
                          isSearchable
                          id="permissions-select"
                          onChange={handlePermissionChange}
                          placeholder={"اختر الصلاحيات"}
                        />
                      </Col>

                      <Col md={12} lg={12} xxl={3}>
                        <Row className="gy-3 gx-2">
                          <Col md={12} lg={6} xxl={6}>
                            <Form.Label>قابل للتعديل</Form.Label>

                            <Select
                              options={yesNoOptions}
                              classNamePrefix="Select2"
                              isClearable
                              onChange={(selectedOption) =>
                                setIsEditableFilter(
                                  selectedOption ? selectedOption.value : null
                                )
                              }
                              placeholder="اختر"
                            />
                          </Col>
                          <Col md={12} lg={6} xxl={6}>
                            <Form.Label>قابل للحذف</Form.Label>
                            <Select
                              options={yesNoOptions}
                              classNamePrefix="Select2"
                              isClearable
                              onChange={(selectedOption) =>
                                setIsDeleteableFilter(
                                  selectedOption ? selectedOption.value : null
                                )
                              }
                              placeholder="اختر"
                            />
                          </Col>
                        </Row>
                      </Col>
                      <Col md={12} lg={6} xxl={3}>
                        <Form.Label htmlFor="period">عدد المستخدمين</Form.Label>
                        <InputGroup>
                          <InputGroup.Text>
                            <i className="ri-group-line"></i>
                          </InputGroup.Text>
                          <NumericFormat
                            className={`form-control`}
                            id="period"
                            placeholder="أدنى"
                            value={minUsers}
                            onValueChange={(values) =>
                              setMinUsers(values.floatValue || "")
                            }
                          />

                          <NumericFormat
                            className={`form-control`}
                            id="period"
                            placeholder="أقصى"
                            value={maxUsers}
                            onValueChange={(values) =>
                              setMaxUsers(values.floatValue || "")
                            }
                          />
                          <button
                            className="btn btn-light z-0 border"
                            onClick={() => {
                              setMinUsers("");
                              setMaxUsers("");
                            }}
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        </InputGroup>
                      </Col>
                      <Col md={12} lg={6} xxl={3}>
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
            data={filteredData}
            itemsPerPage={itemsPerPage}
            columns={rolesColumns}
            pageName={"role"}
            functions={{
              handleDelete: profile?.user?.role_id === 2 ? handleDelete : null,
              handleDetail: handleShow,
              handleUpdate: profile?.user?.role_id === 2 ? handleEdit : null,
            }}
          />
        </Card.Body>
      </Card>

      <EditRoleModal
        open={editModalShow}
        close={() => {
          setEditModalShow(!editModalShow);
        }}
        role={editingRole}
      />
      <DetailRoleModal
        open={detailModalShow}
        close={() => {
          setDetailModalShow(!detailModalShow);
        }}
        role={showingRole}
      />
    </Fragment>
  );
};

export default Roles;
