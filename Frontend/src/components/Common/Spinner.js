import React from "react";
import "./Spinner.css";

const Spinner = ({ size = "md", label = "Loading..." }) => {
  return (
    <div className={`spinner-wrapper spinner-${size}`}>
      <div className="spinner-ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      {label && <p className="spinner-label">{label}</p>}
    </div>
  );
};

export default Spinner;
