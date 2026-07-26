import React, { Fragment, useEffect, useState } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import ProtectedElement from "../pages/layout/ProtectedElement";
import TablePagination from "./TablePagination";
import { MutatingDots } from "react-loader-spinner";

// Client-paginated table (Format B lists: full collection, no `meta` key).
// updatePermission / deletePermission gate the action buttons with full
// permission strings; functions.hideDelete / functions.disableDelete are
// per-row business guards.
const DataTable = ({
  columns,
  data,
  itemsPerPage,
  functions,
  renderActions,
  loading,
  updatePermission,
  deletePermission,
}) => {
  const [dataCount, setDataCount] = useState(data?.length);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortedData, setSortedData] = useState(data);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "default",
  });

  const totalPages = Math.max(1, Math.ceil(data?.length / itemsPerPage));

  useEffect(() => {
    const firstItemIndex = (currentPage - 1) * itemsPerPage;
    const newPage = Math.floor(firstItemIndex / itemsPerPage) + 1;
    setCurrentPage(newPage);
  }, [itemsPerPage]);

  useEffect(() => {
    const newPage = Math.min(currentPage, totalPages);
    setCurrentPage(newPage);
  }, [data, totalPages]);

  useEffect(() => {
    setDataCount(data?.length);
    setSortedData(data);
    setSortConfig({ key: null, direction: "default" });
  }, [data]);

  const currentData = sortedData?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "default";
    }

    setSortConfig({ key, direction });

    if (direction === "default") {
      setSortedData(data);
      return;
    }

    const sorted = [...data].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else if (aValue instanceof Date && bValue instanceof Date) {
        return direction === "asc" ? aValue - bValue : bValue - aValue;
      } else {
        return direction === "asc" ? aValue - bValue : bValue - aValue;
      }
    });

    setSortedData(sorted);
  };

  return (
    <Fragment>
      <div className="table-responsive ">
        <table
          style={{
            userSelect: "none",
            caretColor: "transparent",
          }}
          className="table text-nowrap table-hover table-striped"
        >
          <thead>
            <tr>
              {columns?.map((column, index) => (
                <th
                  scope="col"
                  key={index}
                  className={column.center ? "text-center" : ""}
                  onClick={() => column.sort && handleSort(column.key)}
                  style={{ cursor: column.sort ? "pointer" : "default" }}
                >
                  {column.sort && sortConfig.key === column.key && (
                    <span>
                      {sortConfig.direction === "asc" ? (
                        <i className="ri-arrow-up-line me-1 text-muted fs-12"></i>
                      ) : sortConfig.direction === "desc" ? (
                        <i className="ri-arrow-down-line me-1 text-muted fs-12"></i>
                      ) : (
                        <i className="ri-arrow-up-down-line me-1 text-muted fs-12"></i>
                      )}
                    </span>
                  )}
                  {column.label}
                </th>
              ))}
              <th className="text-center">الاجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="text-center " colSpan={columns.length + 1}>
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
                {currentData?.length > 0 ? (
                  currentData.map((item) => (
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
                          {functions?.handleDetail ? (
                            <OverlayTrigger
                              placement={"top"}
                              overlay={<Tooltip id="tooltip-top">عرض</Tooltip>}
                            >
                              <button
                                onClick={() => {
                                  functions?.handleDetail(item);
                                }}
                                className="btn btn-sm btn-info-light btn-wave"
                              >
                                <i className="ri-eye-line align-middle"></i>
                              </button>
                            </OverlayTrigger>
                          ) : (
                            <></>
                          )}
                          {functions?.handleUpdate &&
                          !functions?.hideUpdate?.(item) ? (
                            <ProtectedElement
                              element={
                                <OverlayTrigger
                                  placement={"top"}
                                  overlay={
                                    <Tooltip id="tooltip-top">
                                      {functions?.disableUpdate?.(item)
                                        ? functions?.disabledUpdateReason ||
                                          "لا يمكن التعديل"
                                        : "تعديل"}
                                    </Tooltip>
                                  }
                                >
                                  <span>
                                    <button
                                      onClick={() => {
                                        functions?.handleUpdate(item);
                                      }}
                                      disabled={functions?.disableUpdate?.(item)}
                                      className="btn  btn-sm btn-success-light btn-wave"
                                    >
                                      <i className="ri-pencil-line align-middle"></i>
                                    </button>
                                  </span>
                                </OverlayTrigger>
                              }
                              requiredPermissions={
                                updatePermission ? [updatePermission] : []
                              }
                            />
                          ) : (
                            <></>
                          )}
                          {functions?.handleDelete &&
                          !functions?.hideDelete?.(item) ? (
                            <ProtectedElement
                              element={
                                <OverlayTrigger
                                  placement={"top"}
                                  overlay={
                                    <Tooltip id="tooltip-top">
                                      {functions?.disableDelete?.(item)
                                        ? functions?.disabledDeleteReason ||
                                          "لا يمكن الحذف"
                                        : "حذف"}
                                    </Tooltip>
                                  }
                                >
                                  <span>
                                    <button
                                      onClick={() => {
                                        functions?.handleDelete(item?.id);
                                      }}
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
                          ) : (
                            <></>
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
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        dataCount={dataCount}
        itemsPerPage={itemsPerPage}
        currentData={currentData}
      />
    </Fragment>
  );
};

export default DataTable;
