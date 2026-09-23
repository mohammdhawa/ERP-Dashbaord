import { Fragment, useState } from "react";
import { Card, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import { Navigate, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { changePassword, logout } from "../redux/actions/authActions";
import { Loader } from "../components";
import ALLImages from "../data/Imagedata";

// POST /auth/password. Two ways in:
//  - FORCED: the account still holds the temporary password HR issued it
//    (`must_change_password`). The API refuses every route except this one,
//    /auth/me and /auth/logout with a 403 until it is replaced, so
//    ProtectedRoute sends the user here and nowhere else.
//  - VOLUNTARY: any signed-in user rotating their own password.
//
// Deliberately standalone, NOT inside the <App> layout: the layout's header
// polls notifications and friends, and every one of those calls is a 403 while
// the flag is set.
const PasswordInput = ({ id, label, value, onChange, error, autoComplete, show }) => (
  <Form.Group controlId={id}>
    <Form.Label className="text-default d-block">{label}</Form.Label>
    <Form.Control
      type={show ? "text" : "password"}
      size="lg"
      autoComplete={autoComplete}
      value={value}
      onChange={onChange}
      isInvalid={!!error}
    />
    {error && (
      <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
    )}
  </Form.Group>
);

const ChangePassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, initialized } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (!initialized) return <Loader />;
  if (!user) return <Navigate to="/signin" replace />;

  const forced = Boolean(user.must_change_password);

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: null, _general: null }));
  };

  // Mirrors ChangePasswordRequest: required, 8–128, confirmed, different from
  // the current one. The server stays the authority; this only saves a trip.
  const validate = () => {
    const e = {};
    if (!form.current_password) {
      e.current_password = ["كلمة المرور الحالية مطلوبة."];
    }
    if (!form.password) {
      e.password = ["كلمة المرور الجديدة مطلوبة."];
    } else if (form.password.length < 8) {
      e.password = ["يجب ألا تقل كلمة المرور عن 8 أحرف."];
    } else if (form.password.length > 128) {
      e.password = ["يجب ألا تزيد كلمة المرور عن 128 حرفاً."];
    } else if (form.password === form.current_password) {
      e.password = ["يجب أن تختلف كلمة المرور الجديدة عن الحالية."];
    }
    if (form.password && form.password !== form.password_confirmation) {
      e.password_confirmation = ["تأكيد كلمة المرور غير مطابق."];
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSaving(true);
    try {
      await dispatch(changePassword(form));
      navigate("/", { replace: true });
    } catch (parsed) {
      if (parsed.status === 422 && parsed.errors) {
        // Laravel keys `confirmed` failures under `password`.
        setErrors(parsed.errors);
      } else if (parsed.status === 401) {
        // The only 401 left after the interceptor's one recovery is the
        // server's "كلمة المرور الحالية غير صحيحة." — it belongs on that field.
        setErrors({ current_password: [parsed.message] });
      } else {
        setErrors({ _general: [parsed.message] });
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field) => errors?.[field]?.[0] || "";

  return (
    <Fragment>
      <Helmet>
        <body className="bg-light"></body>
        <title>الراقي ERP | تغيير كلمة المرور</title>
      </Helmet>
      <Container>
        <Row
          style={{ minHeight: "100vh" }}
          className="justify-content-center align-items-center authentication authentication-basic"
        >
          <Col xxl={4} xl={5} lg={5} md={6} sm={8} className="col-12">
            <div className="mb-4 d-flex justify-content-center">
              <img
                src={ALLImages("hBlackLogo")}
                alt="logo"
                className="desktop-logo signin-brand-logo"
              />
              <img
                src={ALLImages("hWhiteLogo")}
                alt="logo"
                className="desktop-dark signin-brand-logo"
              />
            </div>

            <p className="h4 mb-2 text-center">تغيير كلمة المرور</p>
            {forced ? (
              <Card className="custom-card border border-warning mb-4">
                <Card.Body className="py-3 small">
                  <i className="ri-lock-password-line align-middle me-1"></i>
                  تستخدم حالياً كلمة مرور مؤقتة صادرة عن الإدارة. يجب تغييرها
                  قبل متابعة استخدام النظام.
                </Card.Body>
              </Card>
            ) : (
              <p className="mb-4 text-muted fw-normal text-center">
                سيتم إنهاء جلساتك على الأجهزة الأخرى بعد التغيير.
              </p>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <Row className="gy-3">
                <Col xl={12}>
                  <PasswordInput
                    id="cp-current"
                    label="كلمة المرور الحالية"
                    autoComplete="current-password"
                    value={form.current_password}
                    onChange={setField("current_password")}
                    error={fieldError("current_password")}
                    show={showPasswords}
                  />
                </Col>
                <Col xl={12}>
                  <PasswordInput
                    id="cp-new"
                    label="كلمة المرور الجديدة"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={setField("password")}
                    error={fieldError("password")}
                    show={showPasswords}
                  />
                </Col>
                <Col xl={12}>
                  <PasswordInput
                    id="cp-confirm"
                    label="تأكيد كلمة المرور الجديدة"
                    autoComplete="new-password"
                    value={form.password_confirmation}
                    onChange={setField("password_confirmation")}
                    error={fieldError("password_confirmation")}
                    show={showPasswords}
                  />
                </Col>
                <Col xl={12}>
                  <Form.Check
                    type="checkbox"
                    id="cp-show"
                    label="إظهار كلمات المرور"
                    checked={showPasswords}
                    onChange={(e) => setShowPasswords(e.target.checked)}
                  />
                </Col>
              </Row>

              <div className="d-grid mt-4">
                <button
                  type="submit"
                  className="btn btn-lg btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    "حفظ كلمة المرور"
                  )}
                </button>
              </div>

              {errors._general && (
                <p className="text-danger mt-3 mb-0 text-center">
                  {errors._general[0]}
                </p>
              )}

              <div className="text-center mt-3">
                {forced ? (
                  // Sign-out is one of the three routes still open; refusing
                  // it would trap the user on this screen.
                  <button
                    type="button"
                    className="btn btn-link text-muted"
                    onClick={() => dispatch(logout())}
                    disabled={saving}
                  >
                    تسجيل الخروج
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-link text-muted"
                    onClick={() => navigate(-1)}
                    disabled={saving}
                  >
                    رجوع
                  </button>
                )}
              </div>
            </form>
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

export default ChangePassword;
