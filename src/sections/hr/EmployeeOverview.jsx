import React from "react";
import { Col, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { hasPermission } from "../../data/permissionsCatalog";
import { recordFieldAccess } from "./employeePayload";

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

// ⚠️ `dir` GOES ON A <bdi>, NOT ON THE VALUE'S BLOCK.
//
// This used to be `<div className="fw-medium" dir={dir}>`. Setting `dir` on a
// BLOCK changes that block's base direction, which means its `text-align: start`
// stops resolving to "right" (the RTL page) and starts resolving to "left". The
// label above it inherits RTL and stays on the right. So on every field that
// needed LTR — the staff number, the national id, all seven dates, both phones,
// the email, the salary, the Sham Cash account — the label sat against the right
// edge of the column and its value sat against the left edge, with the width of
// the column between them. That is the "values are not under their labels"
// misalignment, and it was 13 of the ~50 fields on this tab.
//
// <bdi> is the element for exactly this: an INLINE run of foreign-direction
// text. It carries `unicode-bidi: isolate` by default, so "+963 11 234 5678" and
// "2026-01-15" order their characters correctly, while the block around it stays
// RTL and keeps the value hard against the same edge as its label. The rest of
// the app already reached this conclusion — every other LTR value in src/ is an
// inline <span dir="ltr">; these two profile files were the outliers.
//
// `d-flex flex-column` + `mt-auto` pins the VALUES to a common baseline across
// each row of the grid, so a label that wraps to two lines drops its own value
// no further than its neighbours'.
const Field = ({ label, value, dir }) => {
  const empty = value === null || value === undefined || value === "";
  return (
    <Col sm={12} md={6} lg={4} className="d-flex flex-column">
      <div className="text-muted fs-11 mb-1">{label}</div>
      <div className="fw-medium mt-auto">
        {empty ? dash : dir ? <bdi dir={dir}>{value}</bdi> : value}
      </div>
    </Col>
  );
};

const isEmptyValue = (value) =>
  value === null || value === undefined || value === "";

// Each section is a bordered PANEL, not a heading with a rule under it and not
// a nested <Card>. See assets/scss/custom/_employee-profile.scss for why those
// two were rejected; the short version is that this content already sits inside
// a card body, and that whitespace between groups is distance rather than
// grouping.
//
// The head counts how much of the section is actually filled in. It reads that
// off its own children's `value` prop — the coupling to <Field> is tight, but
// both components are defined in this file, ten lines apart, and the
// alternative (threading every section's data through as an array) would
// restate fifty field definitions to answer one question. React.Children.toArray
// drops the `false` a `{canViewIdentity && <Field/>}` produces, so a gated field
// is not counted as a missing one.
//
// `gx-4 gy-3` on the Row, not `g-0`. With the gutters zeroed, columns touched:
// the second column's label began exactly where the first column's value ended,
// so a three-up grid of label/value pairs read as one continuous run of text.
// The vertical gap comes from `gy-3` rather than an `mb-3` on each Col, so the
// two do not stack into a double gap.
const Section = ({ title, icon, children }) => {
  const fields = React.Children.toArray(children);
  const filled = fields.filter((f) => !isEmptyValue(f.props?.value)).length;

  return (
    <section className="profile-section">
      <div className="profile-section__head">
        <span className="profile-section__icon" aria-hidden="true">
          <i className={icon}></i>
        </span>
        <h6 className="profile-section__title">{title}</h6>
        <span
          className={`profile-section__count${
            filled === 0 ? " profile-section__count--empty" : ""
          }`}
        >
          {filled} من {fields.length} مسجّلة
        </span>
      </div>
      <div className="profile-section__body">
        <Row className="gx-4 gy-3">{children}</Row>
      </div>
    </section>
  );
};

// Booleans are tri-state: true / false / not recorded. "لا" and "غير مسجّل"
// are different statements and must not collapse into one.
const boolText = (value) =>
  value === true ? "نعم" : value === false ? "لا" : null;

const EmployeeOverview = ({ employee }) => {
  const { permissions } = useSelector((state) => state.auth);
  const holdsSalary = hasPermission(permissions, "hr.employees.viewSalary");
  const holdsIdentity = hasPermission(permissions, "hr.employees.viewIdentity");

  if (!employee) return null;

  // ⚙️ THE RECORD DECIDES, NOT THE PERMISSION LIST (GAP-3, 2026-09-24). A
  // viewSalary granted over one section puts the pay keys on that section's
  // staff only, so holding the permission no longer means this record carries
  // them. What is rendered is exactly what arrived.
  const { canViewSalary, canViewIdentity } = recordFieldAccess(employee);

  // Held, but not for THIS person. Said out loud rather than left as a gap: a
  // payroll clerk who can see pay on most records would otherwise read a
  // missing block as a missing salary. The likely cause (a unit-scoped grant)
  // is offered as a possibility only — "held but absent" is also what a stale
  // permission list looks like after a revoke.
  const outOfReach = [
    holdsSalary && !canViewSalary && "التصنيف والرواتب",
    holdsIdentity && !canViewIdentity && "رقم الهوية",
  ].filter(Boolean);

  return (
    <div>
      <Section title="الهوية" icon="ri-fingerprint-line">
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
        {canViewIdentity && (
          <Field label="رقم الهوية" value={employee.national_id} dir="ltr" />
        )}
      </Section>

      <Section title="البيانات الشخصية" icon="ri-user-3-line">
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

      <Section title="التواصل" icon="ri-phone-line">
        <Field label="الهاتف" value={employee.phone} dir="ltr" />
        <Field label="هاتف إضافي" value={employee.phone_secondary} dir="ltr" />
        <Field label="البريد الإلكتروني" value={employee.email} dir="ltr" />
        <Field label="العنوان" value={employee.address} />
      </Section>

      <Section title="الخدمة العسكرية" icon="ri-shield-star-line">
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

      <Section title="التعليم" icon="ri-graduation-cap-line">
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

      <Section title="العمل" icon="ri-briefcase-line">
        <Field label="القسم" value={employee.department?.name} />
        <Field label="المسمى الوظيفي" value={employee.job_title?.name} />
        {/* `manager` is RESOLVED by the server from the org tree — the unit's
            head, climbing past vacant posts — and replaced `direct_manager` on
            2026-09-24. Null means the top of the tree or an employee with no
            unit, so the plain dash Field() renders is the true statement. */}
        <Field
          label="المدير المباشر"
          value={
            employee.manager ? (
              <span title={employee.manager.employee_number || undefined}>
                {employee.manager.full_name}
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

      {outOfReach.length > 0 && (
        <p className="text-muted fs-12 mb-3">
          <i className="ri-lock-line align-middle me-1" aria-hidden="true"></i>
          {outOfReach.join(" و")} لهذا الموظف غير متاحة بصلاحياتك الحالية —
          قد تكون صلاحيتك ممنوحة على وحدات لا يتبع لها هذا الموظف.
        </p>
      )}

      {/* The whole classification and pay block exists only when the record
          carries it. Without access these twelve keys are absent from the
          response, so the section is not rendered at all rather than shown as a
          wall of dashes, which would read as "nothing is recorded" instead of
          "not for you". */}
      {canViewSalary && (
        <Section title="التصنيف والرواتب" icon="ri-money-dollar-circle-line">
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
