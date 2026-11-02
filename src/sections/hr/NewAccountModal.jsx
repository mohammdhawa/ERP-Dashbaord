import React from "react";
import { Alert, Form, InputGroup, Modal } from "react-bootstrap";
import { toastNotify } from "../../utils";

// Shown once, straight after an employee is added: the account the server made
// with them and its temporary password (backend
// EMPLOYEE_ACCOUNT_ON_CREATE_DESIGN.md). Nothing returns the password again, so
// the only way out is «تم» — no ×, no Escape, no backdrop click that could lose
// it by accident.
const copy = async (text, what) => {
  try {
    await navigator.clipboard.writeText(text);
    toastNotify(`نُسخ ${what}.`, "success");
  } catch {
    toastNotify(`تعذّر النسخ — انسخ ${what} يدوياً.`, "warning");
  }
};

const CopyField = ({ id, label, value, what }) => (
  <Form.Group className="mb-3">
    <Form.Label htmlFor={id}>{label}</Form.Label>
    <InputGroup>
      <Form.Control id={id} value={value} readOnly dir="ltr" className="font-monospace" />
      <button type="button" className="btn btn-light" onClick={() => copy(value, what)}>
        <i className="ri-file-copy-line me-1 align-middle"></i>نسخ
      </button>
    </InputGroup>
  </Form.Group>
);

const NewAccountModal = ({ notice, onDone }) => (
  <Modal show onHide={onDone} keyboard={false} backdrop="static" centered>
    <Modal.Header>
      <Modal.Title as="h6">تم إنشاء حساب الدخول</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <CopyField id="new-account-login" label="اسم الدخول (رقم كوبو)" value={notice.login} what="اسم الدخول" />
      {!notice.disabled && (
        <CopyField
          id="new-account-password"
          label="كلمة المرور المؤقتة"
          value={notice.password}
          what="كلمة المرور"
        />
      )}
      <Alert variant={notice.disabled ? "secondary" : "warning"} className="mb-0">
        {notice.message}
      </Alert>
    </Modal.Body>
    <Modal.Footer>
      <button type="button" className="btn btn-secondary fw-md w-100" onClick={onDone}>
        تم
      </button>
    </Modal.Footer>
  </Modal>
);

export default NewAccountModal;
