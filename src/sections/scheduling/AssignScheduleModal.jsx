import { useEffect, useMemo, useState } from "react";
import { Alert, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDiscardChanges, toastNotify } from "../../utils";
import { todayInDamascus } from "../attendance/recordFilters";
import { toAssignmentBody, toBulkBody } from "./schedulingPayload";
import { useSchedulingOptions } from "./useSchedulingOptions";

// «إسناد جدول» - one person (API doc §19.3) or many (§19.4). Bulk is per
// person, never all or nothing, so it ends on a result table.

const CYCLE_KIND = 2;

const nameOf = (employee) =>
  employee.employee_number
    ? `${employee.full_name} (${employee.employee_number})`
    : employee.full_name;

const emptyForm = { scheduleId: "", fromDate: "", cycleStartDate: "", who: "people" };

const AssignScheduleModal = ({
  show,
  mode,
  employee = null,
  unitFilter = null,
  selectedIds = [],
  people = [],
  onHide,
  onSaved,
}) => {
  const isBulk = mode === "bulk";
  const {
    schedules,
    loading: optionsLoading,
    error: optionsError,
    reload: reloadOptions,
  } = useSchedulingOptions(show);

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState(null);
  const [extraNames, setExtraNames] = useState(new Map());

  const today = todayInDamascus();

  useEffect(() => {
    if (show) {
      setForm({ ...emptyForm, who: selectedIds.length === 0 && unitFilter ? "unit" : "people" });
      setErrors({});
      setMessage(null);
      setResults(null);
    }
    // Reset only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const chosen = useMemo(
    () => schedules.find((option) => String(option.value) === String(form.scheduleId)),
    [schedules, form.scheduleId]
  );
  const kind = chosen?.item?.kind;
  const isCycle = kind === CYCLE_KIND;

  const names = useMemo(() => {
    const map = new Map();
    extraNames.forEach((name, id) => map.set(id, name));
    people.forEach((person) => map.set(person.id, person.full_name));
    return map;
  }, [people, extraNames]);

  const isDirty = form.scheduleId !== "" || form.fromDate !== "" || form.cycleStartDate !== "";

  const handleCancel = async () => {
    if (saving) return;
    if (!isDirty || results) {
      onHide();
      return;
    }
    if (await confirmDiscardChanges()) onHide();
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const bulkBody = () =>
    toBulkBody({
      scheduleId: form.scheduleId,
      fromDate: form.fromDate,
      cycleStartDate: form.cycleStartDate,
      kind,
      who: form.who,
      employeeIds: selectedIds,
      departmentId: unitFilter?.id ?? "",
    });

  const canSubmit =
    form.scheduleId !== "" &&
    form.fromDate !== "" &&
    (!isCycle || form.cycleStartDate !== "") &&
    (!isBulk || bulkBody() !== null);

  // A unit's result can hold people the page never listed. One calendar read
  // names them; whoever is still missing shows as «موظف #N».
  const nameMissing = async (rows) => {
    const known = new Set(people.map((person) => person.id));
    const missing = rows.map((row) => row.employee_id).filter((id) => !known.has(id));
    if (missing.length === 0) return;
    try {
      const day = todayInDamascus();
      const response = await api.get("/scheduling/calendar", {
        params: {
          employee_ids: missing.join(","),
          from: day,
          to: day,
          per_page: 100,
        },
      });
      const found = new Map();
      (response.data?.data || []).forEach((row) => {
        if (row?.employee?.id !== undefined) {
          found.set(row.employee.id, nameOf(row.employee));
        }
      });
      setExtraNames(found);
    } catch {
      // Unnamed rows fall back to «موظف #N».
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !canSubmit) return;

    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      if (isBulk) {
        const response = await api.post("/scheduling/assignments/bulk", bulkBody());
        toastNotify(response.data.message, "success");
        const rows = response.data.data || [];
        setResults(rows);
        nameMissing(rows);
      } else {
        const body = toAssignmentBody({
          scheduleId: form.scheduleId,
          fromDate: form.fromDate,
          cycleStartDate: form.cycleStartDate,
          kind,
        });
        const response = await api.post(`/hr/employees/${employee.id}/work-schedules`, body);
        toastNotify(response.data.message, "success");
        onSaved?.(response.data.data);
      }
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.status === 0) {
        toastNotify(parsed.message, "error");
      } else {
        setMessage(parsed.message);
        setErrors(parsed.errors || {});
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field) => errors?.[field]?.[0];
  const errorLine = (field) =>
    fieldError(field) && <div className="text-danger small mt-1">{fieldError(field)}</div>;

  const title = isBulk ? "إسناد جدول" : `إسناد جدول: ${employee?.full_name ?? ""}`;

  if (results) {
    return (
      <Modal show={show} onHide={() => onSaved?.()} keyboard={false} centered backdrop="static" scrollable>
        <Modal.Header closeButton>
          <Modal.Title as="h6">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-3">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>النتيجة</th>
                  <th>السبب</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.employee_id}>
                    <td>{names.get(row.employee_id) || `موظف #${row.employee_id}`}</td>
                    <td>{row.assigned ? "أُسند" : "رُفض"}</td>
                    <td>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-secondary fw-md w-100" onClick={() => onSaved?.()}>
            إغلاق
          </button>
        </Modal.Body>
      </Modal>
    );
  }

  return (
    <Modal show={show} onHide={handleCancel} keyboard={false} centered backdrop="static" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h6">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          {message && (
            <Alert variant="danger" className="mb-0 py-2 px-3">
              {message}
            </Alert>
          )}
          {optionsError && (
            <Alert
              variant="danger"
              className="mb-0 py-2 px-3 d-flex align-items-center justify-content-between"
            >
              <span>{typeof optionsError === "string" ? optionsError : "تعذّر تحميل الجداول."}</span>
              <button type="button" className="btn btn-sm btn-light" onClick={reloadOptions}>
                إعادة المحاولة
              </button>
            </Alert>
          )}
          {isBulk && (
            <div>
              <Form.Check
                type="radio"
                id="as-who-people"
                name="as-who"
                label={`الموظفون المحددون (${selectedIds.length})`}
                checked={form.who === "people"}
                onChange={() => setField("who", "people")}
              />
              {unitFilter && (
                <Form.Check
                  type="radio"
                  id="as-who-unit"
                  name="as-who"
                  label={`كل موظفي ${unitFilter.name} ووحداته`}
                  checked={form.who === "unit"}
                  onChange={() => setField("who", "unit")}
                />
              )}
              {errorLine("employee_ids")}
              {errorLine("department_id")}
            </div>
          )}
          <Row className="g-3">
            <Col xs={12}>
              <Form.Label htmlFor="as-schedule">الجدول *</Form.Label>
              <Form.Select
                id="as-schedule"
                value={form.scheduleId}
                onChange={(e) => setField("scheduleId", e.target.value)}
                isInvalid={!!fieldError("work_schedule_id")}
                disabled={optionsLoading}
              >
                <option value="">اختر الجدول</option>
                {schedules.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
              {errorLine("work_schedule_id")}
            </Col>
            <Col sm={12} md={isCycle ? 6 : 12}>
              <Form.Label htmlFor="as-from">من تاريخ *</Form.Label>
              <Form.Control
                id="as-from"
                type="date"
                dir="ltr"
                min={today}
                value={form.fromDate}
                onChange={(e) => setField("fromDate", e.target.value)}
                isInvalid={!!fieldError("from_date")}
              />
              {errorLine("from_date")}
            </Col>
            {isCycle && (
              <Col sm={12} md={6}>
                <Form.Label htmlFor="as-cycle">بداية الدورة *</Form.Label>
                <Form.Control
                  id="as-cycle"
                  type="date"
                  dir="ltr"
                  value={form.cycleStartDate}
                  onChange={(e) => setField("cycleStartDate", e.target.value)}
                  isInvalid={!!fieldError("cycle_start_date")}
                />
                {errorLine("cycle_start_date")}
              </Col>
            )}
          </Row>
          <Row className="g-2">
            <Col sm={12} md={6}>
              <button
                className="btn btn-secondary fw-md w-100"
                type="submit"
                disabled={saving || !canSubmit || !!optionsError}
              >
                {saving ? <Spinner animation="border" size="sm" /> : "إسناد"}
              </button>
            </Col>
            <Col sm={12} md={6}>
              <button
                type="button"
                className="btn btn-light fw-md w-100"
                onClick={handleCancel}
                disabled={saving}
              >
                إلغاء
              </button>
            </Col>
          </Row>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default AssignScheduleModal;
