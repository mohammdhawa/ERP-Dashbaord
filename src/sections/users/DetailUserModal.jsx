import React, { useState } from "react";
import {
  Badge,
  Card,
  Col,
  Form,
  ListGroup,
  Modal,
  OverlayTrigger,
  Row,
  Tooltip,
} from "react-bootstrap";
import moment from "moment-timezone";
import { Link } from "react-router-dom";
import { toastNotify } from "../../utils";
// Direct import, not via data/Imagedata: that registry is in the entry chunk,
// so listing this placeholder there loaded it on every page for two unrouted
// screens.
import NoUserProfile from "../../assets/images/NoUserProfile.jpg";
const DetailUserModal = ({ open, close, user }) => {
  const handleCloseModal = () => {
    close();
  };
  return (
    <Modal
      show={open}
      size="lg"
      onHide={handleCloseModal}
      keyboard={false}
      centered
      aria-hidden={false}
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 ">{user?.id}#</span>
            <p className="m-0 fs-12 text-muted">
              معلومات المستخدم {user?.name}
            </p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column border rounded px-3 py-2">
          <Row className="m-0 borde py-2 border-primary mb-2">
            <div className="d-flex p-0 flex-column align-items-center ">
              <div className="d-flex  flex-column gap-2 align-items-center ">
                <span
                  style={{
                    width: "8rem",
                    height: "8rem",
                    overflow: "hidden",
                  }}
                  className="avatar bg-light avatar-rounded"
                >
                  <img
                    src={user?.image ? user?.image : NoUserProfile}
                    alt="img"
                    style={{
                      objectFit: "cover",
                      transform: user?.image ? "" : "scale(1.3)",
                    }}
                  />
                </span>
                <div className="d-flex flex-column align-items-center">
                  <p className="fs-18  fw-bold mb-0">{user?.name}</p>
                  <p className="fs-13 fw-light text-muted mb-0">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
            <Col>
              <Row className="g-2 m-0 mt-2 py-0 d-felx align-items-cente ">
                <Col
                  xs={6}
                  className="mt-0 border-end border-inline-end-dashed"
                >
                  <div className="d-flex flex-column rounded align-items-center gap-1 p-2 ">
                    <p className="fs-13 fw-light text-muted mb-0">الدور</p>
                    <p className="fs-15 fw-bolder mb-0">{user?.role?.name}</p>
                  </div>
                </Col>

                <Col xs={6} className="mt-0 ">
                  <div className="d-flex flex-column rounded align-items-center gap-1 p-2 ">
                    <p className="fs-13 fw-light  text-muted mb-0">
                      تاريخ التسجيل
                    </p>

                    <p className="fs-15 fw-bolder mb-0">
                      {moment(user?.created_at)
                        .tz("Europe/Istanbul")
                        .format("YYYY-MM-DD")}
                    </p>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
          <Row>
            <Col>
              <div
                style={{
                  width: "100%",
                  height: "1px",
                  background: "var(--default-border)",
                }}
                className="my-2"
              ></div>
            </Col>
          </Row>
          <Row className="mt-1">
            <Col>
              <ListGroup className="border-0 ">
                <ListGroup.Item className="px-0 py-2 border-0 ">
                  <Badge className="py-2 px-4 bg-primary-transparent rounded-3 fs-13 fw-bolder">
                    <i className="ri-user-line me-1"></i>
                    المعلومات الشخصية
                  </Badge>
                </ListGroup.Item>
                <ListGroup.Item className="border-0 px-0 ">
                  <Row className="g-2">
                    <Col xs={12} lg={6}>
                      <Form.Label>الاسم</Form.Label>
                      <Form.Control
                        type="text"
                        disabled
                        className="border-0"
                        value={user?.name}
                      />
                    </Col>

                    <Col xs={12} lg={6}>
                      <Form.Label>رقم الهاتف</Form.Label>
                      <div className="position-relative authentication-input">
                        <Form.Control
                          disabled
                          className="border-0"
                          type={"text"}
                          value={user?.phone}
                          size=""
                        />
                        <span
                          style={{
                            top: "-4px",
                          }}
                          className="show-password-button d-flex flex-row-reverse align-items-center gap-1 "
                        >
                          <Link
                            to="#"
                            className="text-muted"
                            onClick={(e) => {
                              e.preventDefault();
                              if (user?.phone) {
                                navigator.clipboard.writeText(user?.phone);
                                toastNotify("تم نسخ رقم الهاتف", "success");
                              }
                            }}
                          >
                            <i className="ri-file-copy-line align-middle"></i>
                          </Link>
                          <Link
                            onClick={(e) => {
                              e.preventDefault();
                              if (user?.phone) {
                                window.open(
                                  `https://wa.me/${user?.phone}`,
                                  "_blank"
                                );
                              }
                            }}
                            className="text-muted"
                          >
                            <i className="ri-whatsapp-line text-success" />
                          </Link>
                        </span>
                      </div>
                    </Col>
                  </Row>
                </ListGroup.Item>
              </ListGroup>
            </Col>
          </Row>
          <Row>
            <Col>
              <ListGroup>
                <ListGroup.Item className="border-0 px-0 d-flex align-items-center justify-content-between   ">
                  <Badge className="py-2 px-4 bg-primary-transparent rounded-3 fs-13 fw-bolder">
                    <i className="ri-settings-3-line me-1"></i>
                    معلومات الحساب
                  </Badge>
                  <span
                    className={`fs-12 text-${
                      user?.deleted_at ? "danger" : "success"
                    }   align-middle  `}
                  >
                    {user?.deleted_at ? <>معطل</> : <>نشط</>}
                  </span>
                </ListGroup.Item>
                <ListGroup.Item className="px-0 border-0">
                  <Row className="g-2">
                    <Col xs={12} lg={6}>
                      <Form.Label>البريد الالكتروني</Form.Label>
                      <div className="position-relative authentication-input">
                        <Form.Control
                          disabled
                          className="border-0"
                          type={"text"}
                          value={user?.email}
                          size=""
                        />

                        <span
                          style={{
                            top: "-4px",
                          }}
                          className="show-password-button d-flex flex-row-reverse align-items-center gap-1 "
                        >
                          <Link
                            to="#"
                            className=" m text-muted"
                            onClick={(e) => {
                              e.preventDefault();
                              if (user?.email) {
                                navigator.clipboard.writeText(user?.email);
                                toastNotify(
                                  "تم نسخ البريد الالكتروني",
                                  "success"
                                );
                              }
                            }}
                          >
                            <i className="ri-file-copy-line align-middle"></i>
                          </Link>
                          <span
                            className={`fs-12 text-${
                              !user?.is_verified ? "danger" : "success"
                            } align-middle  `}
                          >
                            {user?.is_verified ? (
                              <OverlayTrigger
                                placement={"top"}
                                overlay={<Tooltip>تم التحقق</Tooltip>}
                              >
                                <i className="ri-check-line"></i>
                              </OverlayTrigger>
                            ) : (
                              <OverlayTrigger
                                placement={"top"}
                                overlay={<Tooltip>لم يتم التحقق</Tooltip>}
                              >
                                <i className="ri-close-line"></i>
                              </OverlayTrigger>
                            )}
                          </span>
                        </span>
                      </div>
                    </Col>
                    <Col xs={12} lg={6}>
                      <Form.Label>تاريخ التسجيل</Form.Label>
                      <Form.Control
                        type="text"
                        disabled
                        className="border-0"
                        value={moment(user?.created_at)
                          .tz("Europe/Istanbul")
                          .format("YYYY-MM-DD - HH:mm:ss")}
                      />
                    </Col>
                    {user?.is_verified ? (
                      <Col xs={12} lg={6}>
                        <Form.Label>تاريخ التأكيد</Form.Label>
                        <Form.Control
                          type="text"
                          disabled
                          className="border-0"
                          value={moment(user?.email_verified_at)
                            .tz("Europe/Istanbul")
                            .format("YYYY-MM-DD - HH:mm:ss")}
                        />
                      </Col>
                    ) : (
                      <></>
                    )}
                    {user?.deleted_at ? (
                      <Col xs={12} lg={6}>
                        <Form.Label>تاريخ التعطيل</Form.Label>
                        <Form.Control
                          type="text"
                          disabled
                          className="border-0"
                          value={moment(user?.deleted_at)
                            .tz("Europe/Istanbul")
                            .format("YYYY-MM-DD - HH:mm:ss")}
                        />
                      </Col>
                    ) : (
                      <></>
                    )}
                    <Col xs={12} lg={6}>
                      <Form.Label>تاريخ اخر تعديل</Form.Label>
                      <Form.Control
                        type="text"
                        disabled
                        className="border-0"
                        value={moment(user?.updated_at)
                          .tz("Europe/Istanbul")
                          .format("YYYY-MM-DD - HH:mm:ss")}
                      />
                    </Col>
                  </Row>
                </ListGroup.Item>
              </ListGroup>
            </Col>
          </Row>
          <Row>
            <Col>
              <ListGroup>
                <ListGroup.Item className="border-0 px-0">
                  <Badge className="py-2 px-4 bg-primary-transparent rounded-3 fs-13 fw-bolder">
                    <i className="ri-key-line me-1"></i>
                    الصلاحيات
                  </Badge>
                </ListGroup.Item>
                <ListGroup.Item className="border-0 px-0">
                  <div
                    style={{
                      maxHeight: "7rem",
                      overflow: "scroll",
                      scrollbarWidth: "none",
                    }}
                    className="d-flex gap-1  flex-wrap"
                  >
                    {user?.role?.permissions?.map((perm) => (
                      <Badge
                        draggable
                        key={perm.id}
                        className="fs-12 py-2 px-3 bg-secondary-transparent align-middle "
                      >
                        {perm.name}
                      </Badge>
                    ))}
                  </div>
                </ListGroup.Item>
              </ListGroup>
            </Col>
          </Row>

          <Row className=" mt-2">
            <Col>
              <button
                type="button"
                className="btn btn-light fw-md w-100"
                onClick={handleCloseModal}
              >
                إلغاء
              </button>
            </Col>
          </Row>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default DetailUserModal;
