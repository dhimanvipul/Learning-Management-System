import axios from "axios";

const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api/v1";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Response interceptor - normalizes backend { success, data } / { success, error } shape
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "Something went wrong. Please try again.";

    if (error.response) {
      message =
        error.response.data?.error ||
        error.response.data?.message ||
        `Request failed with status ${error.response.status}`;
    } else if (error.request) {
      message =
        "Unable to reach the server. Please check your connection or make sure the backend is running.";
    } else {
      message = error.message;
    }

    return Promise.reject({ ...error, friendlyMessage: message });
  }
);

export default apiClient;
