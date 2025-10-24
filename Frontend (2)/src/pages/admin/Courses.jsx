import { useState, useEffect } from "react";
import {
  getAllCourses,
  createCourse,
  updateCourse,
} from "../../services/courseService";
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
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);

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

  const handleCourseSubmit = async (formValues) => {
    try {
      setSavingCourse(true);
      // Persist the course to backend
      const created = await createCourse(formValues);
      setCourses((prev) => [...prev, created]);
      setShowModal(false);
      // After creating a course, open subject form to capture subject data
      setSelectedCourse(created);
      setShowSubjectModal(true);
    } catch (err) {
      console.error("Error creating course:", err);
    } finally {
      setSavingCourse(false);
    }
  };

  const handleSubjectSubmit = async (subjectData) => {
    try {
      setSavingSubject(true);
      // include course reference so backend can associate subject with course if supported
      const payload = {
        ...subjectData,
        courseId: selectedCourse?.id ?? selectedCourse?.CourseID ?? null,
        courseName: selectedCourse?.name ?? selectedCourse?.CourseName ?? "",
      };
      const created = await createSubject(payload);

      // If backend requires the Course to store SubjectID, perform an update now
      const createdSubjectId =
        created?.id ?? created?.SubjectID ?? created?.subjectId ?? null;

      if ((selectedCourse?.id || selectedCourse?.CourseID) && createdSubjectId) {
        const courseId = selectedCourse?.id ?? selectedCourse?.CourseID;
        try {
          await updateCourse(courseId, {
            SubjectID: createdSubjectId,
            SubjectName:
              created?.name ?? created?.subjectName ?? created?.SubjectName,
          });
        } catch (e) {
          console.warn("Course subject linking failed, updated locally", e);
        }
      }

      // attach subject locally to the course for immediate UI feedback
      const selectedKey = String(
        selectedCourse?.id ?? selectedCourse?.CourseID ?? ""
      );
      setCourses((prev) =>
        prev.map((c) =>
          String(c.id ?? c.CourseID ?? "") === selectedKey
            ? {
                ...c,
                subject: created?.name ?? created?.SubjectName ?? c.subject,
                subjectId: created?.id ?? created?.SubjectID ?? c.subjectId,
                subjects: [...(c.subjects || []), created],
              }
            : c
        )
      );
    } catch (err) {
      console.error("Error creating subject:", err);
    } finally {
      setShowSubjectModal(false);
      setSelectedCourse(null);
      setSavingSubject(false);
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
        <Button variant="primary" onClick={() => setShowModal(true)} disabled={savingCourse}>
          {savingCourse ? "Saving..." : "Add Course"}
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
          loading={savingCourse}
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
          loading={savingSubject}
        />
      </Modal>
    </div>
  );
};

export default AdminCourses;
