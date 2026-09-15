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
//   inside the actions cell, so a delete button never also opens the row.
// - error / onRetry render a failed load in place of the rows, with a retry.
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
}) => {
  const colCount = (columns?.length || 0) + (showActions ? 1 : 0);

  return (
    <Fragment>
      <div className="table-responsive">
        <table
          style={{ userSelect: "none", caretColor: "transparent" }}
          className="table text-nowrap table-hover table-striped"
        >
          <thead>
            <tr>
              {columns?.map((column, index) => (
                <th
                  scope="col"
                  key={index}
                  className={column.center ? "text-center" : ""}
                >
                  {column.label}
                </th>
              ))}
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
                  data.map((item) => (
                    <tr
                      key={item.id}
                      // Mouse-only shortcut, deliberately. The row keeps its
                      // native `row` semantics: making it role="button" stripped
                      // the table structure assistive tech relies on AND nested
                      // the edit/delete buttons inside an interactive element,
                      // which is invalid. Keyboard access to the record comes
                      // from a real focusable control instead — callers that set
                      // onRowClick should also pass functions.handleDetail.
                      onClick={onRowClick ? () => onRowClick(item) : undefined}
                      style={onRowClick ? { cursor: "pointer" } : undefined}
                    >
                      {columns.map((column, idx) => (
                        <td key={idx} className="py-3">
                          {column.render
                            ? column.render(item[column.key], item)
                            : item[column.key]}
                        </td>
                      ))}
                      {showActions && (
                      <td onClick={(e) => e.stopPropagation()}>
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
                                  functions?.detailLabel?.(item) || "عرض"
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
                                      aria-label="تعديل"
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
                                        onClick={() =>
                                          functions.handleDelete(item.id)
                                        }
                                        disabled={functions?.disableDelete?.(
                                          item
                                        )}
                                        className="btn btn-sm btn-danger-light"
                                        aria-label="حذف"
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
                  ))
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
