import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Alert, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import { useSelector } from "react-redux";
import { PageHeader } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import api from "../../redux/api";
import { parseApiError } from "../../utils/apiHelpers";
import { confirmDestructive, toastNotify } from "../../utils";
import WorkSiteFormModal from "./WorkSiteFormModal";
import {
  buildAssignmentPayload,
  canManageSites,
  formatEffectiveTime,
  siteErrorMessage,
  validateAssignmentForm,
} from "./workSiteForm";

const PER_PAGE = 15;
const dash = <span className="text-muted">—</span>;

const WorkSites = () => {
  const { permissions } = useSelector((state) => state.auth);
  const canManage = canManageSites(permissions);
  const siteRequest = useRef(0);
  const assignmentRequest = useRef(0);

  const [sites, setSites] = useState([]);
  const [siteMeta, setSiteMeta] = useState({ total: 0, last_page: 1 });
  const [sitePage, setSitePage] = useState(1);
  const [siteLoading, setSiteLoading] = useState(true);
  const [siteError, setSiteError] = useState("");
  const [actionError, setActionError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [historySite, setHistorySite] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [assignmentMeta, setAssignmentMeta] = useState({ total: 0, last_page: 1 });
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState({ employee_id: "", work_site_id: "" });
  const [activeFilter, setActiveFilter] = useState({});
  const [assignmentForm, setAssignmentForm] = useState({ employee_id: "", work_site_id: "", effective_from: "" });
  const [assignmentErrors, setAssignmentErrors] = useState({});
  const [assigning, setAssigning] = useState(false);
  const [ending, setEnding] = useState(null);
  const [endTime, setEndTime] = useState("");
  const [endError, setEndError] = useState("");
  const [endingBusy, setEndingBusy] = useState(false);

  const loadSites = useCallback(async () => {
    const mine = ++siteRequest.current;
    setSiteLoading(true);
    setSiteError("");
    try {
      const response = await api.get("/attendance/work-sites", {
        params: { page: sitePage, per_page: PER_PAGE },
      });
      if (mine !== siteRequest.current) return;
      setSites(response.data.data || []);
      setSiteMeta(response.data.meta || { total: 0, last_page: 1 });
    } catch (error) {
      if (mine === siteRequest.current) setSiteError(parseApiError(error).message);
    } finally {
      if (mine === siteRequest.current) setSiteLoading(false);
    }
  }, [sitePage]);

  const loadAssignments = useCallback(async () => {
    const mine = ++assignmentRequest.current;
    setAssignmentLoading(true);
    setAssignmentError("");
    try {
      const response = await api.get("/attendance/work-site-assignments", {
        params: { page: assignmentPage, per_page: PER_PAGE, ...activeFilter },
      });
      if (mine !== assignmentRequest.current) return;
      setAssignments(response.data.data || []);
      setAssignmentMeta(response.data.meta || { total: 0, last_page: 1 });
    } catch (error) {
      if (mine === assignmentRequest.current) setAssignmentError(parseApiError(error).message);
    } finally {
      if (mine === assignmentRequest.current) setAssignmentLoading(false);
    }
  }, [assignmentPage, activeFilter]);

  useEffect(() => { loadSites(); }, [loadSites]);
  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const archive = async (site) => {
    if (!canManage) return;
    const confirmed = await confirmDestructive({
      action: "أرشفة موقع العمل",
      subject: site.name,
      text: "لن يُحذف تاريخ الموقع. يجب إنهاء التعيينات الحالية والمستقبلية أولاً.",
    });
    if (!confirmed) return;
    setActionError("");
    try {
      const response = await api.patch(`/attendance/work-sites/${site.id}/archive`);
      toastNotify(response.data.message, "success");
      loadSites();
    } catch (error) {
      setActionError(siteErrorMessage(error));
    }
  };

  const assign = async (event) => {
    event.preventDefault();
    if (!canManage || assigning) return;
    const errors = validateAssignmentForm(assignmentForm);
    if (Object.keys(errors).length) {
      setAssignmentErrors(errors);
      return;
    }
    setAssigning(true);
    setAssignmentErrors({});
    try {
      const response = await api.post("/attendance/work-site-assignments", buildAssignmentPayload(assignmentForm));
      toastNotify(response.data.message, "success");
      setAssignmentForm({ employee_id: "", work_site_id: "", effective_from: "" });
      setAssignmentPage(1);
      loadAssignments();
    } catch (error) {
      setAssignmentErrors({ _general: siteErrorMessage(error) });
    } finally {
      setAssigning(false);
    }
  };

  const endAssignment = async (event) => {
    event.preventDefault();
    if (!ending || endingBusy) return;
    const at = new Date(endTime);
    if (!Number.isFinite(at.getTime()) || at < new Date() || at <= new Date(ending.effective_from)) {
      setEndError("حدد وقت انتهاء بعد بداية التعيين، الآن أو في المستقبل.");
      return;
    }
    setEndingBusy(true);
    setEndError("");
    try {
      const response = await api.patch(`/attendance/work-site-assignments/${ending.id}`, {
        effective_to: at.toISOString(),
      });
      toastNotify(response.data.message, "success");
      setEnding(null);
      setEndTime("");
      loadAssignments();
    } catch (error) {
      setEndError(siteErrorMessage(error));
    } finally {
      setEndingBusy(false);
    }
  };

  const siteColumns = useMemo(() => [
    { key: "id", label: "الرقم" },
    { key: "name", label: "الموقع" },
    { key: "is_active", label: "الحالة", render: (active) => (
      <span className={`badge ${active ? "bg-success-transparent" : "bg-secondary-transparent"}`}>
        {active ? "فعّال" : "مؤرشف"}
      </span>
    ) },
    { key: "versions", label: "آخر حدود مسجلة", render: (versions) => {
      const version = versions?.at(-1);
      return version ? <span dir="ltr">{version.latitude}, {version.longitude} · {version.radius_m} m</span> : dash;
    } },
    { key: "versions", label: "سريان آخر نسخة", render: (versions) => formatEffectiveTime(versions?.at(-1)?.effective_from) },
  ], []);

  const assignmentColumns = useMemo(() => [
    { key: "employee_name", label: "الموظف", render: (name, row) => name ? `${name} (#${row.employee_id})` : `#${row.employee_id}` },
    { key: "site_name", label: "موقع العمل", render: (name, row) => name || `#${row.work_site_id}` },
    { key: "effective_from", label: "من", render: formatEffectiveTime },
    { key: "effective_to", label: "حتى", render: formatEffectiveTime },
  ], []);

  return (
    <Fragment>
      <Helmet><title>الراقي ERP | مواقع العمل</title></Helmet>
      <PageHeader homepage="مواقع العمل" activepage="الحضور والانصراف" page="مواقع العمل">
        {canManage && (
          <button type="button" className="btn btn-secondary btn-wave" onClick={() => { setEditingSite(null); setModalOpen(true); }}>
            <i className="ri-add-line align-middle me-1" /> إضافة موقع عمل
          </button>
        )}
      </PageHeader>

      <Row className="g-3">
        <Col xs={12}>
          <Card className="custom-card"><Card.Body>
            {actionError && <Alert variant="danger" onClose={() => setActionError("")} dismissible>{actionError}</Alert>}
            <DataTableServer
              columns={siteColumns} data={sites} loading={siteLoading} error={siteError} onRetry={loadSites}
              currentPage={sitePage} totalPages={siteMeta.last_page || 1} dataCount={siteMeta.total || 0}
              itemsPerPage={PER_PAGE} onPageChange={setSitePage} showPageSizeSelector={false}
              showActions
              renderActions={(site) => (
                <>
                  <button type="button" className="btn btn-sm btn-info-light" onClick={() => setHistorySite(site)} aria-label={`عرض نسخ ${site.name}`}>
                    النسخ
                  </button>
                  {canManage && site.is_active && (
                    <>
                      <button type="button" className="btn btn-sm btn-success-light" onClick={() => { setEditingSite(site); setModalOpen(true); }} aria-label={`تعديل ${site.name}`}>تعديل</button>
                      <button type="button" className="btn btn-sm btn-danger-light" onClick={() => archive(site)} aria-label={`أرشفة ${site.name}`}>أرشفة</button>
                      <button type="button" className="btn btn-sm btn-primary-light" onClick={() => setAssignmentForm((value) => ({ ...value, work_site_id: String(site.id) }))} aria-label={`تعيين موظف إلى ${site.name}`}>تعيين</button>
                    </>
                  )}
                </>
              )}
              emptyMessage="لا توجد مواقع عمل"
            />
          </Card.Body></Card>
        </Col>

        {historySite && (
          <Col xs={12}>
            <Card className="custom-card"><Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">نسخ حدود {historySite.name}</h5>
                <button type="button" className="btn btn-sm btn-light" onClick={() => setHistorySite(null)}>إغلاق</button>
              </div>
              <div className="table-responsive"><table className="table table-striped">
                <thead><tr><th>الاسم</th><th>الإحداثيات</th><th>نصف القطر</th><th>من</th><th>حتى</th></tr></thead>
                <tbody>{historySite.versions?.map((version) => (
                  <tr key={version.id}>
                    <td>{version.name}</td>
                    <td dir="ltr">{version.latitude}, {version.longitude}</td>
                    <td>{version.radius_m} م</td>
                    <td>{formatEffectiveTime(version.effective_from)}</td>
                    <td>{formatEffectiveTime(version.effective_to)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            </Card.Body></Card>
          </Col>
        )}

        {canManage && (
          <Col xs={12}>
            <Card className="custom-card"><Card.Body>
              <h5>تعيين موظف لموقع عمل</h5>
              <p className="text-muted small">تعيين واحد لكل موظف. استخدم رقم الموظف الداخلي ورقم الموقع من الجدول؛ لا تُستخدم قيمة مكان العمل النصية.</p>
              {assignmentErrors._general && <Alert variant="danger">{assignmentErrors._general}</Alert>}
              <Form onSubmit={assign} noValidate><Row className="g-3 align-items-end">
                {[
                  ["employee_id", "رقم الموظف الداخلي"],
                  ["work_site_id", "رقم موقع العمل"],
                ].map(([key, label]) => (
                  <Col xs={12} md={3} key={key}><Form.Group controlId={`assign-${key}`}>
                    <Form.Label>{label}</Form.Label>
                    <Form.Control type="number" min="1" value={assignmentForm[key]} isInvalid={Boolean(assignmentErrors[key])}
                      onChange={(event) => setAssignmentForm((value) => ({ ...value, [key]: event.target.value }))} />
                    <Form.Control.Feedback type="invalid">{assignmentErrors[key]}</Form.Control.Feedback>
                  </Form.Group></Col>
                ))}
                <Col xs={12} md={4}><Form.Group controlId="assign-effective-from">
                  <Form.Label>سريان التعيين (اختياري؛ الآن افتراضياً)</Form.Label>
                  <Form.Control type="datetime-local" value={assignmentForm.effective_from} isInvalid={Boolean(assignmentErrors.effective_from)}
                    onChange={(event) => setAssignmentForm((value) => ({ ...value, effective_from: event.target.value }))} />
                  <Form.Control.Feedback type="invalid">{assignmentErrors.effective_from}</Form.Control.Feedback>
                </Form.Group></Col>
                <Col xs={12} md={2}><button type="submit" className="btn btn-primary w-100" disabled={assigning}>
                  {assigning && <Spinner size="sm" className="me-1" />} تعيين
                </button></Col>
              </Row></Form>
            </Card.Body></Card>
          </Col>
        )}

        <Col xs={12}>
          <Card className="custom-card"><Card.Body>
            <h5>تعيينات مواقع العمل</h5>
            <Form onSubmit={(event) => { event.preventDefault(); setAssignmentPage(1); setActiveFilter(Object.fromEntries(Object.entries(assignmentFilter).filter(([, value]) => value !== ""))); }}>
              <Row className="g-2 align-items-end mb-3">
                <Col xs={12} md={4}><Form.Group controlId="filter-employee"><Form.Label>رقم الموظف</Form.Label>
                  <Form.Control type="number" min="1" value={assignmentFilter.employee_id}
                    onChange={(event) => setAssignmentFilter((value) => ({ ...value, employee_id: event.target.value }))} />
                </Form.Group></Col>
                <Col xs={12} md={4}><Form.Group controlId="filter-site"><Form.Label>رقم الموقع</Form.Label>
                  <Form.Control type="number" min="1" value={assignmentFilter.work_site_id}
                    onChange={(event) => setAssignmentFilter((value) => ({ ...value, work_site_id: event.target.value }))} />
                </Form.Group></Col>
                <Col xs={12} md={4}><button type="submit" className="btn btn-primary">بحث</button></Col>
              </Row>
            </Form>
            <DataTableServer
              columns={assignmentColumns} data={assignments} loading={assignmentLoading} error={assignmentError} onRetry={loadAssignments}
              currentPage={assignmentPage} totalPages={assignmentMeta.last_page || 1} dataCount={assignmentMeta.total || 0}
              itemsPerPage={PER_PAGE} onPageChange={setAssignmentPage} showPageSizeSelector={false}
              showActions={canManage}
              renderActions={(assignment) => canManage && !assignment.effective_to && (
                <button type="button" className="btn btn-sm btn-warning-light" onClick={() => { setEnding(assignment); setEndTime(""); setEndError(""); }}>
                  إنهاء التعيين
                </button>
              )}
              emptyMessage="لا توجد تعيينات"
            />
            {canManage && ending && (
              <Form onSubmit={endAssignment} className="border rounded p-3 mt-3">
                <h6>إنهاء تعيين {ending.employee_name || `#${ending.employee_id}`} في {ending.site_name || `#${ending.work_site_id}`}</h6>
                <Row className="g-2 align-items-end"><Col xs={12} md={6}>
                  <Form.Group controlId="assignment-end-time"><Form.Label>وقت انتهاء التعيين</Form.Label>
                    <Form.Control type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} isInvalid={Boolean(endError)} />
                    <Form.Control.Feedback type="invalid">{endError}</Form.Control.Feedback>
                  </Form.Group>
                </Col><Col xs={12} md={6} className="d-flex gap-2">
                  <button type="submit" className="btn btn-warning" disabled={endingBusy}>إنهاء</button>
                  <button type="button" className="btn btn-light" onClick={() => setEnding(null)} disabled={endingBusy}>إلغاء</button>
                </Col></Row>
              </Form>
            )}
          </Card.Body></Card>
        </Col>
      </Row>

      <WorkSiteFormModal
        show={modalOpen} site={editingSite} onHide={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); loadSites(); }}
      />
    </Fragment>
  );
};

export default WorkSites;
