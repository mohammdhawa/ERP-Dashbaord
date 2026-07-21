import React, { useState } from "react";
import { Modal, Button, Form, Spinner, Alert, ProgressBar } from "react-bootstrap";
import api from "../../redux/api";

const ChangePasswordModal = ({ show, onHide }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
  const [newPasswordError, setNewPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Function to calculate password strength
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length > 8) strength += 1;
    if (password.length > 12) strength += 1;
    if (password.length > 16) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[\d]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return Math.min((strength / 7) * 100, 100); // Max strength 7 points, scale to 100%
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    // Password validation
    if (!passwordPattern.test(newPassword)) {
      setNewPasswordError("يجب أن تحتوي كلمة المرور الجديدة على الأقل على رقم واحد، وحرف صغير واحد، وحرف كبير واحد، ورمز خاص واحد");
      return;
    }
    // Also check real-time validation error
    if (newPasswordError) {
        return;
    }
    setLoading(true);
    try {
      await api.post("/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });
      setSuccess("تم تغيير كلمة المرور بنجاح.");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      setNewPasswordError(""); // Clear errors on success
      setPasswordStrength(0);
      setTimeout(() => {
        setSuccess("");
        onHide();
      }, 1200);
    } catch (err) {
      let errorMessage = "حدث خطأ أثناء تغيير كلمة المرور"; // Default error message
      if (err.response) {
        if (err.response.status === 400 && err.response.data && err.response.data.error) {
          // Use the specific error message from the server for 400 errors
          errorMessage = err.response.data.error;
        } else {
          // Fallback to existing logic for other errors
          errorMessage = err.response.data?.message || err.message || errorMessage;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    setSuccess("");
    setNewPasswordError(""); // Clear errors on close
    setPasswordStrength(0);
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirmation("");
    onHide();
  };

  // New password onChange handler including validation and strength check
  const handleNewPasswordChange = (e) => {
      const password = e.target.value;
      setNewPassword(password);

      // Real-time validation
      if (password && !passwordPattern.test(password)) {
          setNewPasswordError("يجب أن تحتوي كلمة المرور الجديدة على الأقل على رقم واحد، وحرف صغير واحد، وحرف كبير واحد، ورمز خاص واحد");
      } else {
          setNewPasswordError("");
      }

      // Calculate strength
      setPasswordStrength(calculatePasswordStrength(password));
  };

  const getStrengthVariant = (strength) => {
      if (strength < 30) return 'danger';
      if (strength < 60) return 'warning';
      if (strength < 90) return 'info';
      return 'success';
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>تغيير كلمة المرور</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="currentPassword">
            <Form.Label>كلمة المرور الحالية</Form.Label>
            <Form.Control
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="newPassword">
            <Form.Label>كلمة المرور الجديدة</Form.Label>
            <Form.Control
              type="password"
              value={newPassword}
              onChange={handleNewPasswordChange}
              required
              isInvalid={!!newPasswordError}
            />
            <Form.Control.Feedback type="invalid">
                {newPasswordError}
            </Form.Control.Feedback>
            {newPassword && ( // Only show strength bar if password is not empty
                <ProgressBar
                    now={passwordStrength}
                    variant={getStrengthVariant(passwordStrength)}
                    label={`${Math.round(passwordStrength)}%`}
                    className="mt-1"
                />
            )}
          </Form.Group>
          <Form.Group className="mb-3" controlId="newPasswordConfirmation">
            <Form.Label>تأكيد كلمة المرور الجديدة</Form.Label>
            <Form.Control
              type="password"
              value={newPasswordConfirmation}
              onChange={(e) => setNewPasswordConfirmation(e.target.value)}
              required
            />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : "تغيير كلمة المرور"}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ChangePasswordModal; 