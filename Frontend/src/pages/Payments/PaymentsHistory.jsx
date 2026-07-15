import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FiDollarSign, FiSearch, FiDownload, FiFileText } from "react-icons/fi";
import Spinner from "../../components/Common/Spinner";
import ErrorState from "../../components/Common/ErrorState";
import EmptyState from "../../components/Common/EmptyState";
import SearchBar from "../../components/Common/SearchBar";
import Button from "../../components/Common/Button";
import DataTable from "../../components/Table/DataTable";
import paymentService from "../../services/paymentService";
import Badge from "../../components/Common/Badge";
import "./PaymentsHistory.css";

const PaymentsHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await paymentService.getAll();
      setPayments(data);
    } catch (err) {
      setError(
        err.friendlyMessage || "Failed to load payment history. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const studentName = p.studentId?.name || "";
      const courseTitle = p.courseId?.title || "";
      const txId = p.paymentId || "";
      const orderId = p.orderId || "";
      
      const matchesSearch =
        studentName.toLowerCase().includes(search.toLowerCase()) ||
        courseTitle.toLowerCase().includes(search.toLowerCase()) ||
        txId.toLowerCase().includes(search.toLowerCase()) ||
        orderId.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  const exportToCSV = () => {
    if (filteredPayments.length === 0) return;
    const headers = ["Date", "Student", "Course", "Amount (INR)", "Status", "Payment ID", "Order ID"];
    const rows = filteredPayments.map((p) => [
      p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A",
      p.studentId?.name || "N/A",
      p.courseId?.title || "N/A",
      p.amount || 0,
      p.status,
      p.paymentId || "N/A",
      p.orderId || "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LMS_Payments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (filteredPayments.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredPayments, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `LMS_Payments_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (row) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "N/A",
    },
    {
      key: "student",
      label: "Student",
      render: (row) => (
        <div>
          <p className="table-primary-text">{row.studentId?.name || "Unknown Student"}</p>
          <p className="table-secondary-text">{row.studentId?.email || "-"}</p>
        </div>
      ),
    },
    {
      key: "course",
      label: "Course",
      render: (row) => row.courseId?.title || "Unknown Course",
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => <span className="gold-accent">₹{row.amount}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        let variant = "pending";
        if (row.status === "success") variant = "success";
        if (row.status === "failed") variant = "danger";
        return <Badge variant={variant}>{row.status?.toUpperCase()}</Badge>;
      },
    },
    {
      key: "paymentId",
      label: "Gateway Transaction ID",
      render: (row) => (
        <div>
          <p className="table-primary-text font-mono">{row.paymentId || "N/A"}</p>
          <p className="table-secondary-text font-mono">Order: {row.orderId || "N/A"}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>
            Payment <span className="gold-accent">History</span>
          </h1>
          <p>View, search, and export LMS payment records.</p>
        </div>
        <div className="export-actions">
          <Button icon={FiDownload} onClick={exportToCSV} variant="outline" style={{ marginRight: 10 }}>
            Export CSV
          </Button>
          <Button icon={FiFileText} onClick={exportToJSON}>
            Export JSON
          </Button>
        </div>
      </div>

      <div className="payments-toolbar">
        <div className="search-box-wrapper">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by student, course, payment ID..."
          />
        </div>
        <div className="filter-wrapper">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-select"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <div className="toolbar-count">
            <FiDollarSign size={15} />
            <span>{filteredPayments.length} transaction(s)</span>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading payments..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPayments} />
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          title="No payments found"
          message={search || statusFilter !== "all" ? "Try adjusting your search filters." : "No transactions registered yet."}
          icon={FiDollarSign}
        />
      ) : (
        <DataTable columns={columns} data={filteredPayments} />
      )}
    </div>
  );
};

export default PaymentsHistory;
