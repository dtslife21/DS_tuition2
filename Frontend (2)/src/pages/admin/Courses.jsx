import { useState, useEffect } from "react";
import { getAllCourses, createCourse } from "../../services/courseService";
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
  const [showModal, setShowModal] = useState(false); // Course form modal
  const [showSubjectModal, setShowSubjectModal] = useState(false); // Subject form modal
  const [createdSubject, setCreatedSubject] = useState(null);
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
      // Ensure subjectId is present (prefilled from created subject)
      const payload = {
        ...formValues,
        subjectId:
          formValues.subjectId ??
          createdSubject?.id ??
          createdSubject?.SubjectID ??
          createdSubject?.subjectId ??
          undefined,
      };
      const created = await createCourse(payload);
      setCourses((prev) => [...prev, created]);
      setShowModal(false);
      setCreatedSubject(null);
    } catch (err) {
      console.error("Error creating course:", err);
    } finally {
      setSavingCourse(false);
    }
  };

  const handleSubjectSubmit = async (subjectData) => {
    try {
      setSavingSubject(true);
      const created = await createSubject(subjectData);

      // Save created subject, close subject modal, open course modal with prefilled subjectId
      setCreatedSubject(created);
      setShowSubjectModal(false);
      setShowModal(true);
    } catch (err) {
      console.error("Error creating subject:", err);
    } finally {
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
        <Button
          variant="primary"
          onClick={() => {
            setCreatedSubject(null);
            setShowSubjectModal(true);
          }}
          disabled={savingCourse}
        >
          {savingCourse ? "Saving..." : "Add Course"}
        </Button>
      </div>

      <CourseList courses={courses} basePath="/admin/courses" />

      {/* Subject form opens first */}
      <Modal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        title="Add Subject"
      >
        <SubjectForm
          onSubmit={handleSubjectSubmit}
          onCancel={() => setShowSubjectModal(false)}
          loading={savingSubject}
        />
      </Modal>

      {/* Course form opens after subject is created, with subjectId pre-filled */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setCreatedSubject(null);
        }}
        title="Add New Course"
      >
        <CourseForm
          onSubmit={handleCourseSubmit}
          onCancel={() => {
            setShowModal(false);
            setCreatedSubject(null);
          }}
          loading={savingCourse}
          initialData={{
            subjectId:
              createdSubject?.id ??
              createdSubject?.SubjectID ??
              createdSubject?.subjectId ??
              "",
          }}
        />
      </Modal>
    </div>
  );
};

export default AdminCourses;
