import React, { useEffect, useState } from "react";
import { Col, Form, Row, Modal } from "react-bootstrap";
import { faqsPriority, faqCategories } from "../../data/General";
import moment from "moment";

const DetailFaqModalDetailFaqModal = ({ open, close, faq }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState(null);
  const [priority, setPriority] = useState(null);
  const [status, setStatus] = useState(false);

  useEffect(() => {
    if (faq) {
      setQuestion(faq?.question || "");
      setAnswer(faq?.answer || "");
      setCategory(
        faq?.category
          ? faqCategories.find((cat) => cat.value === faq.category)
          : null
      );
      setPriority(
        faq?.priority
          ? faqsPriority.find((prio) => prio.value === faq.priority)
          : null
      );
      setStatus(faq?.status);
    }
  }, [faq]);

  const handleCloseModal = () => {
    setTimeout(() => {
      setQuestion(faq?.question || "");
      setAnswer(faq?.answer || "");
      setCategory(
        faq?.category
          ? faqCategories.find((cat) => cat.value === faq.category)
          : null
      );
      setPriority(
        faq?.priority
          ? faqsPriority.find((prio) => prio.value === faq.priority)
          : null
      );
      setStatus(faq?.status);
      close();
    }, 100);
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
        <Modal.Title as="h6" className="modal-title">
          <div className="d-flex flex-column align-items-start gap-2">
            <span className="fw-bold fs-5 text-primary">{faq?.id}#</span>
            <p className="m-0 fs-12 text-muted">عرضٍ معلومات السؤال </p>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-2">
          <Row>
            <Col>
              <Form.Label htmlFor="id">رقم السؤال</Form.Label>
              <Form.Control disabled as="input" id="id" value={faq?.id} />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="question">نص السؤال</Form.Label>
              <Form.Control
                disabled
                as="input"
                id="question"
                value={question}
              />
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="answer">الإجابة</Form.Label>
              <Form.Control as="textarea" value={answer} id="answer" disabled />
            </Col>
          </Row>
          <Row className="g-2">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="category">تصنيف السؤال</Form.Label>
              <Form.Control
                as="input"
                value={category?.label || ""}
                id="category"
                disabled
              />
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="priority">أولوية العرض</Form.Label>
              <Form.Control
                as="input"
                value={priority?.label || ""}
                id="priority"
                disabled
              />
            </Col>
          </Row>
          <Row>
            <Col sm={12}>
              <Form.Label htmlFor="display">عرض في الصفحة الرئيسية</Form.Label>
              <Form.Control
                as="input"
                value={status === 1 ? "نعم" : "لا"}
                id="display"
                disabled
              />
            </Col>
          </Row>
          <Row className="g-2">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="created_at">تاريخ الانشاء</Form.Label>
              <Form.Control
                as="input"
                value={
                  faq?.created_at
                    ? moment(faq?.created_at)
                        .tz("Europe/Istanbul")
                        .format("HH:mm:ss - YYYY-MM-DD")
                    : ""
                }
                id="created_at"
                disabled
              />
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="created_at">تاريخ اخر تعديل</Form.Label>
              <Form.Control
                as="input"
                value={
                  faq?.updated_at
                    ? moment(faq?.updated_at)
                        .tz("Europe/Istanbul")
                        .format("HH:mm:ss - YYYY-MM-DD")
                    : ""
                }
                id="created_at"
                disabled
              />
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
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default DetailFaqModalDetailFaqModal;
