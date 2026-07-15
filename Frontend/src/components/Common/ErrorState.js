import React from "react";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import "./States.css";

const ErrorState = ({
  title = "Something went wrong",
  message = "We couldn't load this data. Please try again.",
  onRetry = null,
}) => {
  return (
    <div className="state-box error-state">
      <div className="state-icon error-icon">
        <FiAlertTriangle size={34} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          <FiRefreshCw size={15} /> Retry
        </button>
      )}
    </div>
  );
};

export default ErrorState;
