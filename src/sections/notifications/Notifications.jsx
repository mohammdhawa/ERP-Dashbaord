import React, { Fragment, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { MutatingDots } from "react-loader-spinner";
import { PageHeader } from "../../components";
import TablePaginationServer from "../../components/TablePaginationServer";
import {
  fetchNotifications,
  markNotificationRead,
} from "../../redux/actions/notificationsActions";
import { referenceLink } from "../../data/referenceRoutes";

const Notifications = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, meta, fetchLoading, error, unreadCount } = useSelector(
    (state) => state.notifications
  );
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Server-paginated, newest first (server ordering).
  useEffect(() => {
    dispatch(fetchNotifications(page, itemsPerPage));
  }, [dispatch, page, itemsPerPage]);

  const handleClick = (notify) => {
    // Idempotent on the server; only fire for unread to save a request. Pass
    // the current page so a failed mark-read re-syncs the page being viewed.
    if (!notify.is_read) {
      dispatch(markNotificationRead(notify.id, page, itemsPerPage));
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
              {/* An INLINE spinner. <Loader /> is the route-level viewport
                  overlay — rendering it inside this card blurred the whole page
                  to load one list, and looked nothing like the other lists,
                  which all spin inside their own panel. */}
              {fetchLoading ? (
                <div className="d-flex justify-content-center py-5">
                  <MutatingDots
                    visible
                    height="100"
                    width="100"
                    color="var(--primary-color)"
                    secondaryColor="var(--secondary-color)"
                    radius="12.5"
                    ariaLabel="mutating-dots-loading"
                  />
                </div>
              ) : error ? (
                <div className="p-5 text-center" role="alert">
                  <span className="avatar avatar-xl avatar-rounded bg-danger-transparent">
                    <i className="ri-error-warning-line fs-2"></i>
                  </span>
                  <h6 className="fw-medium mt-3">{error}</h6>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm mt-2"
                    onClick={() =>
                      dispatch(fetchNotifications(page, itemsPerPage))
                    }
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
                        className={`list-group-item p-0 ${
                          notify.is_read ? "" : "bg-primary-transparent"
                        }`}
                      >
                        {/* The row is a <button> rather than a clickable <li>:
                            as a list item it took no focus and could not be
                            activated by keyboard, so the whole notifications
                            screen was mouse-only. */}
                        <button
                          type="button"
                          className="d-flex align-items-start gap-3 py-3 px-3 w-100 text-end border-0 bg-transparent"
                          style={{
                            cursor:
                              notify.is_read && !link ? "default" : "pointer",
                          }}
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
                            aria-hidden="true"
                          ></i>
                        </span>
                        {/* <span>s rather than <p>s: a button's content model
                            is phrasing content only, and browsers repair a
                            nested <p> by breaking the button out of the flow. */}
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center justify-content-between">
                            <span
                              className={`d-block mb-1 ${
                                notify.is_read ? "" : "fw-semibold"
                              }`}
                            >
                              {notify.title}
                            </span>
                            <span className="text-muted fs-12">
                              {moment(notify.created_at).format(
                                "YYYY-MM-DD HH:mm"
                              )}
                            </span>
                          </div>
                          {notify.body && (
                            <span className="d-block text-muted mb-1 fs-13">
                              {notify.body}
                            </span>
                          )}
                          <div className="d-flex gap-2 align-items-center">
                            {notify.type && (
                              <span className="badge bg-light text-muted">
                                {notify.type}
                              </span>
                            )}
                            {link && (
                              <span className="link-primary fs-12">
                                <i
                                  className="ri-external-link-line align-middle"
                                  aria-hidden="true"
                                ></i>{" "}
                                الانتقال للسجل
                              </span>
                            )}
                            {!notify.is_read && (
                              <span className="badge bg-primary">جديد</span>
                            )}
                          </div>
                        </div>
                        </button>
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
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(value) => {
                    setPage(1);
                    setItemsPerPage(value);
                  }}
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
