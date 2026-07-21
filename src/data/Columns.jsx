import moment from "moment";
import { OverlayTrigger, Tooltip, Badge } from "react-bootstrap";
import { adTypes, cities, faqCategories, faqsPriority } from "./General";
import { Link } from "react-router-dom";
import { toastNotify } from "../utils";

export const rolesColumns = [
  {
    label: "#",
    key: "id",
    render: (role_id) => (
      <div className="d-flex flex-column text-center">
        <Link to={""} className="text-primary fw-medium">
          {role_id}
        </Link>
      </div>
    ),
    center: true,
  },
  { label: "اسم الدور", key: "name" },
  {
    label: "مستوى الدور",
    key: "level",
    render: (level) => (
      <div className="d-flex flex-column text-center">{level}</div>
    ),
    center: true,
  },
  {
    label: "الصلاحيات",
    key: "permissions",
    render: (permissions) => {
      const maxPermissionsToShow = 2;
      const visiblePermissions = permissions.slice(0, maxPermissionsToShow);
      const remainingPermissions = permissions.length > maxPermissionsToShow;
      const hiddenPermissions = permissions.slice(maxPermissionsToShow);

      return (
        <div className="d-flex flex-wrap flex-row gap-1">
          {visiblePermissions.map((perm) => (
            <Badge
              key={perm.id}
              className="fs-12 py-2 px-4 align-middle bg-secondary-transparent"
            >
              {perm.name}
            </Badge>
          ))}

          {remainingPermissions && (
            <OverlayTrigger
              placement="left"
              overlay={
                <Tooltip id="tooltip-left" className="tooltip-secondary ">
                  {hiddenPermissions.map((perm, index) => (
                    <div key={index}>{perm.name}</div>
                  ))}
                </Tooltip>
              }
            >
              <Badge className="fw-light fs-12 py-2 px-4 align-middle bg-secondary-transparent">
                ...
              </Badge>
            </OverlayTrigger>
          )}
        </div>
      );
    },
  },

  {
    label: "عدد المستفيدين",
    key: "users_count",
    render: (users_count) => (
      <span>
        {users_count} {users_count > 1 ? "مستخدمين" : "مستخدم"}
      </span>
    ),
  },
  {
    label: "قابل للتعديل",
    key: "is_editable",
    render: (is_editable) => {
      const badgeColor = is_editable === 1 ? "success" : "danger";
      const label = is_editable === 1 ? "check" : "close";
      return (
        <Badge
          className={`fs-12 py-2 px-4 align-middle bg-${badgeColor}-transparent`}
        >
          <span className={`ri-${label}-line`} />
        </Badge>
      );
    },
  },
  {
    label: "قابل للحذف",
    key: "is_deleteable",
    render: (is_deleteable) => {
      const badgeColor = is_deleteable === 1 ? "success" : "danger";
      const label = is_deleteable === 1 ? "check" : "close";
      return (
        <Badge
          className={`fs-12 py-2 px-4 align-middle bg-${badgeColor}-transparent`}
        >
          <span className={`ri-${label}-line`} />
        </Badge>
      );
    },
  },
  {
    label: "تاريخ الانشاء",
    key: "created_at",
    render: (created_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
  {
    label: "اخر تعديل",
    key: "updated_at",
    render: (updated_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(updated_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(updated_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
];
// Permissions Table Column
export const permissionsColumns = [
  {
    label: "#",
    key: "id",
    render: (permission_id) => (
      <div className="d-flex flex-column text-center">
        <Link to={""} className="text-primary fw-medium">
          {permission_id}
        </Link>
      </div>
    ),
    center: true,
  },
  { label: "اسم الصلاحية", key: "name" },

  {
    label: "تاريخ الانشاء",
    key: "created_at",
    render: (created_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
  {
    label: "اخر تعديل",
    key: "updated_at",
    render: (updated_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(updated_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(updated_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
];

//FAQs Columns
export const faqsColumns = [
  {
    label: "#",
    key: "id",
    render: (id) => (
      <div className="d-flex flex-column text-center">
        <Link to={""} className="text-primary fw-medium">
          {id}
        </Link>
      </div>
    ),
    center: true,
  },
  {
    label: "السؤال",
    key: "question",
    render: (question) =>
      question.length > 50 ? `${question.substring(0, 50)}...` : question,
  },
  {
    label: "الإجابة",
    key: "answer",
    render: (answer) =>
      answer.length > 50 ? `${answer.substring(0, 50)}...` : answer,
  },
  {
    label: "الفئة",
    key: "category",
    render: (category) => {
      const categoryLabel = faqCategories.find((cat) => cat.value === category);
      return categoryLabel ? categoryLabel.label : category;
    },
  },
  {
    label: "الاولوية",
    key: "priority",
    render: (priority) => {
      const priorityLabel = faqsPriority.find((pri) => pri.value === priority);
      const badgeColor =
        priority === "High"
          ? "danger"
          : priority === "Medium"
          ? "warning"
          : priority === "Low"
          ? "success"
          : "";
      return (
        <Badge
          className={`fs-12 py-2 px-4 align-middle bg-${badgeColor}-transparent`}
        >
          {priorityLabel ? priorityLabel.label : priority}
        </Badge>
      );
    },
  },
  {
    label: "الصفحة الرئيسية",
    key: "status",
    render: (status) => (status === 1 ? "نعم" : status === 0 ? "لا" : status),
  },
  {
    label: "تاريخ الانشاء",
    key: "created_at",
    render: (created_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
  {
    label: "اخر تعديل",
    key: "updated_at",
    render: (updated_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(updated_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(updated_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
];

// Package Columns
export const packagesColumns = [
  {
    label: "#",
    key: "id",
    render: (id) => (
      <div className="d-flex flex-column text-center">
        <Link to={""} className="text-primary fw-medium">
          {id}
        </Link>
      </div>
    ),
    center: true,
  },
  {
    label: "اسم الباقة",
    key: "name",
  },
  {
    label: "ميزات الباقة",
    key: "properties",
    render: (properties) => {
      const parts = properties.split("#split_here#");
      const visibleParts = parts.slice(0, 2);
      const hiddenParts = parts.slice(2);

      return (
        <div className="d-flex flex-wrap flex-row gap-1">
          {visibleParts.map((part, index) => {
            const truncatedPart =
              part.length > 50 ? `${part.substring(0, 50)}...` : part;
            return (
              <Badge
                key={index}
                className="fs-12 py-2 px-4 align-middle bg-secondary-transparent"
              >
                {truncatedPart}
              </Badge>
            );
          })}

          {hiddenParts.length > 0 && (
            <OverlayTrigger
              placement="left"
              overlay={
                <Tooltip id="tooltip-top" className="tooltip-secondary">
                  {hiddenParts.map((part, index) => (
                    <div key={index}>{part}</div>
                  ))}
                </Tooltip>
              }
            >
              <Badge className="fw-light fs-12 py-2 px-4 align-middle bg-secondary-transparent">
                ...
              </Badge>
            </OverlayTrigger>
          )}
        </div>
      );
    },
  },
  {
    label: "السعر",
    key: "price",
    render: (price) => <div className="text-center">{price}</div>,
    center: true,
  },
  {
    label: "الاعلانات المسموحة",
    key: "max_of_ads",
    render: (max_of_ads) => <div className="text-center">{max_of_ads}</div>,
    center: true,
  },
  {
    label: "مدة الباقة",
    key: "period",
    render: (period) => <div className="text-center">{period} يوم</div>,
    center: true,
  },
  {
    label: "إجمالي المشتركين",
    key: "total_subscribers_count",
    render: (total_subscribers_count) => (
      <div className="text-center">{total_subscribers_count}</div>
    ),
    center: true,
  },
  {
    label: "المشتركين النشطين",
    key: "total_subscribers_count",
    render: (active_subscribers_count) => (
      <div className="text-center">{active_subscribers_count}</div>
    ),
    center: true,
  },
  {
    label: "حالة الباقة",
    key: "is_active",
    render: (is_active) => (
      <div className="text-center">
        {" "}
        <Badge
          className={`fs-12 bg-${
            is_active === 1 ? "success" : "danger"
          }-transparent fs-12 py-2 px-4 align-middle`}
        >
          {is_active === 1 ? "نشطة" : "خامدة"}
        </Badge>
      </div>
    ),
    center: true,
  },
  {
    label: "تاريخ الانشاء",
    key: "created_at",
    render: (created_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
  {
    label: "اخر تعديل",
    key: "updated_at",
    render: (updated_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(updated_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(updated_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
];

// Users Colums
export const usersColumns = [
  {
    label: "#",
    key: "id",
    render: (id) => (
      <div className="d-flex flex-column text-center">
        <Link to={""} className="text-primary fw-medium">
          {id}
        </Link>
      </div>
    ),
    center: true,
  },
  {
    label: "اسم المستخدم",
    key: "name",
  },
  {
    label: "البريد الاكتروني",
    key: "email",
    render: (_, item) => (
      <Link
        onClick={(e) => {
          e.preventDefault();
          if (item?.email) {
            navigator.clipboard.writeText(item.email);
            toastNotify("تم نسخ البريد الالكتروني", "success");
          }
        }}
        style={{ cursor: "pointer" }}
      >
        {item?.email}
      </Link>
    ),
  },

  {
    label: "رقم الهاتف",
    key: "phone",
    render: (phone) => {
      if (typeof phone !== "string" || !phone.trim()) {
        return <span>لا يوجد</span>;
      }
      let formattedPhone = phone.replace("00", "+");
      return (
        <div className="d-flex align-items-center gap-1">
          <span dir="ltr">{formattedPhone}</span>
          <Link
            onClick={(e) => {
              e.preventDefault();
              if (formattedPhone) {
                navigator.clipboard.writeText(formattedPhone);
                toastNotify("تم نسخ رقم الهاتف", "success");
              }
            }}
          >
            <i className="ri-file-copy-line text-muted "></i>
          </Link>
          <Link
            onClick={(e) => {
              e.preventDefault();
              if (formattedPhone) {
                window.open(`https://wa.me/${formattedPhone}`, "_blank");
              }
            }}
          >
            <i className="ri-whatsapp-line text-success"></i>
          </Link>
        </div>
      );
    },
  },
  {
    label: "الدور",
    key: "role",
    render: (role) => {
      return <div>{role?.name}</div>;
    },
  },

  {
    label: "حالة التحقق",
    key: "verification",
    render: (_, item) => {
      return (
        <div className="text-center">
          {item?.is_verified === 1 ? (
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip id="tooltip-left" className={`tooltip`}>
                  <div className="d-flex flex-column align-items-start">
                    <p className="m-0 fs-12 ">تاريخ التحقق</p>
                    <span>
                      {moment(item?.email_verified_at)
                        .tz("Europe/Istanbul")
                        .format("YYYY-MM-DD - HH:mm:ss")}
                    </span>
                  </div>
                </Tooltip>
              }
            >
              <Badge
                className={`fs-12 bg-success-transparent fs-12 py-2 px-4 align-middle`}
              >
                <i className="ri-check-line"></i>
              </Badge>
            </OverlayTrigger>
          ) : (
            <Badge
              className={`fs-12 bg-danger-transparent fs-12 py-2 px-4 align-middle`}
            >
              <i className="ri-close-line"></i>
            </Badge>
          )}
        </div>
      );
    },
    center: true,
  },
  {
    label: "حالة الحساب",
    key: "deleted_at",
    render: (deleted_at) => {
      return (
        <div className="text-center">
          {deleted_at ? (
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip id="tooltip-left" className={`tooltip`}>
                  <div className="d-flex flex-column align-items-start">
                    <p className="m-0 fs-12 ">تاريخ التعطيل</p>
                    <span>
                      {moment(deleted_at)
                        .tz("Europe/Istanbul")
                        .format("YYYY-MM-DD - HH:mm:ss")}
                    </span>
                  </div>
                </Tooltip>
              }
            >
              <Badge
                className={`fs-12 bg-danger-transparent fs-12 py-2 px-4 align-middle`}
              >
                معطل
              </Badge>
            </OverlayTrigger>
          ) : (
            <Badge
              className={`fs-12 bg-success-transparent fs-12 py-2 px-4 align-middle`}
            >
              نشط
            </Badge>
          )}
        </div>
      );
    },
    center: true,
  },

  {
    label: "تاريخ التسجيل",
    key: "created_at",
    render: (created_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
  {
    label: "اخر تعديل",
    key: "updated_at",
    render: (updated_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(updated_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(updated_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
];

//Features
export const featuresColumns = [
  {
    label: "#",
    key: "id",
    render: (id) => (
      <div className="d-flex flex-column text-center">
        <Link to={""} className="text-primary fw-medium">
          {id}
        </Link>
      </div>
    ),
    center: true,
    sort: true,
  },
  { label: "الميزة", key: "name" },
  {
    label: "المجموعة",
    key: "feature_group",
    render: (_, item) => item?.feature_group?.name,
  },
  {
    label: "الفئة",
    key: "category",
    render: (_, item) => {
      const category = adTypes.find(
        (ad) => ad.value === item?.feature_group?.category_id
      );
      return category ? category.label : "";
    },
  },
  {
    label: "تاريخ الانشاء",
    key: "created_at",
    render: (created_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
    sort: true,
  },
  {
    label: "اخر تعديل",
    key: "updated_at",
    render: (updated_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(updated_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(updated_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
    sort: true,
  },
];

export const featuresGroupsColumns = [
  {
    label: "#",
    key: "id",
    render: (id) => (
      <div className="d-flex flex-column text-center">
        <Link to={""} className="text-primary fw-medium">
          {id}
        </Link>
      </div>
    ),
    center: true,
  },
  { label: "المجموعة", key: "name" },
  {
    label: "الفئة",
    key: "category_id",
    render: (categoryId) => {
      const category = adTypes.find((adType) => adType.value === categoryId);
      return (
        <div className="d-flex flex-column text-center">
          {category ? category.label : "غير معروف"}
        </div>
      );
    },
    center: true,
  },
  {
    label: "تاريخ الانشاء",
    key: "created_at",
    render: (created_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
  {
    label: "اخر تعديل",
    key: "updated_at",
    render: (updated_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(updated_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(updated_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
];

export const adsColumns = [
  {
    label: "#",
    key: "id",
    render: (id) => (
      <div className="d-flex flex-column text-center">
        <Link to={""} className="text-primary fw-medium">
          {id}
        </Link>
      </div>
    ),
    center: true,
    sort: true,
  },
  {
    label: "العنوان",
    key: "title",
    render: (title) => (
      <OverlayTrigger
        placement="left"
        overlay={
          <Tooltip id="tooltip-left" className={`tooltip-dark`}>
            {title}
          </Tooltip>
        }
      >
        <span title={title}>
          {title.length > 20 ? title.slice(0, 20) + "..." : title}
        </span>
      </OverlayTrigger>
    ),
  },
  {
    label: "المستخدم",
    key: "user",
    render: (user) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">{user?.name}</p>
        <div className="d-flex align-items-center gap-1 fs-11 text-muted">
          <span dir="ltr">{user?.email}</span>
          <Link
            onClick={(e) => {
              e.preventDefault();
              if (user?.email) {
                navigator.clipboard.writeText(user?.email);
                toastNotify("تم نسخ البريد الالكتروني", "success");
              }
            }}
          >
            <i className="ri-file-copy-line text-muted "></i>
          </Link>
        </div>
      </div>
    ),
  },
  {
    label: "المحافظة",
    key: "city",
    render: (city) => {
      const matchedCity = cities.find((c) => c.value === city);
      return matchedCity ? matchedCity.label : "غير معروف";
    },
  },
  {
    label: "الفئة",
    key: "category",
    render: (category) => {
      const type = adTypes.find((t) => t.value === category.id);
      return <p className="m-0">{type ? type.label : "غير معروف"}</p>;
    },
  },
  {
    label: "السعر",
    key: "price",
  },
  {
    label: "حالة الإعلان",
    key: "ads_status",
    center: true,
    render: (ads_status, ad) => {
      let variant, translatedStatus, icon;
      switch (ads_status) {
        case "accepted":
          variant = "success";
          translatedStatus = "مقبول";
          icon = "check";
          break;
        case "pending":
          variant = "warning";
          translatedStatus = "بانتظار الموافقة";
          icon = "time";
          break;
        case "rejected":
          variant = "danger";
          translatedStatus = "مرفوض";
          icon = "prohibited";
          break;
        default:
          variant = "secondary";
          translatedStatus = "غير معروف";
      }
      return (
        <div className="text-center">
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id="tooltip-left" className={`tooltip-${variant}`}>
                {ad?.activated_at
                  ? `تاريخ التفعيل: ${moment(ad.activated_at)
                      .tz("Europe/Istanbul")
                      .format("YYYY-MM-DD - HH:mm:ss")}`
                  : "قيد المراجعة"}
              </Tooltip>
            }
          >
            <Badge
              className={`fs-12 py-2 px-3 align-middle bg-${variant}-transparent `}
            >
              <i className={`ri-${icon}-line`} />
            </Badge>
          </OverlayTrigger>
        </div>
      );
    },
  },
  {
    label: "حالة النشاط",
    key: "active_status",
    center: true,
    render: (active_status, item) => {
      let variant, translatedStatus;
      switch (active_status) {
        case "active":
          variant = "success";
          translatedStatus = "نشط";
          break;
        case "inactive":
          variant = "danger";
          translatedStatus = "متوقف";
          break;
        default:
          variant = "secondary";
          translatedStatus = "غير معروف";
      }
      return (
        <div className="text-center">
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip
                id={`tooltip-activated-at`}
                className={`tooltip-${variant}`}
              >
                {item?.activated_at
                  ? `تاريخ التفعيل: ${moment(item.activated_at)
                      .tz("Europe/Istanbul")
                      .format("YYYY-MM-DD - HH:mm:ss")}`
                  : "قيد المراجعة"}
              </Tooltip>
            }
          >
            <Badge
              className={`fs-12 py-2 px-3 align-middle bg-${variant}-transparent `}
              style={{ cursor: "pointer" }}
            >
              {translatedStatus}
            </Badge>
          </OverlayTrigger>
        </div>
      );
    },
  },
  {
    label: "تاريخ الانشاء",
    key: "created_at",
    render: (created_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
  {
    label: "اخر تعديل",
    key: "updated_at",
    render: (updated_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(updated_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(updated_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
];

export const vehicleBrandsColumns = [
  {
    label: "#",
    key: "id",
    render: (id) => (
      <div className="d-flex flex-column text-center">
        <Link to={""} className="text-primary fw-medium">
          {id}
        </Link>
      </div>
    ),
    center: true,
  },
  { label: "الماركة", key: "name" },
  {
    label: "الفئة",
    key: "category_id",
    render: (categoryId) => {
      const category = adTypes.find((adType) => adType.value === categoryId);
      return (
        <div className="d-flex flex-column text-center">
          {category ? category.label : "غير معروف"}
        </div>
      );
    },
    center: true,
  },
  {
    label: "تاريخ الانشاء",
    key: "created_at",
    render: (created_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
  {
    label: "اخر تعديل",
    key: "updated_at",
    render: (updated_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(updated_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(updated_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
];

export const vehicleModelsColumns = [
  {
    label: "#",
    key: "id",
    render: (id) => (
      <div className="d-flex flex-column text-center">
        <span className="text-primary fw-medium">{id}</span>
      </div>
    ),
    center: true,
  },
  { label: "الاسم", key: "name" },
  {
    label: "الماركة",
    key: "vehicle_brand",
    render: (_, item) => {
      return item?.vehicle_brand?.name;
    },
  },
  {
    label: "تاريخ الانشاء",
    key: "created_at",
    render: (created_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
  {
    label: "اخر تعديل",
    key: "updated_at",
    render: (updated_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center">
        <p className="m-0">
          {moment(updated_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(updated_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
];

export const CustomersMessagesColumns = [
  {
    label: "#",
    key: "id",
    sort: true,
    center: true,
    render: (id) => <span className="text-center w-100 d-block">{id}</span>,
  },
  {
    label: "الاسم",
    key: "name",
    sort: true,
    center: true,
    render: (name) => <span className="text-center w-100 d-block">{name}</span>,
  },
  {
    label: "البريد الإلكتروني",
    key: "email",
    sort: true,
    center: true,
    render: (email) => (
      <span className="text-center w-100 d-block">{email}</span>
    ),
  },
  {
    label: "رقم الهاتف",
    key: "phone",
    sort: true,
    center: true,
    render: (phone) => (
      <span className="text-center w-100 d-block">{phone}</span>
    ),
  },
  {
    label: "الرسالة",
    key: "message",
    sort: true,
    center: true,
    render: (message) => (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={`tooltip-message`}>{message}</Tooltip>}
      >
        <span
          className="text-center w-100 d-block"
          style={{
            cursor: "pointer",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {message.length > 40 ? message.slice(0, 40) + "..." : message}
        </span>
      </OverlayTrigger>
    ),
  },
  {
    label: "التاريخ",
    key: "created_at",
    sort: true,
    center: true,
    render: (created_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center text-center">
        <p className="m-0">
          {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
];

export const ComplaintsColumns = [
  {
    label: "رقم الشكوى",
    key: "id",
    sort: true,
    center: true,
    width: "80px",
    render: (id) => <span className="text-center w-100 d-block">{id}</span>,
  },
  {
    label: "محتوى الشكوى",
    key: "content",
    sort: true,
    width: "100%",
    center: true,
    render: (content) => (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={`tooltip-message`}>{content}</Tooltip>}
      >
        <span
          className="text-center w-100 d-block"
          style={{
            cursor: "pointer",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {content.length > 40 ? content.slice(0, 40) + "..." : content}
        </span>
      </OverlayTrigger>
    ),
  },
  {
    label: "رقم الإعلان",
    key: "advs_id",
    sort: true,
    width: "100px",
    center: true,
    render: (advs_id) => (
      <button
        className="btn btn-link text-primary p-0 text-center w-100 d-block"
        onClick={() => {
          window.open(
            `${window.location.origin}${
              import.meta.env.BASE_URL
            }advertisements/ad/${advs_id}`,
            "_blank"
          );
        }}
      >
        {advs_id}
      </button>
    ),
  },
  {
    label: "تاريخ الإنشاء",
    key: "created_at",
    sort: true,
    center: true,
    width: "160px",
    render: (created_at) => (
      <span className="text-center w-100 d-block">
        {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        <br />
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </span>
    ),
  },
];

// Helpers for Subscribers columns
export const getArabicPackageName = (englishName) => {
  const packageMap = {
    gold: "الذهبية",
    silver: "الفضية",
    bronze: "البرونزية",
    premium: "المميزة",
    platinum: "البلاتينية",
    basic: "الأساسية",
    standard: "القياسية",
    professional: "الاحترافية",
    enterprise: "المؤسسات",
    business: "الأعمال",
    starter: "المبتدئة",
    free: "المجانية",
    trial: "التجريبية",
  };
  if (!englishName) return "غير متوفر";
  const normalizedName = englishName.toLowerCase().trim();
  if (packageMap[normalizedName]) {
    return packageMap[normalizedName];
  }
  for (const [key, value] of Object.entries(packageMap)) {
    if (normalizedName.includes(key)) {
      return value;
    }
  }
  return englishName;
};

export const subscribersColumns = [
  {
    key: "id",
    label: "#",
    sortable: true,
    width: "80px",
    center: true,
  },
  {
    key: "user",
    label: "المستخدم",
    sortable: true,
    width: "300px",
    center: true,
    render: (user) => (
      <div className="d-flex gap-1 flex-column justify-content-center text-center">
        <p className="m-0">{user?.name || "غير متوفر"}</p>
        <div className="d-flex align-items-center gap-1 fs-11 text-muted justify-content-center">
          <span dir="ltr">{user?.email}</span>
          {user?.email && (
            <button
              className="btn btn-sm btn-icon btn-light"
              style={{ padding: "2px", minWidth: "20px", height: "20px" }}
              onClick={() => navigator.clipboard.writeText(user.email)}
            >
              <i
                className="ri-file-copy-line text-muted"
                style={{ fontSize: "13px" }}
              ></i>
            </button>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "package",
    label: "الباقة",
    sortable: true,
    width: "150px",
    center: true,
    render: (value) => (
      <span className="text-center d-block">{value?.name}</span>
    ),
  },
  {
    key: "remaining_ads",
    label: "الإعلانات المتبقية",
    sortable: true,
    width: "150px",
    center: true,
    render: (value) => (
      <span className="fw-medium text-center d-block">{value}</span>
    ),
  },
  {
    key: "purchase_date",
    label: "تاريخ الشراء",
    sortable: true,
    width: "150px",
    center: true,
    render: (value) => (
      <div className="d-flex gap-1 flex-column justify-content-center text-center">
        <p className="m-0">
          {moment(value).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(value).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
  {
    key: "expiry_date",
    label: "تاريخ الانتهاء",
    sortable: true,
    width: "150px",
    center: true,
    render: (value) => (
      <div className="d-flex gap-1 flex-column justify-content-center text-center">
        <p className="m-0">
          {moment(value).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(value).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
];

export const paymentsRequestsColumns = [
  {
    key: "id",
    label: "#",
    sortable: true,
    width: "60px",
    center: true,
    render: (id) => <div className="text-center d-block">{id}</div>,
  },
  {
    key: "user",
    label: "المستخدم",
    center: true,
    render: (user) => (
      <div className="d-flex gap-1 flex-column justify-content-center text-center">
        <p className="m-0">{user?.name || "غير متوفر"}</p>
        <div className="d-flex align-items-center gap-1 fs-11 text-muted justify-content-center">
          <span dir="ltr">{user?.email}</span>
          {user?.email && (
            <button
              className="btn btn-sm btn-icon btn-light"
              style={{ padding: "2px", minWidth: "20px", height: "20px" }}
              onClick={() => navigator.clipboard.writeText(user.email)}
            >
              <i
                className="ri-file-copy-line text-muted"
                style={{ fontSize: "13px" }}
              ></i>
            </button>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "package",
    label: "الباقة",
    center: true,
    render: (pkg) => (
      <div className="text-center">
        <div>{pkg?.name}</div>
      </div>
    ),
  },
  {
    key: "status",
    label: "الحالة",
    center: true,
    render: (status) => {
      let variant, translatedStatus, icon;
      switch (status) {
        case "pending":
          variant = "warning";
          translatedStatus = "قيد الانتظار";
          icon = "time";
          break;
        case "approved":
          variant = "success";
          translatedStatus = "مقبول";
          icon = "check";
          break;
        case "rejected":
          variant = "danger";
          translatedStatus = "مرفوض";
          icon = "prohibited";
          break;
        default:
          variant = "secondary";
          translatedStatus = status;
      }
      return (
        <div className="text-center">
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id={`tooltip-status-${status}`}>
                {translatedStatus}
              </Tooltip>
            }
          >
            <Badge
              className={`fs-12 py-2 px-3 align-middle bg-${variant}-transparent`}
            >
              {icon && <i className={`ri-${icon}-line`}></i>}
            </Badge>
          </OverlayTrigger>
        </div>
      );
    },
  },
  {
    key: "created_at",
    label: "تاريخ الطلب",
    center: true,
    render: (created_at) => (
      <div className="d-flex gap-1 flex-column justify-content-center text-center">
        <p className="m-0">
          {moment(created_at).tz("Europe/Istanbul").format("YYYY-MM-DD")}
        </p>
        <span className="fs-11 text-muted">
          {moment(created_at).tz("Europe/Istanbul").format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
];
