import React, { Fragment } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import ProtectedElement from "../pages/layout/ProtectedElement";
import { MutatingDots } from "react-loader-spinner";
import TablePaginationServer from "./TablePaginationServer";

// Server-paginated table (Format A lists: configurable page size + `meta`).
// - updatePermission / deletePermission: full permission strings from the
//   catalogue (e.g. "departments.update") gating the action buttons.
// - functions.hideDelete(item) / functions.disableDelete(item): per-row
//   business guards (e.g. the seeded admin role, self-deletion).
const DataTableServer = ({
  columns,
  data,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 10,
  onItemsPerPageChange,
  functions,
  renderActions,
  loading,
  dataCount,
  updatePermission,
  deletePermission,
}) => {
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
              <th className="text-center">الاجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="text-center" colSpan={columns.length + 1}>
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
            ) : (
              <>
                {data?.length > 0 ? (
                  data.map((item) => (
                    <tr key={item.id}>
                      {columns.map((column, idx) => (
                        <td key={idx} className="py-3">
                          {column.render
                            ? column.render(item[column.key], item)
                            : item[column.key]}
                        </td>
                      ))}
                      <td>
                        <div className="d-flex gap-2 align-items-center justify-content-center">
                          {functions?.handleDetail && (
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>عرض</Tooltip>}
                            >
                              <button
                                onClick={() => functions.handleDetail(item)}
                                className="btn btn-sm btn-info-light btn-wave"
                              >
                                <i className="ri-eye-line align-middle"></i>
                              </button>
                            </OverlayTrigger>
                          )}
                          {functions?.handleUpdate && (
                            <ProtectedElement
                              element={
                                <OverlayTrigger
                                  placement="top"
                                  overlay={<Tooltip>تعديل</Tooltip>}
                                >
                                  <button
                                    onClick={() => functions.handleUpdate(item)}
                                    className="btn btn-sm btn-success-light btn-wave"
                                  >
                                    <i className="ri-pencil-line align-middle"></i>
                                  </button>
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
                                          : "حذف"}
                                      </Tooltip>
                                    }
                                  >
                                    <span>
                                      <button
                                        onClick={() =>
                                          functions.handleDelete(item.id)
                                        }
                                        disabled={functions?.disableDelete?.(
                                          item
                                        )}
                                        className="btn btn-sm btn-danger-light"
                                      >
                                        <i className="ri-delete-bin-7-line align-middle"></i>
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns?.length + 1}
                      className="text-center py-4"
                    >
                      لا توجد بيانات لعرضها
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
        />
      )}
    </Fragment>
  );
};

export default DataTableServer;
