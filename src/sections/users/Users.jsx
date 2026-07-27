import { Fragment, useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteUser,
  disableUser,
  enableUser,
  fetchUsers,
} from "../../redux/actions/usersActions";
import { Helmet } from "react-helmet";
import { PageHeader } from "../../components";
import ProtectedElement from "../../pages/layout/ProtectedElement";
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
import Select from "react-select";
import { ShowPerPage } from "../../data/General";
import { usersColumns } from "../../data/Columns";
import AddUserModal from "./AddUserModal";
import DetailUserModal from "./DetailUserModal";
import UpdateUserModal from "./UpdateUserModal";
import DataTableServer from "../../components/DataTableServer";
import { fetchRoles } from "../../redux/actions/rolesActions";
import PackageAssignModal from "./PackageAssignModal";

const Users = () => {
  const dispatch = useDispatch();
  const { fetchUsersLoading, users, totalPages, total } = useSelector(
    (state) => state.users
  );
  const { roles } = useSelector((state) => state.roles);
  const [selectedRole, setSelectedRole] = useState(null);

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activePage, setActivePage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [registerDate, setRegisterDate] = useState({ from: "", to: "" });
  const [confirmationDate, setConfirmationDate] = useState({
    from: "",
    to: "",
  });
  const [disabledDate, setDisabledDate] = useState({ from: "", to: "" });

  const [addUserModalShow, SetAddUserModalShow] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [willBeShow, setWillBeShow] = useState("");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [willBeUpdate, setWillBeUpdate] = useState("");
  const [packageAssignModalOpen, setPackageAssignModalOpen] = useState(false);
  const [willBeAssignedUser, setWillBeAssignedUser] = useState("");
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
    dispatch(fetchRoles());
  }, [dispatch]);

  useEffect(() => {
    setActivePage(1);
  }, [debouncedSearchQuery, registerDate, disabledDate, confirmationDate]);

  const filteredRolesOptions = roles
    .filter((role) => !["Manager", "Super Admin"].includes(role.name))
    .map((role) => ({ value: role.name, label: role.name }));

  useEffect(() => {
    dispatch(
      fetchUsers(
        activePage,
        itemsPerPage,
        debouncedSearchQuery,
        selectedRole ? selectedRole.value : "Normal user",
        registerDate?.from,
        registerDate?.to,
        disabledDate?.from,
        disabledDate?.to,
        confirmationDate?.from,
        confirmationDate?.to
      )
    );
  }, [
    dispatch,
    activePage,
    itemsPerPage,
    debouncedSearchQuery,
    selectedRole,
    registerDate,
    disabledDate,
    confirmationDate,
  ]);

  const handleDetail = (user) => {
    setWillBeShow(user);
    setShowDetailModal(true);
  };

  const handleUpdate = (user) => {
    setWillBeUpdate(user);
    setShowUpdateModal(true);
  };

  const handlePackageAssign = (user) => {
    setWillBeAssignedUser(user);
    setPackageAssignModalOpen(true);
  };
  const handleDelete = (id) => dispatch(deleteUser(id));
  const handleDisableUser = (id) => dispatch(disableUser(id));
  const handleEnableUser = (id) => dispatch(enableUser(id));
  const handlePageChange = (page) => setActivePage(page);

  return (
    <Fragment>
      <Helmet>
        <title>Dashboard | Users</title>
      </Helmet>
      <PageHeader
        homepage="لائحة المستخدمين"
        activepage="المستخدمين"
        page="لائحة المستخدمين"
      >
        <ProtectedElement
          element={
            <button
              onClick={() => SetAddUserModalShow(true)}
              className="btn btn-secondary btn-wave"
            >
              <i className="ri-user-add-line align-middle me-1"></i> اضافة
              مستخدم
            </button>
          }
          requiredPermissions={["create_user"]}
        />
      </PageHeader>
      <Row>
        <Col xl={12}>
          <Card className="custom-card mt-3">
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
                  classNamePrefix="Select2"
                  defaultValue={{ label: itemsPerPage, value: itemsPerPage }}
                  onChange={(e) => {
                    setItemsPerPage(e.value);
                    setActivePage(1);
                  }}
                  value={{ label: `عرض ${itemsPerPage}`, value: itemsPerPage }}
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
                        {/* <Col md={12} lg={6} xxl={4}>
                          <Form.Label htmlFor="filter-role">الدور</Form.Label>
                          <Select
                            options={filteredRolesOptions}
                            placeholder="اختر الدور"
                            classNamePrefix="Select2"
                            id="filter-role"
                            isClearable
                            isSearchable
                            value={selectedRole}
                            onChange={setSelectedRole}
                          />
                        </Col> */}
                        <Col md={12} lg={6} xxl={4}>
                          <Form.Label>تاريخ التسجيل</Form.Label>
                          <InputGroup>
                            <InputGroup.Text>
                              <i className="ri-calendar-line"></i>
                            </InputGroup.Text>
                            <Form.Control
                              type="date"
                              value={registerDate.from}
                              onChange={(e) =>
                                setRegisterDate({
                                  ...registerDate,
                                  from: e.target.value,
                                })
                              }
                            />
                            <Form.Control
                              type="date"
                              value={registerDate.to}
                              onChange={(e) =>
                                setRegisterDate({
                                  ...registerDate,
                                  to: e.target.value,
                                })
                              }
                            />
                            <button
                              className="btn btn-light border z-0"
                              onClick={() =>
                                setRegisterDate({ from: "", to: "" })
                              }
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </InputGroup>
                        </Col>
                        <Col md={12} lg={6} xxl={4}>
                          <Form.Label>تاريخ التأكيد</Form.Label>
                          <InputGroup>
                            <InputGroup.Text>
                              <i className="ri-calendar-line"></i>
                            </InputGroup.Text>
                            <Form.Control
                              type="date"
                              value={confirmationDate.from}
                              onChange={(e) =>
                                setConfirmationDate({
                                  ...confirmationDate,
                                  from: e.target.value,
                                })
                              }
                            />
                            <Form.Control
                              type="date"
                              value={confirmationDate.to}
                              onChange={(e) =>
                                setConfirmationDate({
                                  ...confirmationDate,
                                  to: e.target.value,
                                })
                              }
                            />
                            <button
                              className="btn btn-light border z-0"
                              onClick={() =>
                                setConfirmationDate({ from: "", to: "" })
                              }
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </InputGroup>
                        </Col>
                        <Col md={12} lg={6} xxl={4}>
                          <Form.Label>تاريخ التعطيل</Form.Label>
                          <InputGroup>
                            <InputGroup.Text>
                              <i className="ri-calendar-line"></i>
                            </InputGroup.Text>
                            <Form.Control
                              type="date"
                              value={disabledDate.from}
                              onChange={(e) =>
                                setDisabledDate({
                                  ...disabledDate,
                                  from: e.target.value,
                                })
                              }
                            />
                            <Form.Control
                              type="date"
                              value={disabledDate.to}
                              onChange={(e) =>
                                setDisabledDate({
                                  ...disabledDate,
                                  to: e.target.value,
                                })
                              }
                            />
                            <button
                              className="btn btn-light border z-0"
                              onClick={() =>
                                setDisabledDate({ from: "", to: "" })
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
              <DataTableServer
                columns={usersColumns}
                data={users}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                currentPage={activePage}
                totalPages={totalPages}
                pageName="user"
                onPageChange={handlePageChange}
                functions={{
                  handleDelete,
                  handleUpdate,
                  handleDetail,
                }}
                dataCount={total}
                loading={fetchUsersLoading}
                renderActions={(item) => (
                  <Fragment>
                    {!item?.deleted_at ? (
                      <ProtectedElement
                        element={
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>تعطيل الحساب</Tooltip>}
                          >
                            <button
                              onClick={() => handleDisableUser(item?.id)}
                              className="btn btn-sm btn-warning-light btn-wave"
                            >
                              <i className="ri-prohibited-line align-middle"></i>
                            </button>
                          </OverlayTrigger>
                        }
                        requiredPermissions={["update_user"]}
                      />
                    ) : (
                      <ProtectedElement
                        element={
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>تفعيل الحساب</Tooltip>}
                          >
                            <button
                              onClick={() => handleEnableUser(item?.id)}
                              className="btn btn-sm btn-primary-light btn-wave"
                            >
                              <i className="ri-flashlight-line align-middle"></i>
                            </button>
                          </OverlayTrigger>
                        }
                        requiredPermissions={["update_user"]}
                      />
                    )}
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip>تخصيص باقة</Tooltip>}
                    >
                      <button
                        onClick={() => handlePackageAssign(item)}
                        className="btn btn-sm btn-primary-light btn-wave"
                      >
                        <i className="ri-wallet-line align-middle"></i>
                      </button>
                    </OverlayTrigger>
                  </Fragment>
                )}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <AddUserModal
        open={addUserModalShow}
        close={() => SetAddUserModalShow(false)}
      />
      <DetailUserModal
        user={willBeShow}
        open={showDetailModal}
        close={() => setShowDetailModal(false)}
      />
      <UpdateUserModal
        user={willBeUpdate}
        open={showUpdateModal}
        close={() => setShowUpdateModal(false)}
      />
      <PackageAssignModal
        open={packageAssignModalOpen}
        close={() => setPackageAssignModalOpen(false)}
        user={willBeAssignedUser}
      />
    </Fragment>
  );
};

export default Users;
