import React from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import Button from "../../components/Common/Button";
import "./NotFound.css";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <h1 className="not-found-code">404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for doesn't exist or has been moved.</p>
      <Button icon={FiArrowLeft} onClick={() => navigate("/")}>
        Back to Dashboard
      </Button>
    </div>
  );
};

export default NotFound;
