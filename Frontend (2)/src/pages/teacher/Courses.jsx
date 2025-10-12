import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getAllCourses, createCourse } from "../../services/courseService";
import CourseList from "../../components/courses/CourseList";
import CourseView from "../../components/courses/CourseView";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import CourseForm from "../../components/courses/CourseForm";
import Button from "../../components/common/Button";

const TeacherCourses = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const all = await getAllCourses();
        setCourses(all);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user.id]);

  if (loading) {
    return <Loader className="py-12" />;
  }

  // When a course is selected, show the detailed view (CourseView reads id from route)
  if (id) {
    return <CourseView />;
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

      {courses.length > 0 ? (
        <CourseList courses={courses} />
      ) : (
        <EmptyState
          title="No courses found"
          description="No courses available."
        />
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Course"
      >
        <CourseForm
          onSubmit={async (data) => {
            const created = await createCourse({ ...data, teacherId: user.id });
            setCourses((prev) => [...prev, created]);
            setShowModal(false);
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};

export default TeacherCourses;
