import React, { Fragment } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import ProtectedElement from "../pages/layout/ProtectedElement";
import { MutatingDots } from "react-loader-spinner";
import TablePaginationServer from "./TablePaginationServer";

// Server-paginated table (Format A lists: configurable page size + `meta`).
// - updatePermission / deletePermission: full permission strings from the
//   catalogue (e.g. "departments.update") gating the action buttons.
// - functions.hideDelete(item) / functions.disableDelete(item) /
//   functions.disableUpdate(item): per-row business guards (e.g. the seeded
//   admin role, self-deletion), with optional disabledUpdateReason /
//   disabledDeleteReason tooltips. functions.deleteLabel renames the ENABLED
//   delete tooltip, for resources where "حذف" misdescribes what happens (a soft
//   withdraw, say); disabledDeleteReason only ever shows on a disabled button.
// - showActions={false} removes the actions COLUMN entirely, header included.
//   Needed for append-only histories (سجل التعيين): a resource with no update
//   and no delete must not show an empty column implying an action exists.
// - onRowClick makes rows navigate; it is skipped when the click originated
//   inside the actions cell, inside any other interactive control, or when the
//   gesture actually selected text (see handleRowClick).
// - functions.rowLabel(item): the row's human name, appended to the edit and
//   delete buttons' accessible names. Without it a screen reader reads a page
//   of identical "تعديل"/"حذف" buttons with nothing saying which record each
//   one belongs to. Optional — the plain verbs remain the fallback.
// - error / onRetry render a failed load in place of the rows, with a retry.
// - SORTING: a column opts in with `sortKey` — the exact key the SERVER accepts
//   for that column. The caller passes the current `sort` value and an
//   `onSortChange` handler; the table itself sorts nothing. See SORT below.

// Three-state cycle on the column you clicked: unsorted → ascending →
// descending → unsorted. The third state matters — without it there is no way
// back to the server's own default ordering once you have touched a header,
// and for these lists the default is itself meaningful (newest first).
//
// Clicking a DIFFERENT column always starts that column at ascending rather
// than inheriting the previous column's direction, which would silently apply a
// direction the user chose for something else.
const nextSortValue = (sortKey, currentSort) => {
  if (currentSort === sortKey) return `-${sortKey}`;
  if (currentSort === `-${sortKey}`) return "";
  return sortKey;
};

const sortDirection = (sortKey, currentSort) => {
  if (currentSort === sortKey) return "asc";
  if (currentSort === `-${sortKey}`) return "desc";
  return null;
};

const DataTableServer = ({
  columns,
  data,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 10,
  onItemsPerPageChange,
  showPageSizeSelector = true,
  functions,
  renderActions,
  loading,
  dataCount,
  updatePermission,
  deletePermission,
  showActions = true,
  onRowClick,
  error,
  onRetry,
  emptyMessage = "لا توجد بيانات لعرضها",
  // The sort string currently in effect, in the server's own vocabulary
  // ("hire_date" / "-hire_date" / ""). Owned by the caller, because on these
  // screens it is one field of a filter object that also feeds the URL and the
  // "الترتيب" dropdown — two controls over one value, never two sources of it.
  sort = "",
  onSortChange,
}) => {
  const colCount = (columns?.length || 0) + (showActions ? 1 : 0);

  // A row click must not hijack a text SELECTION. Copying an employee number or
  // a national ID out of a row is routine work here, but dragging across a cell
  // still ends in a `click` on the <tr> — so every attempt to select text also
  // navigated away from the page you were reading it on. If the gesture left
  // something selected, it was a selection; if it landed on a control, that
  // control owns it.
  const handleRowClick = (item) => (event) => {
    const selection = window.getSelection?.();
    if (selection && !selection.isCollapsed && selection.toString().trim()) {
      return;
    }
    if (event.target.closest?.("a, button, input, select, textarea, label")) {
      return;
    }
    onRowClick(item);
  };

  return (
    <Fragment>
      <div className="table-responsive">
        {/* No `userSelect: "none"` here. Copying an employee number, a national
            ID, a phone or an email straight out of a row is routine work in an
            HR system, and suppressing selection on the whole table made every
            one of those a retype-by-hand. Rows navigate on a SINGLE click, so
            there is no double-click gesture for stray selection to interfere
            with.

            `table-wrap-sm` releases `text-nowrap` below the lg breakpoint (see
            the horizontal-overflow block at the end of styles.css). On a phone
            these tables were one unbroken line per row inside a scroller whose
            scrollbar the global `*::-webkit-scrollbar { width: 0 }` had made
            invisible — so the off-screen columns were unreachable AND unhinted.
            Cells that must never break opt back in with `table-cell-nowrap`. */}
        <table className="table text-nowrap table-wrap-sm table-hover table-striped">
          <thead>
            <tr>
              {columns?.map((column, index) => {
                // A column is sortable only when it names a key the SERVER can
                // order by AND the screen wired up a handler. A header that
                // looks clickable but produces a 422 is worse than a plain one.
                const sortable = Boolean(column.sortKey && onSortChange);
                const direction = sortable
                  ? sortDirection(column.sortKey, sort)
                  : null;

                return (
                  <th
                    scope="col"
                    key={index}
                    className={column.center ? "text-center" : ""}
                    // aria-sort belongs on the header CELL, not the button, and
                    // "none" on every other sortable column is what tells a
                    // screen-reader user the rest are sortable but inactive.
                    aria-sort={
                      !sortable
                        ? undefined
                        : direction === "asc"
                        ? "ascending"
                        : direction === "desc"
                        ? "descending"
                        : "none"
                    }
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className={`table-sort-button${
                          direction ? " is-sorted" : ""
                        }`}
                        onClick={() =>
                          onSortChange(nextSortValue(column.sortKey, sort))
                        }
                        // The visible label already names the column, so the
                        // accessible name only has to add what the click does.
                        aria-label={`${column.label} — ${
                          direction === "asc"
                            ? "مرتّب تصاعدياً، اضغط للترتيب تنازلياً"
                            : direction === "desc"
                            ? "مرتّب تنازلياً، اضغط لإلغاء الترتيب"
                            : "اضغط للترتيب تصاعدياً"
                        }`}
                      >
                        <span>{column.label}</span>
                        <i
                          className={
                            direction === "asc"
                              ? "ri-arrow-up-line"
                              : direction === "desc"
                              ? "ri-arrow-down-line"
                              : "ri-arrow-up-down-line"
                          }
                          aria-hidden="true"
                        ></i>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
              {showActions && <th className="text-center">الاجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="text-center" colSpan={colCount}>
                  <MutatingDots
                    visible={true}
                    height="100"
                    width="100"
                    color="var(--primary-color)"
                    secondaryColor="var(--secondary-color)"
                    radius="12.5"
                    ariaLabel="mutating-dots-loading"
                    wrapperStyle={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="text-center py-4" colSpan={colCount}>
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
                </td>
              </tr>
            ) : (
              <>
                {data?.length > 0 ? (
                  data.map((item) => {
                    // Used for the two icon-only action buttons below, which
                    // otherwise announce as a page of identical "تعديل"/"حذف".
                    const label = functions?.rowLabel?.(item);
                    return (
                    <tr
                      key={item.id}
                      // Mouse-only shortcut, deliberately. The row keeps its
                      // native `row` semantics: making it role="button" stripped
                      // the table structure assistive tech relies on AND nested
                      // the edit/delete buttons inside an interactive element,
                      // which is invalid. Keyboard access to the record comes
                      // from a real focusable control instead — callers that set
                      // onRowClick should also pass functions.handleDetail.
                      onClick={onRowClick ? handleRowClick(item) : undefined}
                      style={onRowClick ? { cursor: "pointer" } : undefined}
                    >
                      {columns.map((column, idx) => (
                        <td
                          key={idx}
                          // `nowrap: true` on a column keeps that cell on one
                          // line even on a phone — dates, ids and numbers,
                          // where a break changes what the value looks like.
                          className={`py-3${
                            column.nowrap ? " table-cell-nowrap" : ""
                          }`}
                        >
                          {column.render
                            ? column.render(item[column.key], item)
                            : item[column.key]}
                        </td>
                      ))}
                      {showActions && (
                      <td
                        className="table-cell-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="d-flex gap-2 align-items-center justify-content-center">
                          {functions?.handleDetail && (
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>عرض</Tooltip>}
                            >
                              <button
                                type="button"
                                onClick={() => functions.handleDetail(item)}
                                className="btn btn-sm btn-info-light btn-wave"
                                // Icon-only: without this a screen reader
                                // announces an unlabelled button.
                                aria-label={
                                  functions?.detailLabel?.(item) ||
                                  (label ? `عرض ${label}` : "عرض")
                                }
                              >
                                <i
                                  className="ri-eye-line align-middle"
                                  aria-hidden="true"
                                ></i>
                              </button>
                            </OverlayTrigger>
                          )}
                          {functions?.handleUpdate && (
                            <ProtectedElement
                              element={
                                <OverlayTrigger
                                  placement="top"
                                  overlay={
                                    <Tooltip>
                                      {functions?.disableUpdate?.(item)
                                        ? functions?.disabledUpdateReason ||
                                          "لا يمكن التعديل"
                                        : "تعديل"}
                                    </Tooltip>
                                  }
                                >
                                  {/* disableUpdate was being passed by callers
                                      and silently ignored, so a row meant to be
                                      uneditable (a seeded system role) opened an
                                      edit form that could only ever be refused.
                                      The wrapping span keeps the tooltip working
                                      over a disabled button. */}
                                  <span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        functions.handleUpdate(item)
                                      }
                                      disabled={functions?.disableUpdate?.(
                                        item
                                      )}
                                      className="btn btn-sm btn-success-light btn-wave"
                                      aria-label={
                                        label ? `تعديل ${label}` : "تعديل"
                                      }
                                    >
                                      <i
                                        className="ri-pencil-line align-middle"
                                        aria-hidden="true"
                                      ></i>
                                    </button>
                                  </span>
                                </OverlayTrigger>
                              }
                              requiredPermissions={
                                updatePermission ? [updatePermission] : []
                              }
                            />
                          )}
                          {functions?.handleDelete &&
                            !functions?.hideDelete?.(item) && (
                              <ProtectedElement
                                element={
                                  <OverlayTrigger
                                    placement="top"
                                    overlay={
                                      <Tooltip>
                                        {functions?.disableDelete?.(item)
                                          ? functions?.disabledDeleteReason ||
                                            "لا يمكن الحذف"
                                          : functions?.deleteLabel || "حذف"}
                                      </Tooltip>
                                    }
                                  >
                                    <span>
                                      <button
                                        type="button"
                                        // The whole ITEM follows the id. The
                                        // confirmation dialog has to name the
                                        // record being destroyed, and the id
                                        // alone cannot produce that name. Pure
                                        // addition — handlers that only declare
                                        // `(id)` are unaffected.
                                        onClick={() =>
                                          functions.handleDelete(item.id, item)
                                        }
                                        disabled={functions?.disableDelete?.(
                                          item
                                        )}
                                        className="btn btn-sm btn-danger-light"
                                        aria-label={
                                          label
                                            ? `${
                                                functions?.deleteLabel || "حذف"
                                              } ${label}`
                                            : functions?.deleteLabel || "حذف"
                                        }
                                      >
                                        <i
                                          className="ri-delete-bin-7-line align-middle"
                                          aria-hidden="true"
                                        ></i>
                                      </button>
                                    </span>
                                  </OverlayTrigger>
                                }
                                requiredPermissions={
                                  deletePermission ? [deletePermission] : []
                                }
                              />
                            )}
                          {renderActions && renderActions(item)}
                        </div>
                      </td>
                      )}
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={colCount} className="text-center py-4">
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
      {dataCount > 0 && (
        <TablePaginationServer
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          currentData={data}
          dataCount={dataCount}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(value) => {
            onPageChange(1);
            onItemsPerPageChange?.(value);
          }}
          showPageSizeSelector={showPageSizeSelector}
        />
      )}
    </Fragment>
  );
};

export default DataTableServer;
