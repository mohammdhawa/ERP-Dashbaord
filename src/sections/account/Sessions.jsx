import { Fragment, useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Row } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { MutatingDots } from "react-loader-spinner";
import { PageHeader } from "../../components";
import api from "../../redux/api";
import { logout, logoutEverywhere } from "../../redux/actions/authActions";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDestructive, toastNotify } from "../../utils";
import { formatAbsolute, formatRelativeAr } from "../system/auditFormat";

// الجلسات والأجهزة — the caller's own signed-in devices (backend API doc §3.6).
//
// SELF-SCOPED: no permission, like /change-password. Every row is one device
// signed in as this account — this browser, another browser, the phone app —
// and the one question this screen answers is "is there a sign-in here I do
// not recognise?". So each row says what the device is, when it signed in and
// when it was last used, and the stranger can be ended from here.
//
// Ending THIS browser's own session is a sign-out, so that row's action is
// logout() — the same path as the header menu — rather than a DELETE that
// would leave this tab holding dead tokens until its next request failed.
//
// State is local, not in Redux: nothing else in the app reads the session
// list, and it is re-read on every visit.

const PLATFORM = {
  android: { icon: "ri-android-line", label: "أندرويد" },
  ios: { icon: "ri-apple-line", label: "iOS" },
  web: { icon: "ri-computer-line", label: "متصفح" },
};

const platformOf = (session) =>
  PLATFORM[session.platform] || { icon: "ri-device-line", label: null };

const Sessions = () => {
  const dispatch = useDispatch();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/auth/sessions");
      setSessions(response.data.data);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const endSession = async (session) => {
    if (session.is_current) {
      dispatch(logout());
      return;
    }

    const confirmed = await confirmDestructive({
      action: "إنهاء جلسة",
      subject: session.device_name || "جهاز غير معروف",
      text: "سيُسجَّل خروج هذا الجهاز، ولن تصله إشعارات حتى يُسجَّل الدخول منه مجدداً.",
      confirmButtonText: "إنهاء الجلسة",
    });
    if (!confirmed) return;

    setBusyId(session.id);
    try {
      const response = await api.delete(`/auth/sessions/${session.id}`);
      setSessions((current) => current.filter((s) => s.id !== session.id));
      toastNotify(response.data.message, "success");
    } catch (err) {
      // 404 = already ended elsewhere (or never this account's): the list is
      // stale, so re-read it rather than leave a row that cannot be ended.
      toastNotify(parseApiError(err).message, "error");
      load();
    } finally {
      setBusyId(null);
    }
  };

  const endAll = async () => {
    const confirmed = await confirmDestructive({
      action: "تسجيل الخروج من جميع الأجهزة",
      text: "ستُنهى كل الجلسات، ومنها هذه الجلسة، وستحتاج إلى تسجيل الدخول مجدداً على كل جهاز.",
      confirmButtonText: "تسجيل الخروج من الكل",
    });
    if (!confirmed) return;

    try {
      await dispatch(logoutEverywhere());
    } catch (err) {
      toastNotify(err.message, "error");
    }
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | الجلسات والأجهزة</title>
      </Helmet>
      <PageHeader homepage="الجلسات والأجهزة" activepage="الحساب" page="الجلسات والأجهزة">
        {sessions.length > 1 && (
          <button type="button" className="btn btn-sm btn-danger-light" onClick={endAll}>
            <i className="ri-logout-box-r-line align-middle me-1" aria-hidden="true"></i>
            تسجيل الخروج من جميع الأجهزة
          </button>
        )}
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Header>
              <div className="card-title">الأجهزة التي سجّلت الدخول بحسابك</div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
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
                  <button type="button" className="btn btn-primary btn-sm mt-2" onClick={load}>
                    إعادة المحاولة
                  </button>
                </div>
              ) : (
                <ul className="list-group list-group-flush" aria-label="الجلسات">
                  {sessions.map((session) => {
                    const platform = platformOf(session);
                    return (
                      <li
                        key={session.id}
                        className={`list-group-item d-flex align-items-center gap-3 py-3 px-3 ${
                          session.is_current ? "bg-primary-transparent" : ""
                        }`}
                      >
                        <span className="avatar avatar-rounded bg-light text-muted">
                          <i className={`fs-18 ${platform.icon}`} aria-hidden="true"></i>
                        </span>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="fw-semibold">
                              {session.device_name || "جهاز غير معروف"}
                            </span>
                            {platform.label && (
                              <span className="badge bg-light text-muted">{platform.label}</span>
                            )}
                            {session.is_current && (
                              <span className="badge bg-primary">هذا الجهاز</span>
                            )}
                          </div>
                          <span className="d-block text-muted fs-12">
                            آخر استخدام: {formatRelativeAr(session.last_used_at)}
                            {" · "}
                            <span dir="ltr">{formatAbsolute(session.last_used_at)}</span>
                          </span>
                          <span className="d-block text-muted fs-12">
                            تسجيل الدخول: <span dir="ltr">{formatAbsolute(session.signed_in_at)}</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          className={`btn btn-sm ${session.is_current ? "btn-light" : "btn-danger-light"}`}
                          disabled={busyId === session.id}
                          onClick={() => endSession(session)}
                        >
                          {session.is_current ? "تسجيل الخروج" : "إنهاء الجلسة"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Fragment>
  );
};

export default Sessions;
