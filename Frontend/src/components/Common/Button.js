import React from "react";
import Spinner from "./Spinner";
import "./Button.css";

const Button = ({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  icon: Icon = null,
  fullWidth = false,
  ...rest
}) => {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? "btn-full" : ""}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="btn-spinner">
          <Spinner size="sm" label="" />
        </span>
      ) : (
        <>
          {Icon && <Icon size={16} />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default Button;
