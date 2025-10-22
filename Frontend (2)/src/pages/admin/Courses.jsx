import { useState, useEffect } from "react";
import { getAllCourses } from "../../services/courseService";
import CourseList from "../../components/courses/CourseList";
import Modal from "../../components/common/Modal";
import CourseForm from "../../components/courses/CourseForm";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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
    </div>
  );
};

export default AdminCourses;
