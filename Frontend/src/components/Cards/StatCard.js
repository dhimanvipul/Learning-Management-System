import React from "react";
import "./StatCard.css";

const StatCard = ({ icon: Icon, label, value, variant = "gold", trend }) => {
  return (
    <div className={`stat-card stat-${variant}`}>
      <div className="stat-card-top">
        <div className="stat-icon-box">
          <Icon size={22} />
        </div>
        {trend && <span className="stat-trend">{trend}</span>}
      </div>
      <h2 className="stat-value">{value}</h2>
      <p className="stat-label">{label}</p>
    </div>
  );
};

export default StatCard;
