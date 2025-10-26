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
  // createdSubject stores an already-persisted subject (with id) when available.
  const [createdSubject, setCreatedSubject] = useState(null);
  // tempSubjectPayload holds the subject data submitted in step 1 but not yet persisted.
  const [tempSubjectPayload, setTempSubjectPayload] = useState(null);
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
    // Persist the subject first (if we only have a temp payload), then create the course.
    // If course creation fails, attempt to delete the newly created subject (rollback).
    setSavingCourse(true);
    let persistedSubject = null;
    try {
      if (tempSubjectPayload && !tempSubjectPayload.id) {
        setSavingSubject(true);
        persistedSubject = await createSubject(tempSubjectPayload);
        setSavingSubject(false);
      } else if (createdSubject && createdSubject.id) {
        persistedSubject = createdSubject;
      }

      // Prefer the subject we just persisted (if any). Fall back to any value the user entered.
      const subjectIdToUse =
        persistedSubject?.id ??
        persistedSubject?.SubjectID ??
        persistedSubject?.subjectId ??
        formValues.subjectId ??
        undefined;

      const payload = {
        ...formValues,
        subjectId: subjectIdToUse,
      };

      const created = await createCourse(payload);

      setCourses((prev) => [...prev, created]);
      setShowModal(false);
      setCreatedSubject(null);
      setTempSubjectPayload(null);
    } catch (err) {
      console.error(
        "Error creating course (subject persisted may be rolled back):",
        err
      );
      // rollback subject if it was persisted above
      try {
        if (persistedSubject && persistedSubject.id) {
          const subjectService = await import("../../services/subjectService");
          await subjectService.deleteSubject(persistedSubject.id);
        }
      } catch (delErr) {
        console.warn("Failed to rollback created subject:", delErr);
      }
    } finally {
      setSavingCourse(false);
      setSavingSubject(false);
    }
  };

  const handleSubjectSubmit = async (subjectData) => {
    // Do NOT persist subject immediately. Keep payload in temp state and open the course form.
    setTempSubjectPayload(subjectData);
    setCreatedSubject(null);
    setShowSubjectModal(false);
    setShowModal(true);
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
        title="Step 1 of 2 — Add Subject"
      >
        <SubjectForm
          step={1}
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
        title="Step 2 of 2 — Add Course"
      >
        <CourseForm
          step={2}
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
