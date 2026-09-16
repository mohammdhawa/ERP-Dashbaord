import React, { useMemo } from "react";
import { Pagination } from "react-bootstrap";
import Select from "react-select";

const ROW_COUNT_OPTIONS = [10, 50, 100].map((value) => ({
  value,
  label: `${value}`,
}));

const TablePagination = ({
  currentPage,
  totalPages,
  onPageChange,
  currentData,
  dataCount,
  itemsPerPage = 10,
  onItemsPerPageChange,
  showPageSizeSelector = true,
}) => {
  const maxVisiblePages = 5;
  const normalizedCurrentPage = Number(currentPage) || 1;
  const normalizedTotalPages = Math.max(1, Number(totalPages) || 1);
  const normalizedItemsPerPage = Number(itemsPerPage) || 10;
  const displayedRows = currentData?.length || 0;
  const firstDisplayedRow =
    (normalizedCurrentPage - 1) * normalizedItemsPerPage + 1;
  const lastDisplayedRow = Math.min(
    firstDisplayedRow + displayedRows - 1,
    dataCount
  );

  // Rebuilt only when the page count actually changes. Unmemoised this
  // allocated one object per page on every render — cheap at 20 pages, not at
  // several thousand, and react-select re-diffs the whole list each time.
  const pageOptions = useMemo(
    () =>
      Array.from({ length: normalizedTotalPages }, (_, index) => ({
        value: index + 1,
        label: `${index + 1}`,
      })),
    [normalizedTotalPages]
  );

  const getPaginationItems = () => {
    const paginationItems = [];
    let startPage = Math.max(
      1,
      normalizedCurrentPage - Math.floor(maxVisiblePages / 2)
    );
    const endPage = Math.min(
      normalizedTotalPages,
      startPage + maxVisiblePages - 1
    );

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      paginationItems.push(1);
      if (startPage > 2) paginationItems.push("...");
    }

    for (let page = startPage; page <= endPage; page++) {
      paginationItems.push(page);
    }

    if (endPage < normalizedTotalPages) {
      if (endPage < normalizedTotalPages - 1) paginationItems.push("...");
      paginationItems.push(normalizedTotalPages);
    }

    return paginationItems;
  };

  return dataCount ? (
    <div className="table-pagination-bar">
      <div className="table-pagination-summary">
        <span className="table-pagination-summary-icon" aria-hidden="true">
          <i className="ri-list-check-2"></i>
        </span>
        <span>
          عرض <strong>{firstDisplayedRow}</strong>–<strong>{lastDisplayedRow}</strong>{" "}
          من <strong>{dataCount}</strong> سجل
        </span>
      </div>

      <nav
        aria-label="التنقل بين صفحات الجدول"
        className="pagination-style-4 table-pagination-pages z-0"
      >
        {/* ARROW DIRECTION IS RTL-RELATIVE. Reading runs right-to-left, so
            BACKWARD points right and FORWARD points left. The single-step
            chevrons used to point the opposite way from the double-step arrows
            beside them, so the same strip disagreed with itself. */}
        <Pagination className="m-0">
          <Pagination.Item
            aria-label="الانتقال عشر صفحات للخلف"
            disabled={normalizedCurrentPage <= 10}
            onClick={() => onPageChange(normalizedCurrentPage - 10)}
          >
            <i
              className="ri-arrow-right-double-line align-middle"
              aria-hidden="true"
            ></i>
          </Pagination.Item>
          <Pagination.Item
            aria-label="الصفحة السابقة"
            disabled={normalizedCurrentPage === 1}
            onClick={() => onPageChange(normalizedCurrentPage - 1)}
          >
            <i
              className="ri-arrow-right-s-line align-middle"
              aria-hidden="true"
            ></i>
          </Pagination.Item>

          {getPaginationItems().map((page, index) => (
            <Pagination.Item
              key={`${page}-${index}`}
              active={page === normalizedCurrentPage}
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={typeof page === "string"}
            >
              {page}
            </Pagination.Item>
          ))}

          <Pagination.Item
            aria-label="الصفحة التالية"
            disabled={normalizedCurrentPage === normalizedTotalPages}
            onClick={() => onPageChange(normalizedCurrentPage + 1)}
          >
            <i
              className="ri-arrow-left-s-line align-middle"
              aria-hidden="true"
            ></i>
          </Pagination.Item>
          <Pagination.Item
            aria-label="الانتقال عشر صفحات للأمام"
            disabled={normalizedCurrentPage > normalizedTotalPages - 10}
            onClick={() => onPageChange(normalizedCurrentPage + 10)}
          >
            <i
              className="ri-arrow-left-double-line align-middle"
              aria-hidden="true"
            ></i>
          </Pagination.Item>
        </Pagination>
      </nav>

      <div className="table-pagination-controls">
        {showPageSizeSelector && (
          <label className="table-pagination-control">
            <span>عدد الصفوف</span>
            <select
              className="form-select table-pagination-native-select"
              value={normalizedItemsPerPage}
              onChange={(event) =>
                onItemsPerPageChange?.(Number(event.target.value))
              }
              aria-label="عدد الصفوف في الصفحة"
            >
              {ROW_COUNT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="table-pagination-control">
          <span>الصفحة</span>
          <Select
            className="table-pagination-select table-pagination-select--page"
            classNamePrefix="Select2"
            options={pageOptions}
            value={pageOptions.find(
              (option) => option.value === normalizedCurrentPage
            )}
            onChange={(option) => option && onPageChange(option.value)}
            isSearchable
            menuPosition="fixed"
            maxMenuHeight={150}
            aria-label="اختيار صفحة الجدول"
          />
          <span className="table-pagination-total">
            من <strong>{normalizedTotalPages}</strong>
          </span>
        </label>
      </div>
    </div>
  ) : null;
};

export default TablePagination;
