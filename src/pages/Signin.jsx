import { Fragment, useEffect, useRef, useState } from "react";
import { Card, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login, clearRateLimit } from "../redux/actions/authActions";
import ALLImages from "../data/Imagedata";
import { ThemeChanger } from "../redux/actions/themeActions";

const Signin = () => {
  const [showPassword, setShowPassword] = useState(false);
  // `login` is an employee number OR an email — see authActions.login.
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ login: "", password: "" });
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

  // Keyed on the BOOLEAN, not on `cooldown` itself: depending on the number
  // would tear down and recreate the interval every single tick. The condition
  // is a named variable because a raw expression in a dependency array is
  // something the linter cannot check — and something the next reader has to
  // reverse-engineer. The functional updater means the effect never has to read
  // `cooldown`, so the dependency list is genuinely complete.
  const isCoolingDown = cooldown > 0;
  useEffect(() => {
    if (!isCoolingDown) return undefined;
    const timer = setInterval(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [isCoolingDown]);

  // Falling edge of the countdown: once it lapses, drop the stale rate-limit
  // message so it doesn't reappear as a red error while the user can retry.
  const wasCoolingRef = useRef(false);
  useEffect(() => {
    if (cooldown > 0) {
      wasCoolingRef.current = true;
    } else if (wasCoolingRef.current) {
      wasCoolingRef.current = false;
      dispatch(clearRateLimit());
    }
  }, [cooldown, dispatch]);

  // Server 422 bag → field highlighting (keys mirror Laravel's error bag).
  const serverFieldError = (field) => fieldErrors?.[field]?.[0] || "";

  const handleLogin = (e) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setErrors({ login: "", password: "" });
    let formValid = true;

    // Presence only — NO email-shape check. Most staff sign in with their
    // employee number, and an email pattern would reject `EMP-00042` before
    // the request is ever sent. The server decides which kind it is.
    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrors((prev) => ({
        ...prev,
        login: "رقم الموظف أو البريد الإلكتروني مطلوب",
      }));
      formValid = false;
    }

    // Presence only. A minimum-length rule belongs on the SET-password form,
    // not here: enforcing it at sign-in locks out any account whose password
    // predates the policy, and tells an attacker the policy before they have
    // authenticated. The server is the authority on whether a password is
    // correct.
    if (!password) {
      setErrors((prev) => ({ ...prev, password: "كلمة المرور مطلوبة" }));
      formValid = false;
    }
    if (formValid) {
      dispatch(login(trimmed, password));
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
      {/* The provider lives at the root now; a nested one here made this page's
          <title> register against a different context than every other page. */}
      <Helmet>
        <body className="bg-light"></body>
        <title>الراقي ERP | تسجيل الدخول</title>
      </Helmet>
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
          <button
            type="button"
            className="header-link layout-setting btn border-0 bg-transparent"
            onClick={() => ToggleDark()}
            aria-label={
              theme.datathememode === "dark"
                ? "التبديل إلى الوضع الفاتح"
                : "التبديل إلى الوضع الداكن"
            }
            aria-pressed={theme.datathememode === "dark"}
          >
            <span className="light-layout">
              <i className="bi bi-moon header-link-icon" aria-hidden="true"></i>
            </span>
            <span className="dark-layout">
              <i
                className="bi bi-brightness-high header-link-icon"
                aria-hidden="true"
              ></i>
            </span>
          </button>
        </Row>
        {/* minHeight, not maxHeight: capping the row at the viewport clipped
            the card on short screens (and on mobile once the keyboard opens)
            with no way to scroll to the submit button. */}
        <Row
          style={{ minHeight: "100vh" }}
          className="justify-content-center align-items-center authentication authentication-basic"
        >
          <Col xxl={4} xl={5} lg={5} md={6} sm={8} className="col-12">
            <div className="mb-4 d-flex justify-content-center">
              <Link to={`${import.meta.env.BASE_URL}`}>
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
                      <Form.Group controlId="signin-login">
                        <Form.Label className="text-default">
                          رقم الموظف أو البريد الإلكتروني
                        </Form.Label>
                        {/* type="text", NOT "email": the browser's own email
                            check would block an employee number before submit.
                            autoComplete="username" still gives password
                            managers their hint. */}
                        <Form.Control
                          type="text"
                          size="lg"
                          name="login"
                          autoComplete="username"
                          autoCapitalize="off"
                          spellCheck={false}
                          dir="ltr"
                          placeholder="EMP-00042 / name@example.com"
                          value={identifier}
                          onChange={(e) => {
                            setIdentifier(e.target.value);
                            setErrors((prev) => ({ ...prev, login: "" }));
                          }}
                          isInvalid={!!errors.login || !!serverFieldError("login")}
                          autoFocus
                        />
                        {(errors.login || serverFieldError("login")) && (
                          <Form.Control.Feedback type="invalid">
                            {errors.login || serverFieldError("login")}
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
                            name="password"
                            autoComplete="current-password"
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
                          {/* A <button>, not a <Link to="#">: the anchor
                              navigated (leaving a "#" on the sign-in URL) and
                              announced as a link. aria-pressed reports the
                              current state to a screen reader. */}
                          <button
                            type="button"
                            className="show-password-button text-muted btn border-0 bg-transparent p-0"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={
                              showPassword
                                ? "إخفاء كلمة المرور"
                                : "إظهار كلمة المرور"
                            }
                            aria-pressed={showPassword}
                          >
                            {showPassword ? (
                              <i
                                className="ri-eye-line align-middle"
                                aria-hidden="true"
                              ></i>
                            ) : (
                              <i
                                className="ri-eye-off-line align-middle"
                                aria-hidden="true"
                              ></i>
                            )}
                          </button>
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
