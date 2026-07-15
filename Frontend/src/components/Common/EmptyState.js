import React from "react";
import { FiInbox } from "react-icons/fi";
import "./States.css";

const EmptyState = ({
  title = "No data found",
  message = "There's nothing here yet.",
  icon: Icon = FiInbox,
  action = null,
}) => {
  return (
    <div className="state-box empty-state">
      <div className="state-icon">
        <Icon size={34} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action && <div className="state-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
