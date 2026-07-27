import React from 'react';
import '../../styles/pagination.css';

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showInfo = true,
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return { pages, start, end };
  };

  const { pages, start, end } = getVisiblePages();

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageClick = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="pagination-container">
      {showInfo && totalItems > 0 && (
        <div className="pagination-info">
          Showing <span className="highlight">{startItem}-{endItem}</span> of{' '}
          <span className="highlight">{totalItems}</span> items
        </div>
      )}

      <div className="pagination-controls">
        <button
          className="pagination-btn prev"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Prev
        </button>

        <div className="pagination-pages">
          {start > 1 && (
            <>
              <button
                className="pagination-page"
                onClick={() => handlePageClick(1)}
              >
                1
              </button>
              {start > 2 && <span className="pagination-ellipsis">...</span>}
            </>
          )}

          {pages.map((page) => (
            <button
              key={page}
              className={`pagination-page ${page === currentPage ? 'active' : ''}`}
              onClick={() => handlePageClick(page)}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ))}

          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
              <button
                className="pagination-page"
                onClick={() => handlePageClick(totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        <button
          className="pagination-btn next"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          Next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
