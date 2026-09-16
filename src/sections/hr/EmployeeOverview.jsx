import React from "react";
import { Col, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { hasPermission } from "../../data/permissionsCatalog";

// نظرة عامة — the whole record, read-only, honouring BOTH field gates exactly
// as the form does.
//
// Every enum is rendered from the server's `{field}_label`, never from a local
// mapping. Where a label is missing the raw value is shown rather than a guess.
// Dates are plain YYYY-MM-DD strings printed verbatim: parsing one through Date
// or moment can shift it a day across a timezone boundary, and a birthday that
// moves is a data bug that looks like a rendering bug.
//
// All values render as plain text — server data is untrusted and nothing here
// goes anywhere near dangerouslySetInnerHTML.

const dash = <span className="text-muted">—</span>;

const Field = ({ label, value, dir }) => (
  <Col sm={12} md={6} lg={4} className="mb-3">
    <div className="text-muted fs-11 mb-1">{label}</div>
    <div className="fw-medium" dir={dir}>
      {value === null || value === undefined || value === "" ? dash : value}
    </div>
  </Col>
);

const Section = ({ title, children }) => (
  <div className="mb-4">
    <h6 className="mb-3 pb-2 border-bottom">{title}</h6>
    <Row className="g-0">{children}</Row>
  </div>
);

// Booleans are tri-state: true / false / not recorded. "لا" and "غير مسجّل"
// are different statements and must not collapse into one.
const boolText = (value) =>
  value === true ? "نعم" : value === false ? "لا" : null;

const EmployeeOverview = ({ employee }) => {
  const { permissions } = useSelector((state) => state.auth);
  const canViewSalary = hasPermission(permissions, "hr.employees.viewSalary");
  const canViewIdentity = hasPermission(
    permissions,
    "hr.employees.viewIdentity"
  );

  if (!employee) return null;

  return (
    <div>
      <Section title="الهوية">
        <Field label="الاسم الكامل" value={employee.full_name} />
        <Field label="الاسم الأول" value={employee.first_name} />
        <Field label="اسم الأب" value={employee.middle_name} />
        <Field label="الكنية" value={employee.last_name} />
        <Field label="اسم الأم" value={employee.mother_name} />
        <Field
          label="الرقم الوظيفي"
          value={employee.employee_number}
          dir="ltr"
        />
        <Field label="الرقم القديم" value={employee.legacy_number} dir="ltr" />
        {canViewIdentity && (
          <Field label="رقم الهوية" value={employee.national_id} dir="ltr" />
        )}
      </Section>

      <Section title="البيانات الشخصية">
        <Field label="الجنس" value={employee.gender_label} />
        <Field label="تاريخ الميلاد" value={employee.birth_date} dir="ltr" />
        <Field label="مكان الولادة" value={employee.birth_place} />
        <Field
          label="محافظة المنشأ"
          value={employee.origin_governorate_label}
        />
        <Field
          label="محافظة الإقامة"
          value={employee.residence_governorate_label}
        />
        <Field label="الجنسية" value={employee.nationality} />
        <Field label="الجنسية الثانية" value={employee.second_nationality} />
        <Field
          label="الحالة الاجتماعية"
          value={employee.marital_status_label}
        />
        <Field label="عدد الزوجات" value={employee.wives_count} />
        <Field label="عدد الأبناء" value={employee.sons_count} />
        <Field label="عدد البنات" value={employee.daughters_count} />
        <Field label="عدد الأولاد" value={employee.children_count} />
      </Section>

      <Section title="التواصل">
        <Field label="الهاتف" value={employee.phone} dir="ltr" />
        <Field label="هاتف إضافي" value={employee.phone_secondary} dir="ltr" />
        <Field label="البريد الإلكتروني" value={employee.email} dir="ltr" />
        <Field label="العنوان" value={employee.address} />
      </Section>

      <Section title="الخدمة العسكرية">
        <Field
          label="أدى الخدمة العسكرية"
          value={boolText(employee.did_military_service)}
        />
        <Field
          label="تاريخ التسريح"
          value={employee.military_discharge_date}
          dir="ltr"
        />
      </Section>

      <Section title="التعليم">
        <Field
          label="المستوى التعليمي"
          value={employee.education_level_label}
        />
        <Field label="المؤهل العلمي" value={employee.qualification} />
        <Field label="الاختصاص" value={employee.specialization} />
        <Field label="متخرج" value={boolText(employee.is_graduated)} />
        <Field
          label="تاريخ التخرج"
          value={employee.graduation_date}
          dir="ltr"
        />
      </Section>

      <Section title="العمل">
        <Field label="القسم" value={employee.department?.name} />
        <Field label="المسمى الوظيفي" value={employee.job_title?.name} />
        {/* Embedded now — `direct_manager: { id, full_name, employee_number }`
            beside the untouched `direct_manager_id`. The id-set-but-object-null
            case means the manager's own record has been soft-deleted: the
            reporting line is still recorded, the person is not. Field() renders
            a plain dash for null, which would claim this employee reports to
            nobody, so that case is spelled out instead. */}
        <Field
          label="المدير المباشر"
          value={
            employee.direct_manager ? (
              <span title={employee.direct_manager.employee_number || undefined}>
                {employee.direct_manager.full_name}
              </span>
            ) : employee.direct_manager_id ? (
              <span className="text-muted">
                موظف #{employee.direct_manager_id} — سجل غير متاح
              </span>
            ) : null
          }
        />
        <Field label="نوع التوظيف" value={employee.employment_type_label} />
        <Field label="مكان العمل" value={employee.workplace} />
        <Field label="تاريخ التعيين" value={employee.hire_date} dir="ltr" />
        <Field
          label="تاريخ انتهاء العمل"
          value={employee.termination_date}
          dir="ltr"
        />
        <Field label="الحالة" value={employee.status_label} />
      </Section>

      {/* The whole classification and pay block exists only with viewSalary.
          Without it these twelve keys are absent from the response, so the
          section is not rendered at all rather than shown as a wall of dashes,
          which would read as "nothing is recorded" instead of "not for you". */}
      {canViewSalary && (
        <Section title="التصنيف والرواتب">
          <Field label="نوع النشاط" value={employee.activity_type_label} />
          <Field
            label="الدرجة التنظيمية"
            value={employee.organizational_grade}
          />
          <Field label="مستوى الخبرة" value={employee.experience_level} />
          <Field
            label="الرتبة الهندسية"
            value={employee.engineering_rank_label}
          />
          <Field
            label="سنوات الخبرة الصناعية"
            value={employee.industrial_experience_years}
          />
          <Field
            label="تعويض خطورة"
            value={boolText(employee.has_hazard_pay)}
          />
          <Field
            label="تعويض ندرة"
            value={boolText(employee.has_scarcity_pay)}
          />
          <Field
            label="تعويض ازدواج وظيفي"
            value={boolText(employee.has_dual_role_pay)}
          />
          <Field label="درجة التميّز" value={employee.distinction_grade} />
          <Field label="نظام الراتب" value={employee.salary_mode_label} />
          {/* Decimal STRING, printed as received. The only pay figure that
              exists — a computed salary is not served by this API. */}
          <Field
            label="الراتب المتفق عليه"
            value={employee.agreed_salary}
            dir="ltr"
          />
          <Field
            label="حساب الشام كاش"
            value={employee.sham_cash_account}
            dir="ltr"
          />
        </Section>
      )}
    </div>
  );
};

export default EmployeeOverview;
