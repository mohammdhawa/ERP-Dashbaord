import { Fragment, useId } from "react";
import { Link } from "react-router-dom";
import { MutatingDots } from "react-loader-spinner";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import ProtectedElement from "../../pages/layout/ProtectedElement";

// THE ORGANISATION CHART, as a disclosure tree.
//
// This replaces the first attempt, which drew the hierarchy as a "└" glyph and
// a padding-inline-start inside the ordinary striped table. That failed for
// three compounding reasons, all of which this component is shaped to avoid:
//
//   1. The stripes group rows in alternating pairs. Hierarchy groups them by
//      parent. Two conflicting groupings on the same rows cancel each other
//      out, and the stripes win because they are filled areas and the indent
//      was whitespace.
//   2. Seven columns left the name column narrow, so a tier-4 unit's indent ate
//      most of the space its name needed — depth was purchased with legibility.
//   3. Everything rendered at once. This tree is 1 root + a handful of
//      divisions + dozens of sections + potentially a hundred-odd offices; a
//      flat dump of all of it is a wall, not a structure.
//
// So: real connector rails drawn in CSS (not glyphs in the text), one row per
// unit at full width, and collapse. The default state opens the root only, so
// the first thing you see is the company's divisions — about ten rows — and you
// open the branch you care about.
//
// ⚠️ NOT role="tree". A real ARIA tree owes the user arrow-key navigation,
// Home/End, and typeahead; claiming the role without implementing them is worse
// than not claiming it. This is a nested list of disclosure buttons — the same
// pattern as the sidebar's expandable groups — which gets correct semantics and
// keyboard behaviour from the elements themselves.

// Splits a label around the search term so the reason a row matched is visible.
// indexOf on the lowercased string rather than a RegExp: the query is user
// input, and building a pattern out of it would break on any regex character.
const Highlight = ({ text, query }) => {
  const value = text == null ? "" : String(text);
  if (!query) return value;
  const at = value.toLowerCase().indexOf(query);
  if (at === -1) return value;
  return (
    <Fragment>
      {value.slice(0, at)}
      <mark className="dept-tree__match">{value.slice(at, at + query.length)}</mark>
      {value.slice(at + query.length)}
    </Fragment>
  );
};

const DepartmentNode = ({
  node,
  depth,
  expanded,
  onToggle,
  query,
  canOpenEmployee,
  onEdit,
  onDelete,
}) => {
  // useId because aria-controls has to point at this node's own child list, and
  // department ids alone would collide if the tree were ever rendered twice.
  const childrenId = `dept-children-${useId()}`;
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const isOpen = hasChildren && expanded.has(node.id);

  // The descendant count, not the direct-child count. "(4)" next to a division
  // you cannot see inside should tell you how much is in there, and one level
  // down is not that answer.
  const total = node.descendantCount;

  return (
    <li className="dept-tree__item">
      <div
        className={`dept-tree__row dept-tree__row--l${node.level || depth + 1}${
          node.is_active ? "" : " dept-tree__row--inactive"
        }`}
      >
        {hasChildren ? (
          <button
            type="button"
            className="dept-tree__toggle"
            aria-expanded={isOpen}
            aria-controls={childrenId}
            onClick={() => onToggle(node.id)}
          >
            <i
              className={
                isOpen ? "ri-arrow-down-s-line" : "ri-arrow-left-s-line"
              }
              aria-hidden="true"
            ></i>
            <span className="visually-hidden">
              {isOpen ? `طي ${node.name}` : `توسيع ${node.name}`}
            </span>
          </button>
        ) : (
          // A leaf still occupies the toggle's width, so names stay on one
          // vertical line instead of jittering left and right down the tree.
          <span className="dept-tree__toggle dept-tree__toggle--leaf" aria-hidden="true">
            <i className="ri-circle-fill"></i>
          </span>
        )}

        <div className="dept-tree__main">
          <span className="dept-tree__name">
            <Highlight text={node.name} query={query} />
          </span>
          {node.code ? (
            <span className="dept-tree__code" dir="ltr">
              <Highlight text={node.code} query={query} />
            </span>
          ) : null}
        </div>

        <div className="dept-tree__meta">
          {node.level_label ? (
            <span className="badge bg-primary-transparent">
              {node.level_label}
            </span>
          ) : null}
          {/* Sector is INHERITED below tier 2, so it is shown on every unit but
              marked as inherited where the unit does not store it itself —
              otherwise the chart implies a section chose its own grouping. */}
          {node.sector_label ? (
            <span
              className="badge bg-secondary-transparent"
              title={
                node.level === 2
                  ? undefined
                  : "الجهة موروثة من الوحدة الأعلى"
              }
            >
              {node.sector_label}
              {node.level === 2 ? "" : " ↑"}
            </span>
          ) : null}
          {!node.is_active && (
            <span className="badge bg-danger-transparent">معطّلة</span>
          )}
          {hasChildren && !isOpen && (
            <span className="dept-tree__count">{total} وحدة بالداخل</span>
          )}
          {node.manager ? (
            canOpenEmployee ? (
              <Link
                to={`${import.meta.env.BASE_URL}hr/employees/${node.manager.id}`}
                className="badge bg-info-transparent text-decoration-none"
                title={node.manager.employee_number || undefined}
              >
                <i
                  className="ri-user-line align-middle me-1"
                  aria-hidden="true"
                ></i>
                {node.manager.full_name}
              </Link>
            ) : (
              <span className="badge bg-info-transparent">
                {node.manager.full_name}
              </span>
            )
          ) : node.manager_id ? (
            // The FK survived a soft-deleted employee. Collapsing this into
            // "no manager" would state something false about the unit.
            <span
              className="badge bg-secondary-transparent"
              title="الموظف المسجَّل كمدير لم يعد متاحاً (سجل محذوف)"
            >
              موظف #{node.manager_id} — سجل غير متاح
            </span>
          ) : null}
        </div>

        <div className="dept-tree__actions">
          <ProtectedElement
            requiredPermissions={["departments.update"]}
            element={
              <OverlayTrigger placement="top" overlay={<Tooltip>تعديل</Tooltip>}>
                <button
                  type="button"
                  className="btn btn-sm btn-success-light btn-wave"
                  onClick={() => onEdit(node)}
                  aria-label={`تعديل ${node.name}`}
                >
                  <i className="ri-pencil-line align-middle" aria-hidden="true"></i>
                </button>
              </OverlayTrigger>
            }
          />
          <ProtectedElement
            requiredPermissions={["departments.delete"]}
            element={
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip>
                    {hasChildren
                      ? "لا يمكن حذف وحدة تحتوي وحدات فرعية"
                      : "حذف"}
                  </Tooltip>
                }
              >
                {/* The wrapping span keeps the tooltip alive over a disabled
                    button. Disabled on a parent because the server refuses it
                    anyway — better to say why up front than to spend a
                    confirmation dialog on an action that cannot succeed. */}
                <span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger-light"
                    disabled={hasChildren}
                    onClick={() => onDelete(node.id, node)}
                    aria-label={`حذف ${node.name}`}
                  >
                    <i
                      className="ri-delete-bin-7-line align-middle"
                      aria-hidden="true"
                    ></i>
                  </button>
                </span>
              </OverlayTrigger>
            }
          />
        </div>
      </div>

      {hasChildren && (
        // `hidden` rather than unmounting: the collapsed subtree keeps its own
        // open/closed state, so re-opening a division restores exactly what you
        // had open inside it.
        <ul id={childrenId} className="dept-tree__children" hidden={!isOpen}>
          {children.map((child) => (
            <DepartmentNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              query={query}
              canOpenEmployee={canOpenEmployee}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const DepartmentTree = ({
  roots,
  orphans,
  expanded,
  onToggle,
  onExpandAll,
  onCollapseAll,
  query,
  canOpenEmployee,
  onEdit,
  onDelete,
  loading,
  error,
  onRetry,
  emptyMessage,
}) => {
  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <MutatingDots
          visible
          height="100"
          width="100"
          color="var(--primary-color)"
          secondaryColor="var(--secondary-color)"
          radius="12.5"
          ariaLabel="mutating-dots-loading"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4" role="alert">
        <p className="text-danger mb-2">{error}</p>
        {onRetry && (
          <button
            type="button"
            className="btn btn-sm btn-primary-light"
            onClick={onRetry}
          >
            <i className="ri-refresh-line align-middle me-1"></i>
            إعادة المحاولة
          </button>
        )}
      </div>
    );
  }

  if (roots.length === 0 && orphans.length === 0) {
    return <div className="text-center py-4">{emptyMessage}</div>;
  }

  const nodeProps = { expanded, onToggle, query, canOpenEmployee, onEdit, onDelete };

  return (
    <Fragment>
      <div className="dept-tree__toolbar">
        <button
          type="button"
          className="btn btn-sm btn-light"
          onClick={onExpandAll}
        >
          <i className="ri-node-tree align-middle me-1" aria-hidden="true"></i>
          توسيع الكل
        </button>
        <button
          type="button"
          className="btn btn-sm btn-light"
          onClick={onCollapseAll}
        >
          {/* ri-contract-up-down-line, not ri-collapse-diagonal-line — the
              latter is not in this build of the Remix font, so it rendered as
              an empty box. */}
          <i
            className="ri-contract-up-down-line align-middle me-1"
            aria-hidden="true"
          ></i>
          طي الكل
        </button>
      </div>

      <div className="dept-tree">
        <ul className="dept-tree__root">
          {roots.map((node) => (
            <DepartmentNode key={node.id} node={node} depth={0} {...nodeProps} />
          ))}
        </ul>

        {/* Units whose parent is not in the loaded set — a page that failed
            mid-walk, or a parent the reader cannot see. Shown, and shown as
            unplaced: a unit silently missing from an org chart is worse than
            one the chart admits it cannot position. */}
        {orphans.length > 0 && (
          <div className="dept-tree__orphans">
            <p className="text-muted fs-12 mb-2">
              <i
                className="ri-error-warning-line align-middle me-1"
                aria-hidden="true"
              ></i>
              وحدات لم يتم العثور على الوحدة الأعلى لها ضمن البيانات المحمّلة:
            </p>
            <ul className="dept-tree__root">
              {orphans.map((node) => (
                <DepartmentNode
                  key={node.id}
                  node={node}
                  depth={0}
                  {...nodeProps}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </Fragment>
  );
};

export default DepartmentTree;
