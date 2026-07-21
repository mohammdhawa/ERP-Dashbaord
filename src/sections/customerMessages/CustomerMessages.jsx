import { Fragment, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useDispatch, useSelector } from "react-redux";
import { Card, Col, Row, Modal } from "react-bootstrap";
import PageHeader from "../../components/Pageheader";
import DataTableServer from "../../components/DataTableServer";
import Select from "react-select";
import { ShowPerPage } from "../../data/General";
import {
  fetchCustomerMessages,
  fetchCustomerMessageDetails,
} from "../../redux/actions/customerMessagesActions";
import { CustomersMessagesColumns } from "../../data/Columns";
import Loader from "../../components/Loader";

const CustomerMessages = () => {
  const dispatch = useDispatch();
  const {
    data,
    loading = false,
    totalPages = 0,
    totalCount = 0,
    error,
    currentPage = 1,
    perPage = 10,
  } = useSelector((state) => state.customerMessages || {});
  const messages = Array.isArray(data) ? data : [];

  const [itemsPerPage, setItemsPerPage] = useState(perPage);
  const [activePage, setActivePage] = useState(currentPage);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { messageDetails, messageDetailsLoading, messageDetailsError } =
    useSelector((state) => state.customerMessages);

  useEffect(() => {
    dispatch(fetchCustomerMessages(activePage, itemsPerPage));
  }, [dispatch, activePage, itemsPerPage]);

  const handlePageChange = (page) => setActivePage(page);

  const handleViewMessage = (id) => {
    setShowDetailsModal(true);
    dispatch(fetchCustomerMessageDetails(id));
  };

  const handleDeleteMessage = (id) => {};

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  const transformedMessages = messages.map((message) => ({
    id: message.id,
    name: message.name || "غير معروف",
    email: message.email || "غير معروف",
    phone: message.phone || "غير معروف",
    message: message.message || "لا يوجد رسالة",
    created_at: message.created_at,
  }));

  return (
    <Fragment>
      <Helmet>
        <title>لوحة التحكم | رسائل العملاء</title>
      </Helmet>

      <Fragment>
        <PageHeader
          homepage="خدمة العملاء"
          activepage="رسائل العملاء"
          page="رسائل العملاء"
        />
        <Row>
          <Col xl={12}>
            <Card className="custom-card mt-3">
              <div className="row flex-wrap gx-2 gy-3 p-3 justify-content-between align-items-center">
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
              </div>
              <Card.Body>
                <DataTableServer
                  columns={CustomersMessagesColumns}
                  data={transformedMessages}
                  itemsPerPage={itemsPerPage}
                  currentPage={activePage}
                  totalPages={totalPages}
                  pageName="message"
                  onPageChange={handlePageChange}
                  dataCount={totalCount}
                  loading={loading}
                  functions={{
                    handleDetail: (item) => handleViewMessage(item.id),
                    handleDelete: (id) => handleDeleteMessage(id),
                  }}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Fragment>

      {showDetailsModal && (
        <Modal
          show={showDetailsModal}
          onHide={() => setShowDetailsModal(false)}
          centered
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>تفاصيل الرسالة</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {messageDetailsLoading ? (
              <Loader />
            ) : messageDetailsError ? (
              <div className="alert alert-danger" role="alert">
                {messageDetailsError}
              </div>
            ) : messageDetails ? (
              <Row>
                <Col md={6} className="mb-3">
                  <label className="form-label">الاسم</label>
                  <p className="form-control-static">{messageDetails.name}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <label className="form-label">البريد الإلكتروني</label>
                  <p className="form-control-static">{messageDetails.email}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <label className="form-label">رقم الهاتف</label>
                  <p className="form-control-static">{messageDetails.phone}</p>
                </Col>
                <Col md={6} className="mb-3">
                  <label className="form-label">تاريخ الإرسال</label>
                  <p className="form-control-static">
                    {new Date(messageDetails.created_at).toLocaleDateString(
                      "tr-TR",
                      {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </Col>
                <Col md={12} className="mb-3">
                  <label className="form-label">الرسالة</label>
                  <div className="p-3 bg-light rounded">
                    {messageDetails.message}
                  </div>
                </Col>
              </Row>
            ) : null}
          </Modal.Body>
        </Modal>
      )}
    </Fragment>
  );
};

export default CustomerMessages;
