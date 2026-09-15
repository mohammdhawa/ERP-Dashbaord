// Employee create/update payload construction (API doc §8.1).
//
// THREE RULES DECIDE WHETHER A KEY IS SENT AT ALL:
//
// 1. FIELD GATING. Without hr.employees.viewSalary / viewIdentity the server
//    OMITS those keys from the response entirely (absent, never null). A field
//    the editor could not read must not be rendered AND must not be submitted:
//    initialising an input from a missing key yields "", and submitting "" as
//    null would wipe a stored value the editor was never allowed to see.
//
// 2. OMIT vs NULL. Not every optional field is nullable. Where the contract
//    does not mark a field nullable, a blank input means OMIT the key (the
//    rules are `sometimes`, so an absent key leaves the stored value alone).
//    Sending null there is a 422. Where the contract DOES mark it nullable,
//    null is the documented way to clear it.
//
// 3. CROSS-FIELD RULES. A few fields are legal only in combination with
//    another (engineering_rank with activity_type 1, agreed_salary with
//    salary_mode 2, wives_count with marital_status 2). The disallowed one is
//    not sent at all.

const ACTIVITY_ENGINEERING = 1;
const ACTIVITY_INDUSTRIAL = 2;
const MARITAL_MARRIED = 2;
const SALARY_MODE_SYSTEM = 1;
const SALARY_MODE_AGREED = 2;

export const EMPLOYEE_CONSTANTS = Object.freeze({
  ACTIVITY_ENGINEERING,
  ACTIVITY_INDUSTRIAL,
  MARITAL_MARRIED,
  SALARY_MODE_SYSTEM,
  SALARY_MODE_AGREED,
});

const isBlank = (value) => value === "" || value === null || value === undefined;

const str = (value) => String(value ?? "").trim();
const num = (value) => (isBlank(value) ? null : Number(value));

// Every input the form owns, with "" as the empty value for all of them so a
// controlled input never flips to uncontrolled.
export const emptyEmployeeForm = Object.freeze({
  // الهوية
  employee_number: "",
  legacy_number: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  mother_name: "",
  national_id: "",
  // البيانات الشخصية
  gender: "",
  birth_date: "",
  birth_place: "",
  origin_governorate: "",
  residence_governorate: "",
  nationality: "",
  second_nationality: "",
  marital_status: "",
  wives_count: "",
  sons_count: "",
  daughters_count: "",
  // التواصل
  phone: "",
  phone_secondary: "",
  email: "",
  address: "",
  // الخدمة العسكرية
  did_military_service: "",
  military_discharge_date: "",
  // التعليم
  education_level: "",
  qualification: "",
  specialization: "",
  is_graduated: "",
  graduation_date: "",
  // العمل
  department_id: "",
  job_title_id: "",
  direct_manager_id: "",
  employment_type: "",
  workplace: "",
  hire_date: "",
  termination_date: "",
  status: "",
  // التصنيف والرواتب
  activity_type: "",
  organizational_grade: "",
  experience_level: "",
  engineering_rank: "",
  industrial_experience_years: "",
  has_hazard_pay: "",
  has_scarcity_pay: "",
  has_dual_role_pay: "",
  distinction_grade: "",
  salary_mode: "",
  agreed_salary: "",
  sham_cash_account: "",
});

// Booleans arrive as true/false/null. Keep null as "" so an untouched tri-state
// is not silently submitted as false.
const boolToForm = (value) =>
  value === true ? "true" : value === false ? "false" : "";

/**
 * Seeds form state from a server record.
 *
 * A gated key that is ABSENT is seeded as "" here, but `buildEmployeePayload`
 * never sends it back, so the stored value survives an edit by someone who
 * cannot see it.
 */
export const getEmployeeFormValues = (employee) => {
  if (!employee) return { ...emptyEmployeeForm };

  const pick = (key) => (employee[key] == null ? "" : employee[key]);

  return {
    ...emptyEmployeeForm,
    employee_number: pick("employee_number"),
    legacy_number: pick("legacy_number"),
    first_name: pick("first_name"),
    middle_name: pick("middle_name"),
    last_name: pick("last_name"),
    mother_name: pick("mother_name"),
    national_id: pick("national_id"),

    gender: pick("gender"),
    birth_date: pick("birth_date"),
    birth_place: pick("birth_place"),
    origin_governorate: pick("origin_governorate"),
    residence_governorate: pick("residence_governorate"),
    nationality: pick("nationality"),
    second_nationality: pick("second_nationality"),
    marital_status: pick("marital_status"),
    wives_count: pick("wives_count"),
    sons_count: pick("sons_count"),
    daughters_count: pick("daughters_count"),

    phone: pick("phone"),
    phone_secondary: pick("phone_secondary"),
    email: pick("email"),
    address: pick("address"),

    did_military_service: boolToForm(employee.did_military_service),
    military_discharge_date: pick("military_discharge_date"),

    education_level: pick("education_level"),
    qualification: pick("qualification"),
    specialization: pick("specialization"),
    is_graduated: boolToForm(employee.is_graduated),
    graduation_date: pick("graduation_date"),

    department_id: pick("department_id"),
    job_title_id: pick("job_title_id"),
    direct_manager_id: pick("direct_manager_id"),
    employment_type: pick("employment_type"),
    workplace: pick("workplace"),
    hire_date: pick("hire_date"),
    termination_date: pick("termination_date"),
    status: pick("status"),

    activity_type: pick("activity_type"),
    organizational_grade: pick("organizational_grade"),
    experience_level: pick("experience_level"),
    engineering_rank: pick("engineering_rank"),
    industrial_experience_years: pick("industrial_experience_years"),
    has_hazard_pay: boolToForm(employee.has_hazard_pay),
    has_scarcity_pay: boolToForm(employee.has_scarcity_pay),
    has_dual_role_pay: boolToForm(employee.has_dual_role_pay),
    distinction_grade: pick("distinction_grade"),
    sham_cash_account: pick("sham_cash_account"),
    salary_mode: pick("salary_mode"),
    // agreed_salary is a decimal STRING. It is never parsed as a float here or
    // anywhere else: a float round-trip can alter the value the server stores.
    agreed_salary:
      employee.agreed_salary == null ? "" : String(employee.agreed_salary),
  };
};

/**
 * Builds the create/update body.
 *
 * @param values   form state
 * @param options  { isEdit, canViewSalary, canViewIdentity }
 */
export const buildEmployeePayload = (values, options = {}) => {
  const {
    isEdit = false,
    canViewSalary = false,
    canViewIdentity = false,
  } = options;

  const payload = {};

  // Nullable field: "" clears it with an explicit null.
  const setNullable = (key, value) => {
    payload[key] = isBlank(value) ? null : value;
  };
  const setNullableNum = (key, value) => {
    payload[key] = isBlank(value) ? null : Number(value);
  };
  const setNullableStr = (key, value) => {
    const trimmed = str(value);
    payload[key] = trimmed === "" ? null : trimmed;
  };
  const setNullableBool = (key, value) => {
    payload[key] = value === "" ? null : value === "true" || value === true;
  };
  // Non-nullable optional field: "" means leave the stored value alone.
  const setOmittableStr = (key, value) => {
    const trimmed = str(value);
    if (trimmed !== "") payload[key] = trimmed;
  };
  const setOmittableNum = (key, value) => {
    if (!isBlank(value)) payload[key] = Number(value);
  };
  const setOmittableBool = (key, value) => {
    if (value === "") return;
    payload[key] = value === "true" || value === true;
  };

  // ---- الهوية -------------------------------------------------------------
  // Names are required on create and `sometimes` on update; a blank one on
  // update is omitted rather than sent as "" (which would be a 422).
  setOmittableStr("first_name", values.first_name);
  setOmittableStr("middle_name", values.middle_name);
  setOmittableStr("last_name", values.last_name);
  setNullableStr("mother_name", values.mother_name);
  setNullableStr("legacy_number", values.legacy_number);

  // Omitted when blank in BOTH directions: on create that is what triggers
  // EMP-00001 generation; on update the rule is `filled`, so it cannot be
  // cleared and a blank box must not try.
  setOmittableStr("employee_number", values.employee_number);

  // ---- البيانات الشخصية ---------------------------------------------------
  setOmittableNum("gender", values.gender);
  setNullable("birth_date", values.birth_date || "");
  setNullableStr("birth_place", values.birth_place);
  setNullableNum("origin_governorate", values.origin_governorate);
  setNullableNum("residence_governorate", values.residence_governorate);
  // `nationality` is optional but NOT nullable (it defaults to سوري
  // server-side), so a blank one is omitted.
  setOmittableStr("nationality", values.nationality);
  // `second_nationality` IS nullable, despite sitting on the same row of the
  // contract table. Omitting a blank one made an existing value impossible to
  // clear; null is how the field is emptied.
  setNullableStr("second_nationality", values.second_nationality);
  setNullableNum("marital_status", values.marital_status);

  // wives_count is legal ONLY for a married employee.
  //
  // ⚠️ For a NON-married employee this must send an explicit 0 — omitting it is
  // not good enough. The server validates against the row it will END UP
  // storing, merging the submitted keys over the stored ones, so an omitted
  // wives_count leaves the PREVIOUS positive count in place; the married-only
  // rule then fires and a married employee can never be changed to عازب /
  // مطلق / أرمل. 0 satisfies the guard (it short-circuits on 0) and is a legal
  // value for this non-nullable field, where null would be a 422.
  if (Number(values.marital_status) === MARITAL_MARRIED) {
    setOmittableNum("wives_count", values.wives_count);
  } else {
    payload.wives_count = 0;
  }
  setOmittableNum("sons_count", values.sons_count);
  setOmittableNum("daughters_count", values.daughters_count);
  // children_count is DERIVED server-side from sons + daughters. Displayed in
  // the form, never submitted.

  // ---- التواصل ------------------------------------------------------------
  setNullableStr("phone", values.phone);
  setNullableStr("phone_secondary", values.phone_secondary);
  setNullableStr("email", values.email);
  setNullableStr("address", values.address);

  // ---- الخدمة العسكرية ----------------------------------------------------
  setNullableBool("did_military_service", values.did_military_service);
  setNullable("military_discharge_date", values.military_discharge_date || "");

  // ---- التعليم ------------------------------------------------------------
  setNullableNum("education_level", values.education_level);
  setNullableStr("qualification", values.qualification);
  setNullableStr("specialization", values.specialization);
  setNullableBool("is_graduated", values.is_graduated);
  setNullable("graduation_date", values.graduation_date || "");

  // ---- العمل --------------------------------------------------------------
  setNullableNum("department_id", values.department_id);
  setNullableNum("job_title_id", values.job_title_id);
  setNullableNum("direct_manager_id", values.direct_manager_id);
  setNullableNum("employment_type", values.employment_type);
  setNullableStr("workplace", values.workplace);
  setNullable("hire_date", values.hire_date || "");
  setNullable("termination_date", values.termination_date || "");
  // status is optional but NOT nullable.
  setOmittableNum("status", values.status);

  // ---- التصنيف والرواتب (hr.employees.viewSalary) --------------------------
  // Without the permission NOT ONE of these twelve keys is sent. The editor
  // never saw them, so they must not overwrite them.
  if (canViewSalary) {
    const activity = num(values.activity_type);
    setNullableNum("activity_type", values.activity_type);
    setNullableNum("organizational_grade", values.organizational_grade);
    setNullableNum("experience_level", values.experience_level);
    setNullableNum("distinction_grade", values.distinction_grade);

    // engineering_rank belongs to هندسي only; industrial years to صناعي only.
    // For the other activity the field is explicitly cleared (both ARE
    // nullable), so switching activity cannot leave a contradictory value
    // behind that the server would then reject.
    if (activity === ACTIVITY_ENGINEERING) {
      setNullableNum("engineering_rank", values.engineering_rank);
      payload.industrial_experience_years = null;
    } else if (activity === ACTIVITY_INDUSTRIAL) {
      setNullableNum(
        "industrial_experience_years",
        values.industrial_experience_years
      );
      payload.engineering_rank = null;
    } else {
      payload.engineering_rank = null;
      payload.industrial_experience_years = null;
    }

    setOmittableBool("has_hazard_pay", values.has_hazard_pay);
    setOmittableBool("has_scarcity_pay", values.has_scarcity_pay);
    setOmittableBool("has_dual_role_pay", values.has_dual_role_pay);
    setNullableStr("sham_cash_account", values.sham_cash_account);

    const mode = num(values.salary_mode);
    setOmittableNum("salary_mode", values.salary_mode);
    if (mode === SALARY_MODE_AGREED) {
      // Kept as the exact decimal STRING: a numeric string satisfies the
      // server rule while preserving precision no float round-trip can.
      payload.agreed_salary = str(values.agreed_salary);
    } else if (mode === SALARY_MODE_SYSTEM) {
      // Forbidden on the نظام رواتب track — null is the documented way to say
      // "there is none", and agreed_salary IS nullable.
      payload.agreed_salary = null;
    }
  }

  // ---- رقم الهوية (hr.employees.viewIdentity) ------------------------------
  if (canViewIdentity) {
    setNullableStr("national_id", values.national_id);
  }

  // Creating: drop the explicit nulls that exist only to CLEAR a stored value.
  // A new record has nothing to clear, and a shorter body is easier to read in
  // a log. Non-nullable keys were never added in the first place.
  if (!isEdit) {
    Object.keys(payload).forEach((key) => {
      if (payload[key] === null) delete payload[key];
    });
  }

  return payload;
};

// Client-side mirror of the documented cross-field rules, so the common
// mistakes are caught before the request. The server still decides: a 422 is
// mapped back by exact field name, and these messages match its wording.
export const validateEmployeeForm = (values, options = {}) => {
  const { isEdit = false, canViewSalary = false, canViewIdentity = false } =
    options;
  const errors = {};

  if (!isEdit) {
    if (!str(values.first_name)) errors.first_name = ["الاسم الأول مطلوب."];
    if (!str(values.middle_name)) errors.middle_name = ["اسم الأب مطلوب."];
    if (!str(values.last_name)) errors.last_name = ["الكنية مطلوبة."];
    if (isBlank(values.gender)) errors.gender = ["الجنس مطلوب."];
  } else if (isEdit && str(values.employee_number) === "") {
    // `filled` on update: present-but-empty is rejected. We omit it instead,
    // but tell the user their edit will not clear it.
    errors.employee_number = ["لا يمكن إفراغ الرقم الوظيفي بعد إنشائه."];
  }

  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email))
    errors.email = ["يرجى إدخال بريد إلكتروني صالح."];

  // Date-only comparison on YYYY-MM-DD strings. Lexicographic order matches
  // chronological order for this format, so no Date parsing (and no timezone
  // shift) is needed.
  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (values.birth_date && values.birth_date >= todayStr)
    errors.birth_date = ["تاريخ الميلاد يجب أن يسبق تاريخ اليوم."];

  if (
    values.hire_date &&
    values.termination_date &&
    values.termination_date < values.hire_date
  )
    errors.termination_date = [
      "تاريخ انتهاء العمل لا يمكن أن يسبق تاريخ التعيين.",
    ];

  if (
    Number(values.marital_status) !== MARITAL_MARRIED &&
    !isBlank(values.wives_count)
  )
    errors.wives_count = ["عدد الزوجات يُحدَّد للموظف المتزوج فقط."];

  if (canViewSalary) {
    const activity = num(values.activity_type);

    if (!isBlank(values.engineering_rank) && activity !== ACTIVITY_ENGINEERING)
      errors.engineering_rank = [
        "الرتبة الهندسية تُحدَّد للموظفين ذوي النشاط الهندسي فقط.",
      ];

    if (
      !isBlank(values.industrial_experience_years) &&
      activity !== ACTIVITY_INDUSTRIAL
    )
      errors.industrial_experience_years = [
        "سنوات الخبرة الصناعية تُحدَّد للموظفين ذوي النشاط الصناعي فقط.",
      ];

    const mode = num(values.salary_mode);
    const agreed = str(values.agreed_salary);

    if (mode === SALARY_MODE_AGREED && agreed === "")
      errors.agreed_salary = [
        "الراتب المتفق عليه مطلوب عندما يكون نظام الراتب «إتفاق».",
      ];

    if (mode === SALARY_MODE_SYSTEM && agreed !== "")
      errors.agreed_salary = [
        "لا يجوز تحديد راتب متفق عليه ضمن «نظام الرواتب»؛ الراتب يُحتسب من المعايير.",
      ];

    // Decimal validated with STRING operations only — never Number(), which
    // would round-trip the value through a binary float.
    if (agreed !== "" && !/^\d+(\.\d{1,2})?$/.test(agreed))
      errors.agreed_salary = [
        "يجب أن يكون الراتب رقماً موجباً (منزلتان عشريتان بحد أقصى).",
      ];

    const sham = str(values.sham_cash_account);
    if (sham !== "" && !/^\d{16}$/.test(sham))
      errors.sham_cash_account = ["رقم الشام كاش يجب أن يتكون من 16 رقماً."];
  }

  if (canViewIdentity && str(values.national_id).length > 50)
    errors.national_id = ["رقم الهوية طويل جداً (الحد الأقصى 50)."];

  return errors;
};

// children_count is computed by the server from sons + daughters. Shown so the
// user can sanity-check what they typed; never part of the payload.
export const derivedChildrenCount = (values) => {
  const sons = isBlank(values.sons_count) ? 0 : Number(values.sons_count);
  const daughters = isBlank(values.daughters_count)
    ? 0
    : Number(values.daughters_count);
  return sons + daughters;
};
