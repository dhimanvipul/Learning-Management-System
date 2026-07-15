import React, { useEffect, useState, useRef } from "react";
import { FiAward, FiDownload, FiCheckCircle, FiClock, FiAlertTriangle } from "react-icons/fi";
import enrollmentService from "../../services/enrollmentService";
import Spinner from "../../components/Common/Spinner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./MyCertificates.css";

const MyCertificates = () => {
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState("");
  const [selectedCert, setSelectedCert] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchCertificates = async () => {
      if (!user || !user._id) {
        setError("User session not found.");
        setLoading(false);
        return;
      }
      try {
        const data = await enrollmentService.getStudentEnrollments(user._id);
        // Filter: only show completed courses (progress = 100%)
        const completed = data.filter((e) => e.progress === 100);
        setEnrollments(completed);
      } catch (err) {
        setError(err.message || "Failed to load certificates.");
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  const handleDownload = async (enrollment) => {
    setSelectedCert(enrollment);
    setDownloading(true);

    // Wait a brief moment for the certificate modal/DOM to render
    setTimeout(async () => {
      try {
        const element = certificateRef.current;
        if (!element) {
          alert("Error: Certificate element not found.");
          setDownloading(false);
          setSelectedCert(null);
          return;
        }

        const canvas = await html2canvas(element, {
          scale: 2, // Higher scale for premium print quality
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff"
        });

        const imgData = canvas.toDataURL("image/png");
        
        // jsPDF Landscape mode (a4 is 297mm x 210mm)
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4"
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Certificate_${enrollment.courseId?.title.replace(/\s+/g, "_")}.pdf`);
      } catch (err) {
        console.error("PDF Generation error:", err);
        alert("Failed to generate PDF certificate.");
      } finally {
        setDownloading(false);
        setSelectedCert(null);
      }
    }, 600);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "approved":
        return {
          label: "Approved",
          className: "status-approved",
          icon: <FiCheckCircle className="cert-status-icon" />
        };
      case "rejected":
        return {
          label: "Rejected",
          className: "status-rejected",
          icon: <FiAlertTriangle className="cert-status-icon" />
        };
      case "pending":
      default:
        return {
          label: "Pending Approval",
          className: "status-pending",
          icon: <FiClock className="cert-status-icon" />
        };
    }
  };

  if (loading) return <div className="cert-loading-wrapper"><Spinner /></div>;

  return (
    <div className="my-certificates-container">
      <div className="cert-page-header">
        <div className="header-text-block">
          <h1>🎓 My Certificates</h1>
          <p>View and download certificates for your completed LMS programs.</p>
        </div>
      </div>

      {error && <div className="cert-error-banner">{error}</div>}

      {enrollments.length === 0 ? (
        <div className="empty-certificates-card">
          <FiAward size={48} className="empty-award-icon" />
          <h3>No Certificates Available</h3>
          <p>Complete a course modules to 100% to request certification approval.</p>
        </div>
      ) : (
        <div className="certificates-grid">
          {enrollments.map((item) => {
            const statusConfig = getStatusConfig(item.certificateStatus);
            const isApproved = item.certificateStatus === "approved";
            const instructorName = item.courseId?.instructorId?.name || "SkillVerse Specialist";

            return (
              <div className="certificate-card" key={item._id}>
                <div className="cert-card-thumbnail">
                  {item.courseId?.thumbnail ? (
                    <img src={item.courseId.thumbnail} alt={item.courseId.title} />
                  ) : (
                    <div className="cert-thumbnail-placeholder">
                      <FiAward size={36} />
                    </div>
                  )}
                  <div className="cert-card-overlay-badge">
                    100% Complete
                  </div>
                </div>

                <div className="cert-card-details">
                  <h3>{item.courseId?.title || "Syllabus Program"}</h3>
                  <p className="cert-instructor">Instructed by <strong>{instructorName}</strong></p>
                  
                  <div className="cert-meta-row">
                    <span className="cert-date-label">
                      Issue Date: {isApproved && item.certificateApprovedAt 
                        ? new Date(item.certificateApprovedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                          })
                        : "—"}
                    </span>
                  </div>

                  <div className="cert-status-action-row">
                    <span className={`cert-status-badge ${statusConfig.className}`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>

                    <button
                      className="download-cert-btn"
                      disabled={!isApproved || downloading}
                      onClick={() => handleDownload(item)}
                      title={isApproved ? "Download Certificate" : "Certificate pending approval"}
                    >
                      <FiDownload size={15} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden Certificate Rendering Area for PDF Capture */}
      {selectedCert && (
        <div className="hidden-certificate-capture-portal">
          <div
            ref={certificateRef}
            style={{
              width: "1122px", height: "794px",
              background: "#ffffff", position: "relative",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              overflow: "hidden",
            }}
          >
            {/* Background Pattern */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `radial-gradient(circle at 15% 15%, rgba(201,162,39,0.06) 0%, transparent 50%),
                radial-gradient(circle at 85% 85%, rgba(201,162,39,0.06) 0%, transparent 50%),
                repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(201,162,39,0.025) 30px, rgba(201,162,39,0.025) 31px)`,
            }} />

            {/* Outer Gold Border */}
            <div style={{ position: "absolute", inset: "18px", border: "4px solid #c9a227", borderRadius: "4px" }} />
            {/* Inner Gold Border */}
            <div style={{ position: "absolute", inset: "26px", border: "1.5px solid #e8c84a", borderRadius: "2px" }} />

            {/* Corner Ornaments */}
            {[[{top:"14px",left:"14px"},{},{},{}],[{},{top:"14px",right:"14px"},{},{}],[{},{},{bottom:"14px",left:"14px"},{}],[{},{},{},{bottom:"14px",right:"14px"}]].map((_, i) => {
              const positions = [
                { top: "14px", left: "14px" },
                { top: "14px", right: "14px" },
                { bottom: "14px", left: "14px" },
                { bottom: "14px", right: "14px" },
              ];
              return (
                <div key={i} style={{
                  position: "absolute", ...positions[i],
                  width: "48px", height: "48px",
                  borderTop: "4px solid #c9a227", borderLeft: "4px solid #c9a227",
                  transform: i === 1 ? "scaleX(-1)" : i === 2 ? "scaleY(-1)" : i === 3 ? "scale(-1)" : "none",
                }} />
              );
            })}

            {/* Main Content */}
            <div style={{
              position: "absolute", inset: "36px",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              textAlign: "center", padding: "10px 60px",
            }}>
              {/* Logo */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                <div style={{ width:"52px",height:"52px",borderRadius:"50%",background:"linear-gradient(135deg,#c9a227,#f5d76e)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(201,162,39,0.4)" }}>
                  <span style={{ fontSize: "22px" }}>🎓</span>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize:"22px",fontWeight:"900",color:"#1a1200",fontFamily:"'Inter',sans-serif",letterSpacing:"1px" }}>LMS - SkillifyMe</div>
                  <div style={{ fontSize:"10px",color:"#7a6a2a",letterSpacing:"3px",textTransform:"uppercase",fontFamily:"'Inter',sans-serif" }}>Academy of Hyper Learning</div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ display:"flex",alignItems:"center",gap:"10px",margin:"8px 0",width:"100%" }}>
                <div style={{ flex:1,height:"1px",background:"linear-gradient(90deg,transparent,#c9a227)" }} />
                <span style={{ color:"#c9a227",fontSize:"18px" }}>✦</span>
                <div style={{ flex:1,height:"1px",background:"linear-gradient(90deg,#c9a227,transparent)" }} />
              </div>

              <div style={{ fontSize:"13px",letterSpacing:"5px",color:"#8a7030",textTransform:"uppercase",fontFamily:"'Inter',sans-serif",fontWeight:"600",marginBottom:"4px" }}>Certificate of Completion</div>
              <div style={{ fontSize:"30px",fontWeight:"bold",color:"#1a1200",fontFamily:"'Palatino Linotype','Book Antiqua',Palatino,serif",lineHeight:1.1,marginBottom:"10px" }}>This Certificate is Proudly Presented to</div>

              {/* Student Name */}
              <div style={{ fontSize:"42px",fontStyle:"italic",color:"#c9a227",fontFamily:"'Palatino Linotype','Book Antiqua',Palatino,serif",fontWeight:"bold",marginBottom:"2px",lineHeight:1.2 }}>
                {user?.fullName || user?.name || user?.username || "Distinguished Learner"}
              </div>
              <div style={{ width:"320px",height:"2px",background:"linear-gradient(90deg,transparent,#c9a227,transparent)",marginBottom:"10px" }} />

              <div style={{ fontSize:"12.5px",color:"#444",lineHeight:"1.6",maxWidth:"680px",fontFamily:"'Inter',sans-serif",marginBottom:"4px" }}>
                for successfully completing all curriculum requirements, assessments, and practical assignments of the course
              </div>

              {/* Course Name */}
              <div style={{ fontSize:"20px",fontWeight:"bold",color:"#1a1200",fontFamily:"'Palatino Linotype','Book Antiqua',Palatino,serif",background:"rgba(201,162,39,0.08)",padding:"6px 28px",border:"1px solid rgba(201,162,39,0.3)",borderRadius:"4px",marginBottom:"4px" }}>
                {selectedCert.courseId?.title || "Professional Development Program"}
              </div>

              <div style={{ fontSize:"12px",color:"#666",fontFamily:"'Inter',sans-serif",marginBottom:"14px" }}>
                under the guidance of instructor&nbsp;
                <strong style={{ color:"#2d2000" }}>{selectedCert.courseId?.instructorId?.name || "LMS - SkillifyMe Faculty"}</strong>
              </div>

              {/* Divider 2 */}
              <div style={{ display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px",width:"100%" }}>
                <div style={{ flex:1,height:"1px",background:"linear-gradient(90deg,transparent,#c9a227)" }} />
                <span style={{ color:"#c9a227",fontSize:"18px" }}>✦</span>
                <div style={{ flex:1,height:"1px",background:"linear-gradient(90deg,#c9a227,transparent)" }} />
              </div>

              {/* Footer Row */}
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",width:"100%" }}>
                {/* Instructor Sig */}
                <div style={{ textAlign:"center",flex:1 }}>
                  <div style={{ fontFamily:"'Brush Script MT','Segoe Script',cursive",fontSize:"22px",color:"#2d2000",marginBottom:"2px",borderBottom:"1.5px solid #c9a227",paddingBottom:"4px" }}>
                    {selectedCert.courseId?.instructorId?.name || "Authorized Faculty"}
                  </div>
                  <div style={{ fontSize:"10px",letterSpacing:"2px",color:"#8a7030",fontFamily:"'Inter',sans-serif",textTransform:"uppercase" }}>Instructor Signature</div>
                </div>

                {/* Official Seal */}
                <div style={{ textAlign:"center",flex:1 }}>
                  <div style={{ width:"80px",height:"80px",borderRadius:"50%",border:"3px solid #c9a227",background:"radial-gradient(circle,rgba(201,162,39,0.15) 0%,rgba(201,162,39,0.05) 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto 4px",position:"relative" }}>
                    <div style={{ position:"absolute",inset:"4px",borderRadius:"50%",border:"1px dashed #c9a227",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"2px" }}>
                      <span style={{ fontSize:"20px" }}>⭐</span>
                      <div style={{ fontSize:"7px",fontFamily:"'Inter',sans-serif",fontWeight:"700",color:"#7a6a2a",letterSpacing:"0.5px",textAlign:"center",lineHeight:"1.1" }}>LMS<br/>OFFICIAL<br/>SEAL</div>
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div style={{ textAlign:"center",flex:1 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif",fontSize:"15px",color:"#2d2000",fontWeight:"700",marginBottom:"2px",borderBottom:"1.5px solid #c9a227",paddingBottom:"4px" }}>
                    {selectedCert.certificateApprovedAt
                      ? new Date(selectedCert.certificateApprovedAt).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})
                      : new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}
                  </div>
                  <div style={{ fontSize:"10px",letterSpacing:"2px",color:"#8a7030",fontFamily:"'Inter',sans-serif",textTransform:"uppercase" }}>Date of Issue</div>
                </div>
              </div>

              {/* Certificate ID */}
              <div style={{ marginTop:"10px",fontSize:"10px",color:"#999",fontFamily:"'Inter',sans-serif",letterSpacing:"0.5px" }}>
                Certificate ID: <strong style={{ color:"#c9a227" }}>{selectedCert.certificateId || "CERT-N/A"}</strong>
                &nbsp;|&nbsp;LMS - SkillifyMe &copy; {new Date().getFullYear()}. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCertificates;
