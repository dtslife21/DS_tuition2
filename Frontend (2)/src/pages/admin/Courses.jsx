import { useState, useEffect } from "react";
import { getAllCourses } from "../../services/courseService";
import SubjectForm from "../../components/admin/SubjectForm";
import { createSubject } from "../../services/subjectService";
import CourseList from "../../components/courses/CourseList";
import Modal from "../../components/common/Modal";
import CourseForm from "../../components/courses/CourseForm";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await getAllCourses();
        setCourses(data);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleCourseSubmit = (newCourse) => {
    setCourses([...courses, newCourse]);
    setShowModal(false);
    // after creating a course, open subject form to capture subject data
    setSelectedCourse(newCourse);
    setShowSubjectModal(true);
  };

  const handleSubjectSubmit = async (subjectData) => {
    try {
      // include course reference so backend can associate subject with course if supported
      const payload = {
        ...subjectData,
        courseId: selectedCourse?.id ?? selectedCourse?.CourseID ?? null,
        courseName: selectedCourse?.name ?? selectedCourse?.CourseName ?? "",
      };
      const created = await createSubject(payload);

      // attach subject locally to the course for immediate UI feedback
      setCourses((prev) =>
        prev.map((c) =>
          String(c.id) === String(selectedCourse?.id)
            ? { ...c, subjects: [...(c.subjects || []), created] }
            : c
        )
      );
    } catch (err) {
      console.error("Error creating subject:", err);
    } finally {
      setShowSubjectModal(false);
      setSelectedCourse(null);
    }
  };

  if (loading) {
    return <Loader className="py-12" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Courses
        </h1>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Add Course
        </Button>
      </div>

      <CourseList courses={courses} basePath="/admin/courses" />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Course"
      >
        <CourseForm
          onSubmit={handleCourseSubmit}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
      {/* Subject form modal shown after creating a new course */}
      <Modal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        title={
          selectedCourse
            ? `Add Subject for ${
                selectedCourse?.name || selectedCourse?.CourseName || ""
              }`
            : "Add Subject"
        }
      >
        <SubjectForm
          initial={{
            courseName: selectedCourse?.name || selectedCourse?.CourseName,
          }}
          onSubmit={handleSubjectSubmit}
          onCancel={() => setShowSubjectModal(false)}
        />
      </Modal>
    </div>
  );
};

export default AdminCourses;
