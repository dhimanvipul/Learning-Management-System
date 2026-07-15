import React from "react";
import "./InputField.css";

const InputField = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder = "",
  error = "",
  required = false,
  as = "input",
  options = [],
  min,
  max,
  step,
  disabled = false,
}) => {
  return (
    <div className="input-field">
      {label && (
        <label htmlFor={name}>
          {label} {required && <span className="required-mark">*</span>}
        </label>
      )}

      {as === "select" ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={error ? "input-error" : ""}
          disabled={disabled}
        >
          <option value="">{placeholder || "Select an option"}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={error ? "input-error" : ""}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          autoComplete="off"
        />
      )}

      {error && <span className="field-error-msg">{error}</span>}
    </div>
  );
};

export default InputField;
