import React from "react";
import { FiSearch, FiX } from "react-icons/fi";
import "./SearchBar.css";

const SearchBar = ({ value, onChange, placeholder = "Search..." }) => {
  return (
    <div className="search-bar">
      <FiSearch size={17} className="search-icon" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="search-clear-btn" onClick={() => onChange("")}>
          <FiX size={15} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
