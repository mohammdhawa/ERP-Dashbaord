import React from "react";
import { MutatingDots } from "react-loader-spinner";

// Loading / error / content for a screen that fetches its own data. The retry
// button appears only when the caller can actually retry: a 403 is final, so
// those screens pass no `onRetry` and show the message alone.
const StatePanel = ({ loading, error, onRetry, children }) => {
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
      <div className="p-5 text-center" role="alert">
        <span className="avatar avatar-xl avatar-rounded bg-danger-transparent">
          <i className="ri-error-warning-line fs-2"></i>
        </span>
        <h6 className="fw-medium mt-3">{error}</h6>
        {onRetry && (
          <button type="button" className="btn btn-primary btn-sm mt-2" onClick={onRetry}>
            إعادة المحاولة
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

export default StatePanel;
