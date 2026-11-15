import { Col, Form, Row } from "react-bootstrap";
import { formatMinutes } from "../attendance/minutesText";

// The seven rule inputs of a shift (per-shift rules spec §2.1, §5.2), shared
// by a new shift's form and a new rules version. `value` is rulesFormFrom()'s
// shape; `fieldError(field)` returns the server's message for a field.

const NUMBER_FIELDS = [
  { key: "late_grace_minutes", label: "مهلة التأخر (دقيقة)", max: 120 },
  { key: "early_leave_grace_minutes", label: "مهلة الانصراف المبكر (دقيقة)", max: 120 },
  { key: "check_in_opens_minutes", label: "فتح التسجيل قبل البداية (دقيقة)", max: 240 },
  { key: "check_out_closes_minutes", label: "قبول الانصراف بعد النهاية (دقيقة)", max: 480 },
];

const ShiftRulesFields = ({ value, onChange, fieldError = () => null, idPrefix, lengthMinutes }) => {
  const errorLine = (field) =>
    fieldError(field) && <div className="text-danger small mt-1">{fieldError(field)}</div>;

  return (
    <Row className="g-3">
      {NUMBER_FIELDS.map(({ key, label, max }) => (
        <Col sm={12} md={6} key={key}>
          <Form.Label htmlFor={`${idPrefix}-${key}`}>{label}</Form.Label>
          <Form.Control
            id={`${idPrefix}-${key}`}
            type="number"
            dir="ltr"
            min={0}
            max={max}
            value={value[key]}
            onChange={(e) => onChange(key, e.target.value)}
            isInvalid={!!fieldError(key)}
          />
          {errorLine(key)}
        </Col>
      ))}
      <Col sm={12} md={6}>
        <Form.Check
          type="switch"
          id={`${idPrefix}-overtime_enabled`}
          label="احتساب العمل الإضافي"
          checked={value.overtime_enabled}
          onChange={(e) => onChange("overtime_enabled", e.target.checked)}
        />
        {errorLine("overtime_enabled")}
      </Col>
      <Col sm={12} md={6}>
        <Form.Label htmlFor={`${idPrefix}-overtime_min_minutes`}>الحد الأدنى للعمل الإضافي (دقيقة)</Form.Label>
        <Form.Control
          id={`${idPrefix}-overtime_min_minutes`}
          type="number"
          dir="ltr"
          min={0}
          max={240}
          value={value.overtime_min_minutes}
          onChange={(e) => onChange("overtime_min_minutes", e.target.value)}
          disabled={!value.overtime_enabled}
          isInvalid={!!fieldError("overtime_min_minutes")}
        />
        {errorLine("overtime_min_minutes")}
      </Col>
      <Col sm={12}>
        <Form.Label htmlFor={`${idPrefix}-required_hours`}>الساعات المطلوبة</Form.Label>
        <div className="d-flex gap-2 align-items-center">
          <Form.Control
            id={`${idPrefix}-required_hours`}
            type="number"
            dir="ltr"
            min={0}
            max={24}
            placeholder="ساعات"
            aria-label="ساعات"
            value={value.required_hours}
            onChange={(e) => onChange("required_hours", e.target.value)}
            isInvalid={!!fieldError("required_minutes")}
          />
          <Form.Control
            type="number"
            dir="ltr"
            min={0}
            max={59}
            placeholder="دقائق"
            aria-label="دقائق"
            value={value.required_mins}
            onChange={(e) => onChange("required_mins", e.target.value)}
            isInvalid={!!fieldError("required_minutes")}
          />
        </div>
        <div className="text-muted small mt-1">
          {lengthMinutes
            ? `فارغ = كامل الوردية (${formatMinutes(lengthMinutes)}). أقل من ذلك يُسجَّل اليوم ناقصاً بالفرق.`
            : "فارغ = كامل الوردية."}
        </div>
        {errorLine("required_minutes")}
      </Col>
    </Row>
  );
};

export default ShiftRulesFields;
