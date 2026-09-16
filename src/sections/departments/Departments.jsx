import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  Suspense,
  lazy,
} from "react";
import { Helmet } from "react-helmet-async";
import { Card, Col, Row, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { PageHeader, ModalFallback } from "../../components";
import DataTableServer from "../../components/DataTableServer";
import DepartmentTree from "./DepartmentTree";
import ProtectedElement from "../../pages/layout/ProtectedElement";
import { hasPermission } from "../../data/permissionsCatalog";
import {
  fetchDepartments,
  fetchAllDepartments,
  deleteDepartment,
} from "../../redux/actions/departmentsActions";

const DepartmentFormModal = lazy(() => import("./DepartmentFormModal"));

const dash = <span className="text-muted">—</span>;

// Turns the flat collection into the shape it actually has: a tree.
//
// Returns nested nodes (`children` on each) rather than a flattened, indented
// list, because the view is a real disclosure tree now — collapsing a division
// has to hide its whole subtree, and that is a structural operation, not a
// filter over rows.
//
// Children are ordered by `code`, which encodes the path through the tree
// (FIN → FIN-CASH → FIN-CASH-VAULT), falling back to `name`. Each node also
// carries `descendantCount`, so a collapsed branch can say how much is inside
// it — the direct-child count would under-report a division by an order of
// magnitude.
//
// Units whose parent is not in the set (a page that failed mid-walk, a parent
// the reader lacks permission to see) come back separately as `orphans` rather
// than being dropped or silently reparented onto the root: a unit missing from
// an org chart is worse than one the chart admits it cannot place.
const buildForest = (items) => {
  const byParent = new Map();
  const ids = new Set(items.map((d) => d.id));
  const placed = (d) => d.parent_id != null && ids.has(d.parent_id);

  items.forEach((d) => {
    const key = placed(d) ? d.parent_id : null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(d);
  });
  byParent.forEach((list) =>
    list.sort((a, b) =>
      String(a.code || a.name || "").localeCompare(
        String(b.code || b.name || ""),
        "ar"
      )
    )
  );

  const visited = new Set();
  const build = (node) => {
    // Guard against a cycle: the API forbids one, but a client that recurses on
    // faith hangs the tab instead of showing the problem.
    visited.add(node.id);
    const children = (byParent.get(node.id) || [])
      .filter((c) => !visited.has(c.id))
      .map(build);
    return {
      ...node,
      children,
      descendantCount: children.reduce(
        (sum, c) => sum + 1 + c.descendantCount,
        0
      ),
    };
  };

  // Only true roots (parent_id === null) start the forest; a unit whose parent
  // merely happens to be absent is an orphan, not a root.
  const unparented = byParent.get(null) || [];
  const roots = unparented.filter((d) => d.parent_id == null).map(build);
  const orphans = unparented
    .filter((d) => d.parent_id != null && !visited.has(d.id))
    .map(build);

  // FINAL SWEEP. A cycle (A→B→A) leaves both units out of `unparented`
  // entirely — each has a parent that exists — so neither branch above would
  // ever reach them and they would simply be absent from the chart with nothing
  // saying so. The API forbids cycles; this is here because "the server
  // promised" is not a reason to lose a row silently.
  items.forEach((d) => {
    if (!visited.has(d.id)) orphans.push(build(d));
  });

  return { roots, orphans };
};

// Every id in a forest, for توسيع الكل.
const collectIds = (nodes, into = new Set()) => {
  nodes.forEach((n) => {
    into.add(n.id);
    collectIds(n.children || [], into);
  });
  return into;
};

// Coerced before lowercasing — a field that arrives as a number rather than the
// documented string would otherwise throw inside a render.
const hit = (value, q) =>
  value != null && String(value).toLowerCase().includes(q);

const matchesQuery = (d, q) =>
  hit(d.name, q) ||
  hit(d.code, q) ||
  hit(d.level_label, q) ||
  hit(d.sector_label, q);

// The manager comes EMBEDDED on the resource now — `manager: { id, full_name,
// employee_number }` beside the untouched `manager_id`. This page used to walk
// every employee page to resolve that name itself; that interim lookup is gone.
//
// THE THREE STATES ARE NOT TWO. `manager_id` and `manager` disagree in one real
// case, and it is the case worth getting right:
//
//   manager_id null            → no manager assigned. A dash.
//   manager_id + manager       → the person. Named, and linked when the reader
//                                may open employee profiles at all.
//   manager_id + manager null  → a manager IS recorded, but that employee has
//                                been soft-deleted. Collapsing this into a dash
//                                would state the unit has no manager, which is
//                                false; printing the bare id would imply the
//                                name merely failed to load. So it says both:
//                                the id that is still on the record, and that
//                                the person behind it is gone.
// Columns for the LIST view only. The hierarchy view is no longer a table with
// indented rows — see DepartmentTree — so nothing here has to carry depth.
const buildColumns = ({ canOpenEmployee, parentOf }) => [
  {
    key: "code",
    label: "الرمز",
    nowrap: true,
    render: (value) =>
      value ? (
        <span className="fw-semibold" dir="ltr">
          {value}
        </span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  { key: "name", label: "اسم الوحدة" },
  {
    // THE COLUMN THE LIST WAS MISSING. `parent_id` is on every unit, but the
    // resource embeds no `parent` object and the parent is normally on a
    // different page — so the one fact that makes an org chart an org chart was
    // the one fact the table could not show. Resolved from the full tree.
    //
    // Three states, like the manager column below: no parent (the root),
    // a resolved parent, and a `parent_id` pointing at something not in the
    // set — which must not read as "this is the root".
    key: "parent_id",
    label: "الوحدة الأعلى",
    render: (value) => {
      if (value == null) {
        return <span className="badge bg-primary-transparent">الجذر</span>;
      }
      const parent = parentOf(value);
      if (!parent) {
        return (
          <span
            className="badge bg-secondary-transparent"
            title="الوحدة الأعلى غير متاحة في القائمة المحمّلة"
          >
            وحدة #{value}
          </span>
        );
      }
      return <span title={parent.code || undefined}>{parent.name}</span>;
    },
  },
  {
    key: "level_label",
    label: "المستوى",
    // Server-resolved Arabic tier label — never mapped from `level` locally.
    render: (value) =>
      value ? (
        <span className="badge bg-primary-transparent">{value}</span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "sector_label",
    label: "الجهة",
    render: (value) =>
      value ? (
        <span className="badge bg-secondary-transparent">{value}</span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "is_active",
    label: "الحالة",
    render: (value) =>
      value ? (
        <span className="badge bg-success-transparent">مُفعّلة</span>
      ) : (
        <span className="badge bg-danger-transparent">معطّلة</span>
      ),
  },
  {
    key: "manager",
    label: "المدير",
    render: (manager, item) => {
      if (!item.manager_id) return dash;

      // Soft-deleted employee: the foreign key survives, the person does not.
      if (!manager) {
        return (
          <span
            className="badge bg-secondary-transparent"
            title="الموظف المسجَّل كمدير لم يعد متاحاً (سجل محذوف)"
          >
            موظف #{item.manager_id} — سجل غير متاح
          </span>
        );
      }

      // The staff number lives in the tooltip rather than the cell: two people
      // can share الاسم الثلاثي, but a table column is the wrong place to spend
      // that width on every row.
      const badge = (
        <span title={manager.employee_number || undefined}>
          {manager.full_name}
        </span>
      );

      // Linked only when the reader can actually open a profile — otherwise the
      // link is a trip to /no_access. stopPropagation so following the manager
      // does not also fire the row's own click.
      return canOpenEmployee ? (
        <Link
          to={`${import.meta.env.BASE_URL}hr/employees/${manager.id}`}
          className="badge bg-info-transparent text-decoration-none"
          onClick={(e) => e.stopPropagation()}
        >
          {badge}
        </Link>
      ) : (
        <span className="badge bg-info-transparent">{badge}</span>
      );
    },
  },
  {
    key: "created_at",
    label: "تاريخ الإنشاء",
    nowrap: true,
    render: (value) => (value ? moment(value).format("YYYY-MM-DD") : "—"),
  },
];

const Departments = () => {
  const dispatch = useDispatch();
  const { items, meta, fetchLoading, error, allItems, allLoading, allError, allLoaded } =
    useSelector((state) => state.departments);
  const { permissions } = useSelector((state) => state.auth);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  // "list" is the server-paged table; "tree" draws the whole structure in
  // parent order. The default stays the paged list — it is the cheaper request
  // and the one the rest of the app's tables behave like — but the tree is one
  // click away, because a flat page of fifteen rows cannot show an org chart.
  const [view, setView] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  // Ids whose CHILDREN are visible. Held here rather than inside the tree so
  // توسيع الكل / طي الكل and the search's auto-reveal can drive it, and so the
  // open branches survive a re-render after an edit.
  const [expanded, setExpanded] = useState(() => new Set());
  // Set once the first forest arrives, so the "open the root" default does not
  // fight the user by re-applying itself on every subsequent load.
  const [defaultApplied, setDefaultApplied] = useState(false);

  const query = searchQuery.trim().toLowerCase();
  const isSearching = query !== "";

  // Server-side pagination: every page change is a fresh `?page=N` request.
  const load = useCallback(() => {
    dispatch(fetchDepartments(page));
  }, [dispatch, page]);

  useEffect(() => {
    load();
  }, [load]);

  // The full set is needed in BOTH views: the tree is built from it, and so is
  // the list's parent column (the resource carries `parent_id` but no embedded
  // `parent`, and the parent is normally on another page).
  useEffect(() => {
    if (!allLoaded && !allLoading) {
      dispatch(fetchAllDepartments());
    }
  }, [dispatch, allLoaded, allLoading]);

  // If a deletion (here or elsewhere) shrinks the tree so the current page no
  // longer exists, snap back to the nearest valid page from server metadata.
  useEffect(() => {
    if (meta && meta.last_page >= 1 && page > meta.last_page) {
      setPage(meta.last_page);
    }
  }, [meta, page]);

  // Gates the manager LINK only, not the name: the name ships with the
  // department resource, but the profile route behind the link needs its own
  // permission.
  const canOpenEmployee = hasPermission(permissions, "hr.employees.view");

  const byId = useMemo(() => {
    const map = new Map();
    allItems.forEach((d) => map.set(d.id, d));
    return map;
  }, [allItems]);
  const parentOf = useCallback((id) => byId.get(id) || null, [byId]);

  // A search keeps every ANCESTOR of a match, so a hit three tiers down stays
  // in its place in the structure instead of becoming a context-free row. The
  // surviving set is then rebuilt into a forest, so what you get is a pruned
  // org chart rather than a filtered list.
  const visibleItems = useMemo(() => {
    if (!isSearching) return allItems;
    const keep = new Set();
    allItems.forEach((d) => {
      if (!matchesQuery(d, query)) return;
      keep.add(d.id);
      let cursor = d.parent_id;
      while (cursor != null && !keep.has(cursor)) {
        keep.add(cursor);
        cursor = byId.get(cursor)?.parent_id ?? null;
      }
    });
    return allItems.filter((d) => keep.has(d.id));
  }, [allItems, isSearching, query, byId]);

  const { roots, orphans } = useMemo(
    () => buildForest(visibleItems),
    [visibleItems]
  );

  // A search is useless if its hits are behind a collapsed branch, so every
  // surviving node is opened. Keyed on the query so typing re-reveals, and on
  // `allLoaded` so a search typed before the walk finished opens once it does.
  useEffect(() => {
    if (!isSearching) return;
    setExpanded(collectIds([...roots, ...orphans]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isSearching, allLoaded]);

  // DEFAULT STATE: the root open, everything under it closed. That is one
  // screen showing the company's divisions — the overview you actually want
  // first — instead of every office in the company at once.
  useEffect(() => {
    if (defaultApplied || isSearching || roots.length === 0) return;
    setExpanded(new Set(roots.map((r) => r.id)));
    setDefaultApplied(true);
  }, [roots, defaultApplied, isSearching]);

  const toggleNode = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(
    () => setExpanded(collectIds([...roots, ...orphans])),
    [roots, orphans]
  );
  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  // A search always shows the structure, so it implies the tree view.
  const showingTree = isSearching || view === "tree";

  const columns = useMemo(
    () => buildColumns({ canOpenEmployee, parentOf }),
    [canOpenEmployee, parentOf]
  );

  const openCreate = () => {
    setEditingDepartment(null);
    setModalOpen(true);
  };
  const openEdit = (department) => {
    setEditingDepartment(department);
    setModalOpen(true);
  };
  const handleDelete = (id, department) => {
    dispatch(deleteDepartment(id, page, items.length, department?.name));
  };

  return (
    <Fragment>
      <Helmet>
        <title>الراقي ERP | الوحدات التنظيمية</title>
      </Helmet>
      <PageHeader
        homepage="الوحدات التنظيمية"
        activepage="المؤسسة"
        page="الوحدات التنظيمية"
      >
        <ProtectedElement
          element={
            <button onClick={openCreate} className="btn btn-secondary btn-wave">
              <i className="ri-add-line align-middle me-1"></i> إضافة وحدة تنظيمية
            </button>
          }
          requiredPermissions={["departments.create"]}
        />
      </PageHeader>

      <Row>
        <Col xl={12}>
          <Card className="custom-card">
            <div className="p-3 pb-0">
              <Row className="g-3 align-items-end">
                <Col md={6} lg={4}>
                  <label
                    htmlFor="departments-search"
                    className="form-label fs-12 mb-1"
                  >
                    بحث
                  </label>
                  <input
                    id="departments-search"
                    className="form-control"
                    type="search"
                    placeholder="ابحث بالاسم أو الرمز أو المستوى.."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-describedby="departments-search-status"
                  />
                </Col>
                <Col md={6} lg={4}>
                  {/* A radio GROUP, not two buttons: the two are mutually
                      exclusive states of one setting, and that is what a screen
                      reader should hear. Disabled while searching, because a
                      search always shows the structure — hiding a match's
                      ancestors would defeat the point of finding it. */}
                  <div
                    className="btn-group w-100"
                    role="group"
                    aria-label="طريقة العرض"
                  >
                    <input
                      type="radio"
                      className="btn-check"
                      name="departments-view"
                      id="departments-view-list"
                      autoComplete="off"
                      checked={view === "list" && !isSearching}
                      disabled={isSearching}
                      onChange={() => setView("list")}
                    />
                    <label
                      className="btn btn-light btn-sm"
                      htmlFor="departments-view-list"
                    >
                      <i
                        className="ri-list-unordered align-middle me-1"
                        aria-hidden="true"
                      ></i>
                      قائمة
                    </label>
                    <input
                      type="radio"
                      className="btn-check"
                      name="departments-view"
                      id="departments-view-tree"
                      autoComplete="off"
                      checked={showingTree}
                      disabled={isSearching}
                      onChange={() => setView("tree")}
                    />
                    <label
                      className="btn btn-light btn-sm"
                      htmlFor="departments-view-tree"
                    >
                      <i
                        className="ri-node-tree align-middle me-1"
                        aria-hidden="true"
                      ></i>
                      الهيكل
                    </label>
                  </div>
                </Col>
              </Row>
              <div
                id="departments-search-status"
                className="small mt-2"
                aria-live="polite"
              >
                {allLoading ? (
                  <span className="text-muted">
                    <Spinner
                      animation="border"
                      size="sm"
                      className="align-middle ms-1"
                      aria-hidden="true"
                    />
                    جارٍ تحميل الهيكل التنظيمي…
                  </span>
                ) : allError ? (
                  <span className="text-danger">
                    تعذّر تحميل الهيكل الكامل: {allError}{" "}
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 align-baseline"
                      onClick={() => dispatch(fetchAllDepartments())}
                    >
                      إعادة المحاولة
                    </button>
                  </span>
                ) : isSearching ? (
                  <span className="text-muted">
                    {visibleItems.length} وحدة معروضة (المطابقة مع الوحدات
                    الأعلى التابعة لها) من أصل {allItems.length}.
                  </span>
                ) : showingTree ? (
                  <span className="text-muted">
                    الهيكل الكامل: {allItems.length} وحدة على {" "}
                    {new Set(allItems.map((d) => d.level).filter(Boolean)).size}{" "}
                    مستويات.
                  </span>
                ) : null}
              </div>
            </div>
            <Card.Body>
              {/* TWO DIFFERENT COMPONENTS, not one table in two modes. The
                  hierarchy is not a table — its rows nest, collapse, and have
                  no column grid — and forcing it through DataTableServer is
                  exactly what made the first version unreadable. The list view
                  keeps the table it should have. */}
              {showingTree ? (
                <DepartmentTree
                  roots={roots}
                  orphans={orphans}
                  expanded={expanded}
                  onToggle={toggleNode}
                  onExpandAll={expandAll}
                  onCollapseAll={collapseAll}
                  query={query}
                  canOpenEmployee={canOpenEmployee}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  // The tree is built from the WALK, so that is what it waits
                  // on — not the page fetch. Showing "no units" over a tree
                  // still in flight would be a lie.
                  loading={allLoading}
                  error={allError}
                  onRetry={() => dispatch(fetchAllDepartments())}
                  emptyMessage={
                    isSearching
                      ? "لا توجد وحدات مطابقة"
                      : "لا توجد بيانات لعرضها"
                  }
                />
              ) : (
                <DataTableServer
                  columns={columns}
                  data={items}
                  loading={fetchLoading}
                  // Without these a failed fetch rendered the generic empty
                  // message, so a network error read as "this company has no
                  // organisational units".
                  error={error}
                  onRetry={load}
                  currentPage={meta?.current_page || page}
                  totalPages={meta?.last_page || 1}
                  dataCount={meta?.total || 0}
                  onPageChange={setPage}
                  itemsPerPage={meta?.per_page || 15}
                  showPageSizeSelector={false}
                  updatePermission="departments.update"
                  deletePermission="departments.delete"
                  functions={{
                    rowLabel: (item) => item.name,
                    handleUpdate: openEdit,
                    handleDelete: handleDelete,
                  }}
                />
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Fallback gated on the open flag, NOT unconditional: the lazy
          element below is always mounted so its chunk prefetches with the
          page, which means this boundary is suspended during ordinary page
          load too — an unconditional fallback would flash a modal shell on
          every visit. See ModalFallback. */}
      <Suspense fallback={modalOpen ? <ModalFallback /> : null}>
        <DepartmentFormModal
          open={modalOpen}
          close={() => setModalOpen(false)}
          department={editingDepartment}
          currentPage={page}
        />
      </Suspense>
    </Fragment>
  );
};

export default Departments;
