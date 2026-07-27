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

const Admins = () => {
  const dispatch = useDispatch();
  const { fetchUsersLoading, users, totalPages, total } = useSelector(
    (state) => state.users
  );
  const { roles } = useSelector((state) => state.roles);

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activePage, setActivePage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState({
    label: "Super Admin",
    value: "Super Admin",
  });
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
      fetchUsers(
        activePage,
        itemsPerPage,
        debouncedSearchQuery,
        selectedRole?.value,
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
  useEffect(() => {
    dispatch(fetchRoles());
  }, [dispatch]);

  useEffect(() => {
    setActivePage(1);
  }, [
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

  const handleDelete = (id) => dispatch(deleteUser(id));
  const handleDisableUser = (id) => dispatch(disableUser(id));
  const handleEnableUser = (id) => dispatch(enableUser(id));
  const handlePageChange = (page) => setActivePage(page);
  const rolesOptions = roles
    .filter((role) => !["Normal User"].includes(role.name))
    .map((role) => ({
      value: role.name,
      label: role.name,
    }));
  return (
    <Fragment>
      <Helmet>
        <title>Dashboard | Admins</title>
      </Helmet>
      <PageHeader
        homepage="لائحة الاداريين"
        activepage="الاداريين"
        page="لائحة الاداريين"
      >
        <ProtectedElement
          element={
            <button
              onClick={() => SetAddUserModalShow(true)}
              className="btn btn-secondary btn-wave"
            >
              <i className="ri-user-add-line align-middle me-1"></i> اضافة اداري
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
              <Col md={4} lg={4} xl={2} xxl={2}>
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
                        <Col md={12} lg={6} xxl={3}>
                          <Form.Label htmlFor="filter-role">الدور</Form.Label>
                          <Select
                            options={rolesOptions}
                            placeholder="اختر الدور"
                            classNamePrefix="Select2"
                            id="filter-role"
                            value={selectedRole}
                            onChange={setSelectedRole}
                          />
                        </Col>
                        <Col md={12} lg={6} xxl={3}>
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
                        <Col md={12} lg={6} xxl={3}>
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
                        <Col md={12} lg={6} xxl={3}>
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
                      <>
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
                      </>
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
        excludeRoles={["Normal user"]}
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
    </Fragment>
  );
};

export default Admins;
