import { Fragment, useEffect, useState } from "react";
import { Card, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../redux/actions/authActions";
import ALLImages from "../data/Imagedata";
import { ThemeChanger } from "../redux/actions/themeActions";

const Signin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "" });
  // Local countdown mirroring the server's Retry-After (429, 5 req/min/IP);
  // blocks resubmission until it reaches zero.
  const [cooldown, setCooldown] = useState(0);
  const dispatch = useDispatch();
  const { loading, error, fieldErrors, disabled, retryAfter } = useSelector(
    (state) => state.auth
  );

  const theme = useSelector((state) => state.theme);

  // Start the countdown whenever a 429 lands.
  useEffect(() => {
    if (retryAfter) setCooldown(retryAfter);
  }, [retryAfter]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown > 0]);

  // Server 422 bag → field highlighting (keys mirror Laravel's error bag).
  const serverFieldError = (field) => fieldErrors?.[field]?.[0] || "";

  const handleLogin = (e) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setErrors({ email: "", password: "" });
    let formValid = true;

    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) {
      setErrors((prev) => ({ ...prev, email: "البريد الالكتروني مطلوب" }));
      formValid = false;
    } else if (!emailPattern.test(email)) {
      setErrors((prev) => ({
        ...prev,
        email: "يرجى إدخال بريد إلكتروني صالح",
      }));
      formValid = false;
    }

    if (!password) {
      setErrors((prev) => ({ ...prev, password: "كلمة المرور مطلوبة" }));
      formValid = false;
    } else if (password.length < 8) {
      setErrors((prev) => ({
        ...prev,
        password: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل",
      }));
      formValid = false;
    }
    if (formValid) {
      dispatch(login(email, password));
    }
  };

  const ToggleDark = () => {
    const isDarkMode = theme.datathememode === "dark";
    const updatedTheme = {
      ...theme,
      datathememode: isDarkMode ? "light" : "dark",
      dataheaderstyles: isDarkMode ? "light" : "dark",
      datamenustyles:
        theme.datanavlayout === "horizontal" && !isDarkMode
          ? "dark"
          : isDarkMode
          ? "light"
          : "dark",
    };
    dispatch(ThemeChanger(updatedTheme));
    localStorage.setItem("datathememode", isDarkMode ? "light" : "dark");
  };

  return (
    <Fragment>
      <HelmetProvider>
        <Helmet>
          <body className="bg-light"></body>
          <title>الراقي ERP | تسجيل الدخول</title>
        </Helmet>
      </HelmetProvider>
      <Container>
        <Row
          style={{
            position: "absolute",
            top: "0",
            right: "0",
            height: "5rem",
            padding: "1% 4%",
            display: "flex",
            alignItems: "center",
            justifyContent: "start",
            width: "100%",
          }}
        >
          <Link
            to="#"
            className="header-link layout-setting"
            onClick={() => ToggleDark()}
          >
            <span className="light-layout">
              <i className="bi bi-moon header-link-icon"></i>
            </span>
            <span className="dark-layout">
              <i className="bi bi-brightness-high header-link-icon"></i>
            </span>
          </Link>
        </Row>
        <Row
          style={{ maxHeight: "100vh" }}
          className="justify-content-center align-items-center authentication authentication-basic"
        >
          <Col xxl={4} xl={5} lg={5} md={6} sm={8} className="col-12">
            <div className="mb-4 d-flex justify-content-center">
              <Link to={`${import.meta.env.BASE_URL}`}>
                <img
                  src={ALLImages("sBlackLogo")}
                  alt="logo"
                  className="desktop-logo"
                  style={{ width: "3rem", height: "3rem" }}
                />
                <img
                  src={ALLImages("sWhiteLogo")}
                  alt="logo"
                  className="desktop-dark"
                  style={{ width: "3rem", height: "3rem" }}
                />
              </Link>
            </div>

            {/* 403 on login = disabled account. Deliberately a separate view:
                it is NOT a credentials problem and must not look like one. */}
            {disabled ? (
              <Card className="custom-card border border-danger">
                <Card.Body className="text-center p-5">
                  <span className="avatar avatar-xl avatar-rounded bg-danger-transparent mb-3">
                    <i className="ri-user-forbid-line fs-2"></i>
                  </span>
                  <h5 className="fw-medium mb-2">تم تعطيل هذا الحساب</h5>
                  <p className="text-muted mb-4">
                    {error ||
                      "حسابك معطل حالياً. يرجى التواصل مع مسؤول النظام لإعادة تفعيله."}
                  </p>
                  <button
                    className="btn btn-light"
                    onClick={() => window.location.reload()}
                  >
                    المحاولة بحساب آخر
                  </button>
                </Card.Body>
              </Card>
            ) : (
              <Fragment>
                <p className="h4 mb-2 text-center">تسجيل الدخول</p>
                <p className="mb-4 text-muted fw-normal text-center">
                  أهلاً وسهلاً بك في نظام الراقي ERP
                </p>
                <form onSubmit={handleLogin}>
                  <Row className="gy-3">
                    <Col xl={12}>
                      <Form.Group controlId="signin-email">
                        <Form.Label className="text-default">
                          البريد الالكتروني
                        </Form.Label>
                        <Form.Control
                          type="text"
                          size="lg"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setErrors((prev) => ({ ...prev, email: "" }));
                          }}
                          isInvalid={!!errors.email || !!serverFieldError("email")}
                          autoFocus
                        />
                        {(errors.email || serverFieldError("email")) && (
                          <Form.Control.Feedback type="invalid">
                            {errors.email || serverFieldError("email")}
                          </Form.Control.Feedback>
                        )}
                      </Form.Group>
                    </Col>

                    <Col xl={12} className="mb-2">
                      <Form.Group controlId="signin-password">
                        <Form.Label className="text-default d-block">
                          كلمة المرور
                        </Form.Label>
                        <div className="position-relative authentication-input">
                          <Form.Control
                            type={showPassword ? "text" : "password"}
                            size="lg"
                            placeholder="كلمة المرور"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setErrors((prev) => ({ ...prev, password: "" }));
                            }}
                            isInvalid={
                              !!errors.password || !!serverFieldError("password")
                            }
                          />
                          {(errors.password || serverFieldError("password")) && (
                            <Form.Control.Feedback type="invalid">
                              {errors.password || serverFieldError("password")}
                            </Form.Control.Feedback>
                          )}
                          <Link
                            to="#"
                            className="show-password-button text-muted"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <i className="ri-eye-line align-middle"></i>
                            ) : (
                              <i className="ri-eye-off-line align-middle"></i>
                            )}
                          </Link>
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-grid mt-4">
                    <button
                      type="submit"
                      className="btn btn-lg btn-primary"
                      disabled={loading || cooldown > 0}
                    >
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : cooldown > 0 ? (
                        `يرجى الانتظار ${cooldown} ثانية`
                      ) : (
                        "تسجيل الدخول"
                      )}
                    </button>
                  </div>
                  {error && cooldown <= 0 && (
                    <p className="text-danger mt-4 mb-0 text-center">{error}</p>
                  )}
                  {cooldown > 0 && (
                    <p className="text-warning mt-4 mb-0 text-center">
                      محاولات كثيرة — يمكنك المحاولة مجدداً بعد {cooldown} ثانية
                    </p>
                  )}
                </form>
              </Fragment>
            )}
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

export default Signin;
