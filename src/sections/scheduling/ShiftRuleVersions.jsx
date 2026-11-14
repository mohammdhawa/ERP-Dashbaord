import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Form, Spinner } from "react-bootstrap";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDestructive, toastNotify } from "../../utils";
import { todayInDamascus } from "../attendance/recordFilters";
import ShiftRulesFields from "./ShiftRulesFields";
import { rulesFormFrom, rulesProblem, toRulesBody } from "./schedulingPayload";
import { canDeleteRuleVersion, ruleSummary } from "./rulesView";

// A used shift's rules change only as a dated version (per-shift rules spec
// §2.3, §5.2): the list, «قواعد جديدة من تاريخ», and «حذف» on one not yet
// started. Past days keep the rules they had.

const ShiftRuleVersions = ({ shift, onChanged }) => {
  const today = todayInDamascus();
  const [versions, setVersions] = useState([]);
  const [rules, setRules] = useState(shift.rules ?? null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [from, setFrom] = useState(today);
  const [form, setForm] = useState(() => rulesFormFrom(shift.rules));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.get(`/scheduling/shifts/${shift.id}`);
      if (mine !== seq.current) return;
      setVersions(response.data.data.rule_versions ?? []);
      setRules(response.data.data.rules ?? null);
    } catch (err) {
      if (mine === seq.current) setLoadError(parseApiError(err).message);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [shift.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setForm(rulesFormFrom(rules));
    setFrom(today);
    setErrors({});
    setMessage(null);
    setAdding(true);
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const response = await api.post(`/scheduling/shifts/${shift.id}/rules`, {
        effective_from: from,
        ...toRulesBody(form, shift.duration_minutes),
      });
      toastNotify(response.data.message, "success");
      setAdding(false);
      await load();
      onChanged?.();
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

  const remove = async (version) => {
    const confirmed = await confirmDestructive({
      action: "حذف قواعد الوردية",
      subject: `من ${version.effective_from}`,
      text: "تُحذف هذه القواعد قبل بدئها، وتبقى القواعد السابقة سارية.",
    });
    if (!confirmed) return;
    try {
      const response = await api.delete(`/scheduling/shifts/${shift.id}/rules/${version.id}`);
      toastNotify(response.data.message, "success");
    } catch (err) {
      toastNotify(parseApiError(err).message, "error");
    }
    await load();
    onChanged?.();
  };

  const fieldError = (field) => errors?.[field]?.[0];

  return (
    <div className="border-top pt-3 mt-1 d-flex flex-column gap-2">
      <div className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">قواعد الوردية</h6>
        {!adding && (
          <button type="button" className="btn btn-sm btn-primary-light" onClick={openAdd} disabled={loading}>
            قواعد جديدة من تاريخ
          </button>
        )}
      </div>

      {loading ? (
        <Spinner animation="border" size="sm" />
      ) : loadError ? (
        <Alert variant="danger" className="mb-0 py-2 px-3">
          {loadError}{" "}
          <button type="button" className="btn btn-link btn-sm p-0" onClick={load}>
            إعادة المحاولة
          </button>
        </Alert>
      ) : (
        <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
          {versions.map((version) => (
            <li key={version.id} className="border rounded p-2 small">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <div className="fw-semibold">
                    {version.effective_from === "2000-01-01" ? "منذ إنشاء الوردية" : `من ${version.effective_from}`}
                  </div>
                  <div className="text-muted">{ruleSummary(version)}</div>
                  {version.created_by?.name && <div className="text-muted">بواسطة: {version.created_by.name}</div>}
                </div>
                {canDeleteRuleVersion(version, today) && (
                  <button type="button" className="btn btn-sm btn-danger-light" onClick={() => remove(version)}>
                    حذف
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form onSubmit={save} className="border rounded p-2 d-flex flex-column gap-3">
          {message && (
            <Alert variant="danger" className="mb-0 py-2 px-3">
              {message}
            </Alert>
          )}
          <div>
            <Form.Label htmlFor="sr-from">تسري من *</Form.Label>
            <Form.Control
              id="sr-from"
              type="date"
              dir="ltr"
              min={today}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              isInvalid={!!fieldError("effective_from")}
            />
            <div className="text-muted small mt-1">الأيام السابقة تبقى على قواعدها.</div>
          </div>
          <ShiftRulesFields
            value={form}
            onChange={setField}
            fieldError={fieldError}
            idPrefix="sr"
            lengthMinutes={shift.duration_minutes}
          />
          {rulesProblem(form) && <div className="text-danger small">{rulesProblem(form)}</div>}
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-secondary btn-sm" disabled={saving || !from || Boolean(rulesProblem(form))}>
              {saving ? <Spinner animation="border" size="sm" /> : "حفظ القواعد"}
            </button>
            <button type="button" className="btn btn-light btn-sm" onClick={() => setAdding(false)} disabled={saving}>
              إلغاء
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ShiftRuleVersions;
