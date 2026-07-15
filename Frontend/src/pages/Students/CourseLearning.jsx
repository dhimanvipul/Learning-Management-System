import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const CourseLearning = () => {
  const { courseId } = useParams();

  const [sections, setSections] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);

  // 1. fetch sections
  useEffect(() => {
    const fetchSections = async () => {
      const res = await fetch(
        `http://localhost:5000/api/v1/sections/course/${courseId}`
      );

      const data = await res.json();
      setSections(data.data || []);
    };

    fetchSections();
  }, [courseId]);

  // 2. load lessons for section
  const loadLessons = async (sectionId) => {
    const res = await fetch(
      `http://localhost:5000/api/v1/lessons/section/${sectionId}`
    );

    const data = await res.json();
    setCurrentLesson(data.data?.[0] || null);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      
      {/* LEFT SIDEBAR */}
      <div style={{ width: "300px", borderRight: "1px solid #ddd" }}>
        <h3 style={{ padding: "10px" }}>Sections</h3>

        {sections.map((sec) => (
          <div
            key={sec._id}
            style={{
              padding: "10px",
              cursor: "pointer",
              borderBottom: "1px solid #eee",
            }}
            onClick={() => loadLessons(sec._id)}
          >
            {sec.title}
          </div>
        ))}
      </div>

      {/* RIGHT CONTENT */}
      <div style={{ flex: 1, padding: "20px" }}>
        <h2>{currentLesson?.title || "Select Lesson"}</h2>

        {currentLesson?.videoUrl && (
          <video width="100%" controls>
            <source src={currentLesson.videoUrl} />
          </video>
        )}

        <p>{currentLesson?.description}</p>
      </div>
    </div>
  );
};

export default CourseLearning;