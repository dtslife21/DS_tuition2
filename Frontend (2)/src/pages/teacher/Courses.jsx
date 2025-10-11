import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getTeacherCourses,
  getCourseDetails,
} from "../../services/courseService";
// Mock data import for local preview only. Remove or disable in production.
import { mockCourses } from "../../utils/mockData";
import CourseList from "../../components/courses/CourseList";
import CourseView from "../../components/courses/CourseView";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";

const TeacherCourses = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Toggle preview with mock data by setting useMockPreview to true
        const useMockPreview = true;
        if (useMockPreview) {
          setCourses(mockCourses);
        } else {
          const data = await getTeacherCourses(user.id);
          setCourses(data);
        }

        if (id) {
          const course = await getCourseDetails(id);
          setSelectedCourse(course);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user.id, id]);

  if (loading) {
    return <Loader className="py-12" />;
  }

  if (id && selectedCourse) {
    return <CourseView course={selectedCourse} />;
  }

  return (
    <div className="space-y-8">
      {/* Attendance statistics banner */}
      <div className="rounded-lg shadow-md overflow-hidden bg-gradient-to-r from-blue-500 to-blue-400 p-6">
        <h2 className="text-white text-xl font-semibold mb-4">
          Attendance Statistics
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-blue-400/30 rounded-md p-6 text-center">
            <div className="text-5xl font-bold text-white">0</div>
            <div className="text-sm text-white/90 mt-2">Today's Attendance</div>
            <div className="text-xs text-white/80 mt-1">
              Saturday, October 11, 2025
            </div>
          </div>
          <div className="bg-blue-400/30 rounded-md p-6 text-center">
            <div className="text-5xl font-bold text-white">1</div>
            <div className="text-sm text-white/90 mt-2">Total Attendance</div>
            <div className="text-xs text-white/80 mt-1">All Time</div>
          </div>
        </div>
      </div>

      {/* Centered title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-700">Class Details</h1>
        <div className="mx-auto h-1 w-24 bg-blue-300 rounded mt-3"></div>
      </div>

      {/* Main card containing the list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Students List
          </h3>
        </div>

        {courses.length > 0 ? (
          <CourseList courses={courses} />
        ) : (
          <EmptyState
            title="No courses assigned"
            description="You don't have any courses assigned to you yet."
            action={
              <Link
                to="/teacher/courses/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Request New Course
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
};

export default TeacherCourses;
