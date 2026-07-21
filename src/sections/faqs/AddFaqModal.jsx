import React, { useState } from "react";
import { Col, Form, Row, Modal, Spinner } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { createFaq } from "../../redux/actions/faqActions";
import Swal from "sweetalert2";

import "react-quill/dist/quill.snow.css";
import { faqsPriority, faqCategories } from "../../data/General";
import { AlertWithSwal } from "../../components/SwalAlerts";

const AddFaqModal = ({ open, close }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState(null);
  const [priority, setPriority] = useState(null);
  const [status, setStatus] = useState(false);
  const { loading } = useSelector((state) => state.faqs);
  const [error, setError] = useState({
    question: "",
    answer: "",
    category: "",
    priority: "",
  });

  const dispatch = useDispatch();

  const handleCloseModal = () => {
    setTimeout(() => {
      setError({
        question: "",
        answer: "",
        category: "",
        priority: "",
      });
      setQuestion("");
      setAnswer("");
      setCategory(null);
      setPriority(null);
      setStatus(false);
      close();
    }, 100);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let formError = { question: "", answer: "", category: "", priority: "" };

    if (!question) {
      formError.question = "نص السؤال مطلوب";
    }

    if (!answer) {
      formError.answer = "نص الإجابة مطلوبة";
    }

    if (!category) {
      formError.category = "الفئة مطلوبة";
    }

    if (!priority) {
      formError.priority = "الأولوية مطلوبة";
    }

    if (
      formError.question ||
      formError.answer ||
      formError.category ||
      formError.priority
    ) {
      setError(formError);
      return;
    }

    const faqData = {
      question,
      answer,
      category: category?.value,
      priority: priority?.value,
      status: status ? 1 : 0,
    };

    dispatch(createFaq(faqData))
      .then(() => {
        handleCloseModal();
      })
      .catch((err) => {
        AlertWithSwal("error", "خطأ!", err, "danger");
      });
  };

  return (
    <Modal
      show={open}
      size="lg"
      onHide={handleCloseModal}
      keyboard={false}
      centered
      aria-hidden="false"
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h6" className="modal-title">
          إضافة سؤال شائع
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form className="d-flex flex-column gap-2" onSubmit={handleSubmit}>
          <Row>
            <Col>
              <Form.Label htmlFor="question">نص السؤال</Form.Label>
              <Form.Control
                as="textarea"
                placeholder="ادخل نص السؤال"
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className={error.question ? "is-invalid" : ""}
                required
                maxLength={255}
                style={{
                  height: "6rem",
                  maxHeight: "6rem",
                }}
              />
              {error.question && (
                <div className="text-danger small">{error.question}</div>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Label htmlFor="answer">الإجابة</Form.Label>
              <Form.Control
                as="textarea"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="ادخل الإجابة"
                className={error.answer ? "is-invalid" : ""}
                required
                id="answer"
                style={{
                  maxHeight: "10rem",
                  height: "10rem",
                }}
              />
              {error.answer && (
                <div className="text-danger small">{error.answer}</div>
              )}
            </Col>
          </Row>
          <Row className="g-2">
            <Col sm={12} md={6}>
              <Form.Label htmlFor="category">تصنيف السؤال</Form.Label>
              <Select
                options={faqCategories}
                classNamePrefix="Select2"
                isClearable={false}
                onChange={setCategory}
                placeholder="اختر التصنيف"
                required
                id="category"
                value={category}
              />
              {error.category && (
                <div className="text-danger small">{error.category}</div>
              )}
            </Col>
            <Col sm={12} md={6}>
              <Form.Label htmlFor="priority">أولوية العرض</Form.Label>
              <Select
                options={faqsPriority}
                classNamePrefix="Select2"
                isClearable={false}
                onChange={setPriority}
                placeholder="اختر الأولوية"
                required
                id="priority"
                value={priority}
              />
              {error.priority && (
                <div className="text-danger small">{error.priority}</div>
              )}
            </Col>
          </Row>
          <Row>
            <Col className="mt-2">
              <Form.Check
                type="checkbox"
                label="عرض السؤال على الصفحة الرئيسية"
                checked={status}
                onChange={(e) => setStatus(e.target.checked)}
              />
            </Col>
          </Row>
          <Row className="g-2 mt-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-secondary fw-md w-100"
                type="submit"
                disabled={
                  loading ||
                  !question.trim() ||
                  !answer.trim() ||
                  !category ||
                  !priority
                }
              >
                {loading ? <Spinner animation="border" size="sm" /> : "إضافة"}
              </button>
            </Col>
            <Col sm={12} md={6}>
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

export default AddFaqModal;
