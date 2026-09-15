import React, {
  Fragment,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Helmet } from "react-helmet";
import { Alert, Card, Col, Form, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { PageHeader } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import {
  fetchJobTitles,
  fetchUndescribedCount,
  deleteJobTitle,
} from "../../redux/actions/jobTitlesActions";

const JobTitleFormModal = lazy(() => import("./JobTitleFormModal"));

// دليل المسميات الوظيفية — ONE shared, company-wide catalogue.
//
// There is deliberately NO department column, filter or field: محاسب is a
// single row with a single job description whichever divisions employ
// accountants. "Which divisions use this title?" is answered by filtering the
// EMPLOYEES list on job_title_id, which each row links to.

const dash = <span className="text-muted">—</span>;

const SORT_OPTIONS = [
  { value: "name", label: "الاسم ↑" },
  { value: "-name", label: "الاسم ↓" },
  { value: "created_at", label: "تاريخ الإنشاء ↑" },
  { value: "-created_at", label: "تاريخ الإنشاء ↓" },
];

// Boolean filters go over the wire as 1/0 and an unknown value is a 422, so
// the control offers exactly three states and nothing free-form.
const BOOL_OPTIONS = [
  { value: "1", label: "نعم" },
  { value: "0", label: "لا" },
];

const EMPTY_FILTERS = {
  search: "",
  is_described: "",
  is_active: "",
  sort: "",
};

const JobTitles = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, meta, fetchLoading, error, undescribedCount } = useSelector(
    (state) => state.jobTitles
  );

  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  // A 409 delete carries a `message` and NO `errors` object. It is a standing
  // fact about the data, not a transient failure, so it is shown as a panel
  // that stays until dismissed rather than a toast that disappears.
  const [conflict, setConflict] = useState(null);

  const load = useCallback(() => {
    dispatch(fetchJobTitles(page, itemsPerPage, filters));
  }, [dispatch, page, itemsPerPage, filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    dispatch(fetchUndescribedCount());
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft !== filters.search) {
        setPage(1);
        setFilters((prev) => ({ ...prev, search: searchDraft }));
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  useEffect(() => {
    if (meta && meta.last_page >= 1 && page > meta.last_page) {
      setPage(meta.last_page);
    }
  }, [meta, page]);

  const appliedPerPage = meta?.per_page ?? itemsPerPage;

  const setFilter = (patch) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  // First-class preset: the worklist of titles still awaiting a job
  // description, with its own count.
  const undescribedActive = filters.is_described === "0";
  const toggleUndescribed = () =>
    setFilter({ is_described: undescribedActive ? "" : "0" });

  const columns = useMemo(
    () => [
      { key: "name", label: "المسمى الوظيفي" },
      {
        key: "default_organizational_grade",
        label: "الدرجة الافتراضية",
        render: (value) => (value == null ? dash : value),
      },
      {
        key: "default_activity_type_label",
        label: "النشاط الافتراضي",
        // Server label, never a local mapping of the int.
        render: (value) =>
          value ? (
            <span className="badge bg-primary-transparent">{value}</span>
          ) : (
            dash
          ),
      },
      {
        key: "is_described",
        label: "التوصيف",
        render: (value) =>
          value ? (
            <span className="badge bg-success-transparent">موصّف</span>
          ) : (
            <span className="badge bg-warning-transparent">بانتظار التوصيف</span>
          ),
      },
      {
        key: "is_active",
        label: "الحالة",
        render: (value) =>
          value ? (
            <span className="badge bg-success-transparent">مُفعّل</span>
          ) : (
            <span className="badge bg-danger-transparent">معطّل</span>
          ),
      },
    ],
    []
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (jobTitle) => {
    setEditing(jobTitle);
    setModalOpen(true);
  };
  const handleDelete = async (id) => {
    setConflict(null);
    const result = await dispatch(
      deleteJobTitle(id, page, items.length, itemsPerPage, filters)
    );
    if (result?.conflict) setConflict(result.conflict);
  };

  const hasAnyFilter =
    filters.search !== "" ||
    filters.is_described !== "" ||
    filters.is_active !== "" ||
    filters.sort !== "";

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | المسميات الوظيفية</title>
      </Helmet>
      <PageHeader
        homepage="المسميات الوظيفية"
        activepage="الموارد البشرية"
        page="المسميات الوظيفية"
      >
        <ProtectedElement
          element={
            <button onClick={openCreate} className="btn btn-secondary btn-wave">
              <i className="ri-add-line align-middle me-1"></i> إضافة مسمى وظيفي
            </button>
          }
          requiredPermissions={["hr.job_titles.create"]}
        />
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <Card.Body>
              {conflict && (
                <Alert
                  variant="danger"
                  dismissible
                  onClose={() => setConflict(null)}
                  className="py-2 px-3"
                >
                  {/* Rendered verbatim and NOT softened: a title held by any
                      employee or any historical posting can never be deleted,
                      and implying otherwise sends the user back to retry. */}
                  {conflict}
                </Alert>
              )}

              <Row className="g-2 mb-3 align-items-end">
                <Col sm={12} md={4} lg={3}>
                  <Form.Label htmlFor="jt-search" className="fs-12 mb-1">
                    بحث
                  </Form.Label>
                  <Form.Control
                    id="jt-search"
                    type="search"
                    placeholder="اسم المسمى"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                  />
                </Col>
                <Col sm={6} md={3} lg={2}>
                  <Form.Label htmlFor="jt-f-described" className="fs-12 mb-1">
                    موصّف
                  </Form.Label>
                  <Select
                    inputId="jt-f-described"
                    classNamePrefix="Select2"
                    options={BOOL_OPTIONS}
                    value={
                      BOOL_OPTIONS.find(
                        (o) => o.value === filters.is_described
                      ) || null
                    }
                    onChange={(opt) =>
                      setFilter({ is_described: opt ? opt.value : "" })
                    }
                    isClearable
                    placeholder="الكل"
                    menuPosition="fixed"
                  />
                </Col>
                <Col sm={6} md={3} lg={2}>
                  <Form.Label htmlFor="jt-f-active" className="fs-12 mb-1">
                    مُفعّل
                  </Form.Label>
                  <Select
                    inputId="jt-f-active"
                    classNamePrefix="Select2"
                    options={BOOL_OPTIONS}
                    value={
                      BOOL_OPTIONS.find((o) => o.value === filters.is_active) ||
                      null
                    }
                    onChange={(opt) =>
                      setFilter({ is_active: opt ? opt.value : "" })
                    }
                    isClearable
                    placeholder="الكل"
                    menuPosition="fixed"
                  />
                </Col>
                <Col sm={6} md={3} lg={2}>
                  <Form.Label htmlFor="jt-f-sort" className="fs-12 mb-1">
                    الترتيب
                  </Form.Label>
                  <Select
                    inputId="jt-f-sort"
                    classNamePrefix="Select2"
                    options={SORT_OPTIONS}
                    value={
                      SORT_OPTIONS.find((o) => o.value === filters.sort) || null
                    }
                    onChange={(opt) => setFilter({ sort: opt ? opt.value : "" })}
                    isClearable
                    placeholder="الاسم (افتراضي)"
                    menuPosition="fixed"
                  />
                </Col>
                <Col xs="auto">
                  <button
                    type="button"
                    className={`btn btn-wave ${
                      undescribedActive ? "btn-warning" : "btn-warning-light"
                    }`}
                    onClick={toggleUndescribed}
                  >
                    <i className="ri-file-list-3-line align-middle me-1"></i>
                    بانتظار التوصيف
                    {undescribedCount != null && (
                      <span className="badge bg-white text-dark ms-1">
                        {undescribedCount}
                      </span>
                    )}
                  </button>
                </Col>
                {hasAnyFilter && (
                  <Col xs="auto">
                    <button
                      type="button"
                      className="btn btn-light btn-wave"
                      onClick={() => {
                        setPage(1);
                        setSearchDraft("");
                        setFilters(EMPTY_FILTERS);
                      }}
                    >
                      <i className="ri-filter-off-line align-middle me-1"></i>
                      مسح الفلاتر
                    </button>
                  </Col>
                )}
              </Row>

              <DataTableServer
                columns={columns}
                data={items}
                loading={fetchLoading}
                error={error}
                onRetry={load}
                emptyMessage="لا توجد مسميات وظيفية مطابقة"
                currentPage={meta?.current_page || page}
                totalPages={meta?.last_page || 1}
                dataCount={meta?.total || 0}
                onPageChange={setPage}
                itemsPerPage={appliedPerPage}
                onItemsPerPageChange={setItemsPerPage}
                updatePermission="hr.job_titles.update"
                deletePermission="hr.job_titles.delete"
                functions={{
                  handleUpdate: openEdit,
                  handleDelete: handleDelete,
                }}
                renderActions={(item) => (
                  // The answer to "which units use this title?" — a filtered
                  // employees list, since the catalogue itself holds no unit.
                  <button
                    type="button"
                    title="عرض الموظفين بهذا المسمى"
                    className="btn btn-sm btn-primary-light btn-wave"
                    onClick={() =>
                      navigate(
                        `${import.meta.env.BASE_URL}hr/employees?job_title_id=${item.id}`
                      )
                    }
                  >
                    <i className="ri-team-line align-middle"></i>
                  </button>
                )}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Suspense fallback={null}>
        <JobTitleFormModal
          open={modalOpen}
          close={() => setModalOpen(false)}
          jobTitle={editing}
          page={page}
          itemsPerPage={itemsPerPage}
          filters={filters}
        />
      </Suspense>
    </Fragment>
  );
};

export default JobTitles;
