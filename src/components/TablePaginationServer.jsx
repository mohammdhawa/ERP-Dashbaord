import React from "react";
import { Pagination } from "react-bootstrap";
import Select from "react-select";

const TablePaginationServer = ({
  currentPage,
  totalPages,
  onPageChange,
  currentData,
  dataCount,
}) => {
  const maxVisiblePages = 5;

  const pageOptions = Array.from({ length: totalPages }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}`,
  }));

  const getPaginationItems = () => {
    let paginationItems = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      paginationItems.push(1);
      if (startPage > 2) {
        paginationItems.push("...");
      }
    }

    for (let page = startPage; page <= endPage; page++) {
      paginationItems.push(page);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationItems.push("...");
      }
      paginationItems.push(totalPages);
    }

    return paginationItems;
  };

  const handlePageSelect = (selectedOption) => {
    if (selectedOption) {
      onPageChange(selectedOption.value);
    }
  };

  return dataCount ? (
    <div className="d-flex mt-3 align-items-center justify-content-between flex-wrap">
      <p className="m-0">
        <strong>{currentData?.length}</strong> من <strong>{dataCount}</strong>
      </p>

      <nav
        aria-label="Page navigation"
        className="pagination-style-4 align-items-center justify-content-center z-0"
      >
        <Pagination className="flex-wrap m-0">
          <Pagination.Item
            disabled={currentPage <= 10}
            onClick={() => onPageChange(currentPage - 10)}
          >
            <i className="ri-arrow-right-double-line align-middle"></i>
          </Pagination.Item>
          <Pagination.Item
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <i className="ri-arrow-left-s-line align-middle"></i>
          </Pagination.Item>

          {getPaginationItems().map((page, index) => (
            <Pagination.Item
              key={index}
              active={page === currentPage}
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={typeof page === "string"}
            >
              {page}
            </Pagination.Item>
          ))}

          <Pagination.Item
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <i className="ri-arrow-right-s-line align-middle"></i>
          </Pagination.Item>
          <Pagination.Item
            disabled={currentPage > totalPages - 10}
            onClick={() => onPageChange(currentPage + 10)}
          >
            <i className="ri-arrow-left-double-line align-middle"></i>
          </Pagination.Item>
        </Pagination>
      </nav>
      <span className="m-0 d-flex align-items-center gap-2">
        صفحة
        <div style={{ minWidth: "100px" }}>
          <Select
            classNamePrefix="Select2"
            options={pageOptions}
            value={pageOptions.find((option) => option.value === currentPage)}
            onChange={handlePageSelect}
            placeholder="اختر الصفحة"
            isSearchable={true}
            menuPosition="fixed"
            maxMenuHeight={150}
          />
        </div>
        من <strong>{totalPages}</strong>
      </span>
    </div>
  ) : (
    <></>
  );
};

export default TablePaginationServer;
