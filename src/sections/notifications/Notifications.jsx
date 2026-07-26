import React, { Fragment, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { PageHeader, Loader } from "../../components";
import TablePaginationServer from "../../components/TablePaginationServer";
import {
  fetchNotifications,
  markNotificationRead,
} from "../../redux/actions/notificationsActions";

// reference {type, id} → module list route (no record detail pages in Phase 1).
const referenceLink = (reference) => {
  if (!reference?.type) return null;
  const type = reference.type.toLowerCase();
  if (type.includes("employee")) return "/hr/employees";
  if (type.includes("department")) return "/departments";
  if (type.includes("user")) return "/users";
  if (type.includes("role")) return "/roles";
  return null;
};

const Notifications = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, meta, fetchLoading, error, unreadCount } = useSelector(
    (state) => state.notifications
  );
  const [page, setPage] = useState(1);

  // Paginated 15/page, newest first (server ordering).
  useEffect(() => {
    dispatch(fetchNotifications(page));
  }, [dispatch, page]);

  const handleClick = (notify) => {
    // Idempotent on the server; only fire for unread to save a request. Pass
    // the current page so a failed mark-read re-syncs the page being viewed.
    if (!notify.is_read) {
      dispatch(markNotificationRead(notify.id, page));
    }
    const link = referenceLink(notify.reference);
    if (link) navigate(link);
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | الإشعارات</title>
      </Helmet>
      <PageHeader homepage="الإشعارات" activepage="الحساب" page="الإشعارات">
        <span className="badge bg-secondary-transparent fs-13">
          {unreadCount} غير مقروءة
        </span>
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body className="p-0">
              {fetchLoading ? (
                <Loader />
              ) : error ? (
                <div className="p-5 text-center" role="alert">
                  <span className="avatar avatar-xl avatar-rounded bg-danger-transparent">
                    <i className="ri-error-warning-line fs-2"></i>
                  </span>
                  <h6 className="fw-medium mt-3">{error}</h6>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm mt-2"
                    onClick={() => dispatch(fetchNotifications(page))}
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="p-5 text-center">
                  <span className="avatar avatar-xl avatar-rounded bg-secondary-transparent">
                    <i className="ri-notification-off-line fs-2"></i>
                  </span>
                  <h6 className="fw-medium mt-3">لا يوجد إشعارات</h6>
                </div>
              ) : (
                <ul className="list-group list-group-flush" aria-label="الإشعارات">
                  {items.map((notify) => {
                    const link = referenceLink(notify.reference);
                    return (
                      <li
                        key={notify.id}
                        className={`list-group-item d-flex align-items-start gap-3 py-3 ${
                          notify.is_read ? "" : "bg-primary-transparent"
                        }`}
                        style={{ cursor: notify.is_read && !link ? "default" : "pointer" }}
                        onClick={() => handleClick(notify)}
                      >
                        <span
                          className={`avatar avatar-rounded ${
                            notify.is_read
                              ? "bg-light text-muted"
                              : "bg-primary-transparent"
                          }`}
                        >
                          <i
                            className={`fs-18 ${
                              notify.is_read
                                ? "ri-notification-line"
                                : "ri-notification-3-fill"
                            }`}
                          ></i>
                        </span>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center justify-content-between">
                            <p
                              className={`mb-1 ${
                                notify.is_read ? "" : "fw-semibold"
                              }`}
                            >
                              {notify.title}
                            </p>
                            <span className="text-muted fs-12">
                              {moment(notify.created_at).format(
                                "YYYY-MM-DD HH:mm"
                              )}
                            </span>
                          </div>
                          {notify.body && (
                            <p className="text-muted mb-1 fs-13">
                              {notify.body}
                            </p>
                          )}
                          <div className="d-flex gap-2 align-items-center">
                            {notify.type && (
                              <span className="badge bg-light text-muted">
                                {notify.type}
                              </span>
                            )}
                            {link && (
                              <span className="link-primary fs-12">
                                <i className="ri-external-link-line align-middle"></i>{" "}
                                الانتقال للسجل
                              </span>
                            )}
                            {!notify.is_read && (
                              <span className="badge bg-primary">جديد</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card.Body>
            {meta?.total > 0 && (
              <Card.Footer>
                <TablePaginationServer
                  currentPage={meta.current_page}
                  totalPages={meta.last_page}
                  onPageChange={setPage}
                  currentData={items}
                  dataCount={meta.total}
                />
              </Card.Footer>
            )}
          </Card>
        </Col>
      </Row>
    </Fragment>
  );
};

export default Notifications;
