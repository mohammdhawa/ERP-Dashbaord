import React, { Fragment, useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Alert, Button, Card, Col, Form, Row, Tab, Tabs } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../components";
import StatePanel from "../../../components/StatePanel";
import api from "../../../redux/api";
import { parseApiError } from "../../../utils/apiHelpers";
import { downloadFile, saveBlob } from "../../../utils/fileDownload";
import { confirmDestructive, toastNotify } from "../../../utils";
import {
  OUTCOME_LABELS,
  SEVERITY_LABELS,
  base64ToBlob,
  executePayload,
  exclusionPayload,
  expiryLabel,
  loadFailure,
  reloadAfterFailure,
  rowCheckbox,
  sameRows,
  urlAction,
  withDeadline,
} from "./importReport";
import ImportRowsTab from "./ImportRowsTab";
import ImportChangesTab from "./ImportChangesTab";
import ImportMissingTab from "./ImportMissingTab";
import { IMPORT_COLUMN_GROUPS, IMPORT_COLUMNS } from "./importColumns";

// استيراد الموظفين — HR's one file, uploaded, dry-run, reviewed, then imported
// for real (backend EMPLOYEE_IMPORT_UPLOAD_DESIGN.md §6,
// API doc §18).
//
// THE RUN lives in the URL (`?run=`), so a reload in the middle of a review
// finds it again. A run is the uploader's alone; anyone else's reads as 404,
// and the screen then starts over.
//
// THE PASSWORDS exist in one place: the real run's response (U4). They are
// saved as a file at once and kept in this component's memory only — for a
// second download while the page stays open — never in browser storage. A
// reload loses them, and the screen says so.
//
// EXCLUSIONS (backend design §12): during review HR ticks rows to leave out
// of this import and applies them; the server re-checks the dry run without
// them. While the ticks differ from the saved list, the import button is
// disabled — what is imported is always what the last re-check showed.

const CHECKED = 1;
const EXECUTED = 2;

const Summary = ({ summary }) => (
  <Row className="g-2 mb-3">
    {Object.entries(OUTCOME_LABELS).map(([key, label]) => (
      <Col key={key} xs={6} md>
        <div className="border rounded p-2 text-center">
          <div className="fs-18 fw-semibold">{summary?.[key] ?? 0}</div>
          <div className="text-muted fs-12">{label}</div>
        </div>
      </Col>
    ))}
    <Col xs={12} md={4}>
      <div className="border rounded p-2 h-100 d-flex align-items-center justify-content-around fs-12">
        <span>
          {SEVERITY_LABELS.error}: <b>{summary?.errors ?? 0}</b>
        </span>
        <span>
          {SEVERITY_LABELS.warning}: <b>{summary?.warnings ?? 0}</b>
        </span>
        <span>
          {SEVERITY_LABELS.info}: <b>{summary?.info ?? 0}</b>
        </span>
      </div>
    </Col>
  </Row>
);

// Every column the file must hold, so HR can prepare it before uploading.
// Shown verbatim: the server matches headers exactly, so `pre` keeps the two
// spaces in «معرف / رقم  التواصل».
const RequiredColumns = () => (
  <div className="mt-4">
    <h6 className="mb-1">الأعمدة المطلوبة في الملف ({IMPORT_COLUMNS.length})</h6>
    <p className="text-muted fs-13 mb-3">
      تُقرأ ورقة «قاعدة البيانات»، وعناوين الأعمدة في السطر 3. يجب أن يحتوي
      الملف على كل هذه الأعمدة بعناوينها كما هي حرفياً، وإلا رُفض قبل قراءة أي
      سطر. الخلايا الفارغة مقبولة، وترتيب الأعمدة لا يهم، وأي عمود آخر يُتجاهل.
    </p>
    {IMPORT_COLUMN_GROUPS.map((group) => (
      <div key={group.title} className="mb-3">
        <div className="fw-semibold fs-13 mb-2">{group.title}</div>
        <div className="d-flex flex-wrap gap-2">
          {group.columns.map((column) => (
            <span
              key={column}
              className="badge bg-light text-default border fw-normal fs-12"
              style={{ whiteSpace: "pre" }}
            >
              {column}
            </span>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const ChooseFiles = ({ busy, onCheck }) => {
  const [workbook, setWorkbook] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (workbook) onCheck(workbook);
  };

  return (
    <Card className="custom-card">
      <Card.Header>
        <Card.Title>اختيار الملف</Card.Title>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={submit}>
          <Row className="g-3">
            <Col md={8}>
              <Form.Label htmlFor="import-workbook">ملف الموارد *</Form.Label>
              <Form.Control
                id="import-workbook"
                type="file"
                accept=".xlsx"
                onChange={(e) => setWorkbook(e.target.files?.[0] || null)}
              />
              <Form.Text>ملف Excel ‏(xlsx)، بحد أقصى 20 ميغابايت.</Form.Text>
            </Col>
          </Row>
          <div className="mt-3">
            <Button type="submit" disabled={!workbook || busy}>
              {busy ? "جارٍ الفحص…" : "فحص الملف"}
            </Button>
          </div>
          <RequiredColumns />
        </Form>
      </Card.Body>
    </Card>
  );
};

const EmployeeImport = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runId = searchParams.get("run");

  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(Boolean(runId));
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  // Set only by THIS page's real run: { blob, fileName } or null when it made
  // no account. `undefined` means this page never ran one (a reload).
  const [credentials, setCredentials] = useState(undefined);
  const [now, setNow] = useState(() => Date.now());
  // The rows ticked on screen; reset to the saved list whenever a run
  // arrives from the server.
  const [ticked, setTicked] = useState(() => new Set());
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    setTicked(new Set(run?.excluded_rows || []));
  }, [run]);

  const toggle = (row) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Every run from the server comes through here: its deadline is fixed on
  // this browser's clock from the server's seconds_left, and the clock the
  // screen counts with is brought up to date (it otherwise ticks every 30 s).
  const receive = useCallback((serverRun) => {
    setRun(withDeadline(serverRun));
    setNow(Date.now());
  }, []);

  const clearRun = () => {
    setRun(null);
    setCredentials(undefined);
    setLoadError(null);
  };

  const startOver = useCallback(() => {
    clearRun();
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Leaving a run whose passwords file is still in this page's memory: the
  // only way to download it again ends here, so ask first.
  const requestNewUpload = async () => {
    if (credentials) {
      const confirmed = await confirmDestructive({
        action: "بدء رفع جديد",
        text: "لن يمكن تنزيل ملف كلمات المرور مرة أخرى بعد مغادرة هذا الاستيراد. تأكد أنك حفظته.",
        confirmButtonText: "متابعة",
      });
      if (!confirmed) return;
    }
    startOver();
  };

  const loadRun = useCallback(
    async (id) => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data } = await api.get(`/hr/employee-imports/${id}`);
        receive(data.data);
      } catch (error) {
        const parsed = parseApiError(error);
        const failure = loadFailure(parsed.status);
        if (failure.startOver) {
          toastNotify(failure.message, "error");
          startOver();
        } else {
          setLoadError(parsed.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [receive, startOver]
  );

  // Keep the screen and the address in step: a run named in the address
  // that this page does not hold yet (a reload, a link) is loaded; an address
  // with no run (Back, the menu link) goes back to choosing files.
  useEffect(() => {
    const action = urlAction(runId, run);
    if (action === "load") loadRun(runId);
    if (action === "reset") clearRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const check = async (workbook) => {
    const form = new FormData();
    form.append("workbook", workbook);

    setBusy(true);
    try {
      // As the leave forms do: the instance's default JSON content type would
      // make axios flatten the FormData and drop the files; naming multipart
      // lets the browser add the boundary.
      const { data } = await api.post("/hr/employee-imports", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      receive(data.data);
      setCredentials(undefined);
      setSearchParams({ run: String(data.data.id) });
    } catch (error) {
      const parsed = parseApiError(error);
      const fieldErrors = parsed.errors ? Object.values(parsed.errors).flat() : [];
      toastNotify(fieldErrors[0] || parsed.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const applyExclusions = async () => {
    setApplying(true);
    try {
      const { data } = await api.put(
        `/hr/employee-imports/${run.id}/exclusions`,
        exclusionPayload(ticked)
      );
      receive(data.data);
      toastNotify(data.message, "success");
    } catch (error) {
      const parsed = parseApiError(error);
      toastNotify(parsed.message, "error");
      // Refused or unanswered: show the run as the server now has it.
      if (reloadAfterFailure(parsed.status)) loadRun(run.id);
    } finally {
      setApplying(false);
    }
  };

  const execute = async () => {
    const s = run.summary || {};
    const excludedNote = s.excluded
      ? ` ${s.excluded} مستبعد. لن يُستورد المستبعدون في هذه المرة؛ يُدرجون في الرفع القادم ما لم يُحذفوا من الملف.`
      : "";
    const confirmed = await confirmDestructive({
      action: "استيراد الموظفين من الملف",
      subject: run.workbook_name,
      text:
        `${s.created ?? 0} جديد، ${s.updated ?? 0} تحديث، ${s.restored ?? 0} استعادة.` +
        excludedNote +
        " ستُستبدل أي تعديلات أُجريت في النظام على هذه الحقول بقيم الملف.",
      confirmButtonText: "استيراد فعلي",
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const { data } = await api.post(
        `/hr/employee-imports/${run.id}/execute`,
        executePayload(run)
      );
      receive(data.data.run);
      if (data.data.credentials) {
        const blob = base64ToBlob(data.data.credentials.content_base64);
        const fileName = data.data.credentials.file_name;
        saveBlob(blob, fileName);
        setCredentials({ blob, fileName });
      } else {
        setCredentials(null);
      }
      toastNotify(data.message, "success");
    } catch (error) {
      const parsed = parseApiError(error);
      toastNotify(parsed.message, "error");
      // Refused or unanswered: show the run as the server now has it.
      if (reloadAfterFailure(parsed.status)) loadRun(run.id);
    } finally {
      setBusy(false);
    }
  };

  const downloadReport = async () => {
    try {
      await downloadFile(
        `/hr/employee-imports/${run.id}/report`,
        `تقرير-استيراد-الموظفين-${run.id}.xlsx`
      );
    } catch (error) {
      toastNotify(parseApiError(error).message, "error");
    }
  };

  const expiry = run ? expiryLabel(run.deadline, now) : null;
  const report = run?.report;
  const selectable = run?.status === CHECKED && Boolean(expiry);
  const pending = selectable && !sameRows(ticked, run.excluded_rows);

  return (
    <Fragment>
      <Helmet>
        <title>استيراد الموظفين</title>
      </Helmet>
      <PageHeader homepage="استيراد الموظفين" activepage="الموارد البشرية">
        {run && (
          <Button variant="light" onClick={requestNewUpload} disabled={busy}>
            رفع ملف جديد
          </Button>
        )}
      </PageHeader>

      <StatePanel loading={loading} error={loadError} onRetry={() => loadRun(runId)}>
        {!run ? (
          <ChooseFiles busy={busy} onCheck={check} />
        ) : (
          <>
            <Card className="custom-card">
              <Card.Header className="justify-content-between">
                {/* The theme capitalises card titles; a file name is shown
                    exactly as HR named it (".xlsx", not ".Xlsx"). */}
                <Card.Title style={{ textTransform: "none" }}>
                  <bdi>{run.workbook_name}</bdi>
                </Card.Title>
                <span className="badge bg-primary-transparent">
                  {/* Past its hour but not yet swept by the hourly command:
                      the server still says "checked", the screen says what is
                      true for HR. */}
                  {run.status === CHECKED && !expiry ? "منتهي الصلاحية" : run.status_label}
                </span>
              </Card.Header>
              <Card.Body>
                <Summary summary={run.summary} />

                {run.status === CHECKED && expiry && (
                  <Alert variant="info" className="d-flex flex-wrap align-items-center gap-2">
                    <span className="me-auto">
                      هذه نتيجة تجربة لم يُحفظ منها شيء. {expiry}.
                    </span>
                    <Button variant="outline-primary" onClick={downloadReport} disabled={busy}>
                      تنزيل التقرير
                    </Button>
                    <Button
                      variant="danger"
                      onClick={execute}
                      disabled={busy || applying || pending}
                      title={pending ? "طبّق الاستبعاد أو تراجع عنه قبل الاستيراد." : undefined}
                    >
                      {busy ? "جارٍ الاستيراد…" : "استيراد فعلي"}
                    </Button>
                  </Alert>
                )}

                {run.status !== EXECUTED && !expiry && (
                  <Alert variant="warning" className="d-flex flex-wrap align-items-center gap-2">
                    <span className="me-auto">
                      انتهت صلاحية هذا الفحص، ارفع الملف مرة أخرى.
                    </span>
                    <Button variant="primary" onClick={startOver}>
                      رفع ملف جديد
                    </Button>
                  </Alert>
                )}

                {run.status === EXECUTED && credentials && (
                  <Alert variant="success" className="d-flex flex-wrap align-items-center gap-2">
                    <span className="me-auto">
                      لا تُحفظ كلمات المرور في أي مكان: سلّم الملف للموارد البشرية
                      ثم احذفه. كلمة المرور المفقودة تُعاد لكل موظف على حدة.
                    </span>
                    <Button
                      variant="outline-success"
                      onClick={() => saveBlob(credentials.blob, credentials.fileName)}
                    >
                      تنزيل كلمات المرور مرة أخرى
                    </Button>
                  </Alert>
                )}
                {run.status === EXECUTED && credentials === null && (
                  <Alert variant="success">لم يُنشأ أي حساب جديد.</Alert>
                )}
                {run.status === EXECUTED && credentials === undefined && (
                  <Alert variant="secondary">
                    انتهى الاستيراد. لم تعد كلمات المرور متاحة؛ أعِد تعيينها لكل
                    موظف عند الحاجة.
                  </Alert>
                )}
                {run.status === EXECUTED && report && (
                  <div className="mb-3">
                    <Button variant="outline-primary" onClick={downloadReport}>
                      تنزيل التقرير
                    </Button>
                  </div>
                )}

                {report ? (
                  <>
                    {selectable && (
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                        <Button
                          variant="secondary"
                          onClick={applyExclusions}
                          disabled={!pending || applying || busy}
                        >
                          {applying ? "جارٍ إعادة الفحص…" : `تطبيق الاستبعاد (${ticked.size})`}
                        </Button>
                        {pending && !applying && (
                          <>
                            <span className="text-warning fs-13">لم يُطبَّق الاستبعاد بعد</span>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => setTicked(new Set(run.excluded_rows || []))}
                            >
                              تراجع
                            </Button>
                          </>
                        )}
                        <span className="text-muted fs-12 ms-auto">
                          حدّد في «السطور» من لا يُستورد في هذه المرة، ثم طبّق.
                        </span>
                      </div>
                    )}
                    <Tabs defaultActiveKey="rows" className="mb-3" mountOnEnter>
                      <Tab eventKey="rows" title={`السطور (${report.rows.length})`}>
                        <ImportRowsTab
                          rows={report.rows}
                          selectable={selectable}
                          ticked={ticked}
                          onToggle={toggle}
                          checkboxFor={(row) =>
                            rowCheckbox(run, row, { now, applying: applying || busy })
                          }
                        />
                      </Tab>
                      <Tab eventKey="changes" title={`التغييرات (${report.changes.length})`}>
                        <ImportChangesTab changes={report.changes} />
                      </Tab>
                      <Tab
                        eventKey="missing"
                        title={`غير موجودين في الملف (${report.not_in_file.length})`}
                      >
                        <ImportMissingTab people={report.not_in_file} />
                      </Tab>
                    </Tabs>
                  </>
                ) : (
                  <p className="text-muted mb-0">
                    حُذف تفصيل التقرير بعد انتهاء صلاحيته؛ بقيت الأعداد أعلاه.
                  </p>
                )}
              </Card.Body>
            </Card>
          </>
        )}
      </StatePanel>
    </Fragment>
  );
};

export default EmployeeImport;
