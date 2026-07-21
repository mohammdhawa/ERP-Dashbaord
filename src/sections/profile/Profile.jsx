import { Fragment, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useDispatch, useSelector } from "react-redux";
import { Card, Row, Col, Badge, Button } from "react-bootstrap";
import Pageheader from "../../components/Pageheader";
import Loader from "../../components/Loader";
import { fetchProfile } from "../../redux/actions/authActions";
import EditProfileModal from "./EditProfileModal";
import ChangePasswordModal from "./ChangePasswordModal";

const Profile = () => {
  const dispatch = useDispatch();
  const {
    profile,
    profileLoading: loading,
    error,
  } = useSelector((state) => state.auth);
  const [showEdit, setShowEdit] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    if (!profile) {
      dispatch(fetchProfile());
    }
  }, [dispatch, profile]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="content container-fluid">
          <div className="error-page">
            <h2 className="text-center">{error}</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <Fragment>
      <Helmet>
        <title>لوحة التحكم | الملف الشخصي</title>
      </Helmet>
      <div className="page-wrapper">
        <div className="content container-fluid">
          <Pageheader
            homepage="الملف الشخصي"
            activepage="الحساب"
            page="الملف الشخصي"
          />

          <Row>
            <Col lg="12">
              <Card className="custom-card">
                <Card.Body>
                  <div className="profile-header d-flex align-items-center gap-4 flex-column flex-sm-row text-center text-sm-start">
                    <div
                      className="profile-img"
                      style={{
                        width: "120px",
                        height: "120px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: "#f3f3f3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={
                          profile.user?.image ||
                          "https://syr-souq.fra1.cdn.digitaloceanspaces.com/SyrSouqImages/no_profile.png"
                        }
                        alt="Profile"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                          objectPosition: "center center",
                          scale: !profile.user?.image ? "1.3" : "",
                        }}
                      />
                    </div>
                    <div className="profile-info w-100">
                      <h2 className="mb-2">{profile.user?.name}</h2>
                      <p className="text-muted mb-2">{profile.user?.email}</p>
                      <p className="text-muted mb-2">
                        <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
                          {profile.user?.phone}
                        </span>
                      </p>
                      <Badge
                        bg={profile.user?.is_verified ? "success" : "warning"}
                        className="mb-2"
                      >
                        {profile.user?.is_verified ? "مفعل" : "غير مفعل"}
                      </Badge>
                      <div className="mt-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowEdit(true)}
                        >
                          تعديل الملف الشخصي
                        </Button>{" "}
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => setShowChangePassword(true)}
                        >
                          تغيير كلمة المرور
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="profile-details mt-4">
                    <Row>
                      <Col md="6">
                        <div className="profile-info-item">
                          <h5 className="mb-3">معلومات الحساب</h5>
                          <ul className="list-unstyled">
                            <li className="mb-2">
                              <strong>تاريخ التسجيل:</strong>{" "}
                              {profile.user?.created_at
                                ? new Date(
                                    profile.user.created_at
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                  })
                                : ""}
                            </li>
                            <li className="mb-2">
                              <strong>تاريخ تفعيل البريد:</strong>{" "}
                              {profile.user?.email_verified_at
                                ? new Date(
                                    profile.user.email_verified_at
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                  })
                                : "غير مفعل"}
                            </li>
                          </ul>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
      <EditProfileModal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        profile={profile.user}
      />
      <ChangePasswordModal
        show={showChangePassword}
        onHide={() => setShowChangePassword(false)}
      />
    </Fragment>
  );
};

export default Profile;
