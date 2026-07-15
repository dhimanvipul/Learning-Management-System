import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import courseService from "../../services/courseService";
import Spinner from "../../components/Common/Spinner";
import ErrorState from "../../components/Common/ErrorState";
import "./ExploreCourses.css";

import {
  FiBookOpen,
  FiSearch,
  FiClock,
  FiDollarSign,
  FiCompass,
  FiCheckCircle,
  FiArrowRight,
  FiAward,
  FiCreditCard,
} from "react-icons/fi";

const ExploreCourses = () => {
  const navigate = useNavigate();

  // Core States
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search States
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All");

  // Enrollment Modal States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetCourse, setTargetCourse] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  const loadCatalogData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?._id) {
        setError("Session expired. Please log in.");
        return;
      }

      // 1. Fetch all available courses
      const courseList = await courseService.getAll();
      setCourses(courseList);

      // 2. Fetch student's current enrollments
      const resEnroll = await fetch(
        `http://localhost:5000/api/enrollments/student/${user._id}`
      );
      const enrollmentsRes = await resEnroll.json();
      setEnrollments(enrollmentsRes.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch course catalog. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogData();
  }, [loadCatalogData]);

  // Set of enrolled course IDs
  const enrolledCourseIds = useMemo(() => {
    return new Set(enrollments.map((e) => e.courseId?._id));
  }, [enrollments]);

  // Filter logic
  const filteredCourses = useMemo(() => {
    let result = courses;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q)
      );
    }

    // Level filter
    if (selectedLevel !== "All") {
      result = result.filter((c) => c.level === selectedLevel);
    }

    return result;
  }, [courses, search, selectedLevel]);

  // Load Razorpay Script Helper
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Launch enrollment checkout dialog
  const handleEnrollClick = (course) => {
    setTargetCourse(course);
    setShowConfirmModal(true);
  };

  // Perform checkout and Payment signature verification
  const handlePaymentCheckout = async () => {
    if (!targetCourse) return;
    const user = JSON.parse(localStorage.getItem("user"));
    setEnrolling(true);

    try {
      // 1. Create order on Backend
      const orderRes = await axios.post(
        "http://localhost:5000/api/v1/payments/order",
        {
          studentId: user._id,
          courseId: targetCourse._id,
        }
      );

      if (!orderRes.data.success) {
        throw new Error(orderRes.data.message || "Failed to create order");
      }

      const orderData = orderRes.data.data;

      // 2. Load script & handle checkout
      const scriptLoaded = await loadRazorpayScript();

      if (orderData.isMock || !scriptLoaded) {
        // Fallback to Sandbox Checkout
        toast.info("Sandbox Simulation Activated. Processing checkout...", {
          autoClose: 2000,
        });

        // Trigger verification with mock parameters to enroll immediately
        const verifyRes = await axios.post(
          "http://localhost:5000/api/v1/payments/verify",
          {
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pmt_mock_${Math.random().toString(36).substring(7)}`,
            razorpay_signature: `sig_mock_${Math.random().toString(36).substring(7)}`,
          }
        );

        if (verifyRes.data.success) {
          toast.success(`Enrolled in ${targetCourse.title} successfully! 🚀`);
          setShowConfirmModal(false);
          navigate("/student/courses");
        } else {
          toast.error("Sandbox enrollment registration failed.");
        }
      } else {
        // Real Razorpay Checkout flow
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "SkillVerse LMS",
          description: `Enrollment for ${targetCourse.title}`,
          order_id: orderData.orderId,
          handler: async function (response) {
            try {
              // 3. Verify Payment on Backend
              const verifyRes = await axios.post(
                "http://localhost:5000/api/v1/payments/verify",
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }
              );

              if (verifyRes.data.success) {
                toast.success(`Welcome aboard! Course unlocked successfully. 🚀`);
                setShowConfirmModal(false);
                navigate("/student/courses");
              }
            } catch (err) {
              console.error(err);
              toast.error("Signature verification failed. Contact support.");
            }
          },
          prefill: {
            name: user.username,
            email: user.email,
          },
          theme: {
            color: "#D4AF37",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Checkout initialization failed.");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="explore-loading-wrapper">
        <Spinner label="Loading Course Catalog..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="explore-error-wrapper">
        <ErrorState message={error} onRetry={loadCatalogData} />
      </div>
    );
  }

  return (
    <div className="explore-courses-page">
      {/* Title Header */}
      <div className="explore-header-section">
        <div className="header-text-block">
          <h1>
            <FiCompass className="compass-icon-spin" /> Course <span className="gold-accent">Catalog</span>
          </h1>
          <p>Discover expert-led paths, assignments, and verified certificates.</p>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="explore-filters-bar">
        <div className="explore-search-input-wrapper">
          <FiSearch className="search-icon-decor" />
          <input
            type="text"
            placeholder="Search courses by topic, syllabus, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="level-filter-buttons">
          {["All", "Beginner", "Intermediate", "Advanced"].map((lvl) => (
            <button
              key={lvl}
              className={`filter-lvl-btn ${selectedLevel === lvl ? "active" : ""}`}
              onClick={() => setSelectedLevel(lvl)}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      {filteredCourses.length === 0 ? (
        <div className="explore-empty-state">
          <FiBookOpen size={48} className="fade-book-icon" />
          <h3>No Courses Found</h3>
          <p>No active courses match your current search parameters.</p>
        </div>
      ) : (
        <div className="explore-cards-grid">
          {filteredCourses.map((course) => {
            const isEnrolled = enrolledCourseIds.has(course._id);
            return (
              <div key={course._id} className="explore-course-card">
                {/* Image / Banner */}
                <div className="card-media-banner">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="catalog-image" />
                  ) : (
                    <div className="catalog-image-placeholder">
                      <FiBookOpen size={40} />
                    </div>
                  )}
                  <span className={`level-pill-badge ${course.level?.toLowerCase()}`}>
                    {course.level}
                  </span>
                </div>

                {/* Details */}
                <div className="card-details-info">
                  <span className="course-code-tag">{course.code || "CRED-T"}</span>
                  <h3>{course.title}</h3>
                  <p className="description-snip">{course.description || "Learn core conceptual tracks with structured assignments."}</p>

                  <div className="card-meta-line-row">
                    <span className="meta-pill"><FiClock /> {course.duration || 12} Hrs</span>
                    <span className="meta-pill"><FiAward /> {course.credits || 3} Credits</span>
                  </div>

                  <div className="card-price-enrollment-row">
                    <div className="price-tag-wrap">
                      <FiDollarSign className="dollar-icon" />
                      <span>{course.price > 0 ? `${course.price.toFixed(2)}` : "Free"}</span>
                    </div>

                    {isEnrolled ? (
                      <button
                        className="enrollment-btn-action enrolled"
                        onClick={() => navigate(`/student/courses/${course._id}`)}
                      >
                        Start Learning <FiArrowRight />
                      </button>
                    ) : (
                      <button
                        className="enrollment-btn-action enroll-now"
                        onClick={() => handleEnrollClick(course)}
                      >
                        Enroll Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation/Simulated Checkout Modal */}
      {showConfirmModal && targetCourse && (
        <div className="checkout-confirm-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="checkout-confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="checkout-modal-header">
              <h2>Confirm Enrollment & Checkout</h2>
              <button className="close-checkout-modal-btn" onClick={() => setShowConfirmModal(false)}>
                &times;
              </button>
            </div>

            <div className="checkout-modal-body">
              <div className="checkout-course-summary-box">
                <h4>{targetCourse.title}</h4>
                <p className="checkout-instructor-p">
                  Instructor: <strong>{targetCourse.instructorId?.name || "SkillVerse Expert"}</strong>
                </p>
                <div className="checkout-badge-row">
                  <span className="badge-checkout-pill">{targetCourse.level}</span>
                  <span className="badge-checkout-pill">{targetCourse.credits} Credits</span>
                  <span className="badge-checkout-pill">{targetCourse.duration} Hours</span>
                </div>
              </div>

              <div className="checkout-pricing-block">
                <div className="pricing-line">
                  <span>Course Tuition</span>
                  <span>{targetCourse.price > 0 ? `$${targetCourse.price.toFixed(2)}` : "FREE"}</span>
                </div>
                <div className="pricing-line discount">
                  <span>Introductory Promotion</span>
                  <span>-$0.00</span>
                </div>
                <div className="pricing-total-line">
                  <span>Total Due</span>
                  <span>{targetCourse.price > 0 ? `$${targetCourse.price.toFixed(2)}` : "$0.00"}</span>
                </div>
              </div>

              <div className="simulated-payment-notification">
                <FiCreditCard />
                <p>Loads official Razorpay panel if keys are configured. Otherwise uses Sandbox checkout.</p>
              </div>

              <button
                className="checkout-primary-submit-btn"
                onClick={handlePaymentCheckout}
                disabled={enrolling}
              >
                {enrolling ? "Launching Checkout..." : "Pay & Enroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExploreCourses;
