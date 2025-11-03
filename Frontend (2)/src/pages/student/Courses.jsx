import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getStudentCourses } from "../../services/courseService";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";

const StudentCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const studentId =
          user?.StudentID ??
          user?.studentID ??
          user?.studentId ??
          user?.UserID ??
          user?.userID ??
          user?.userId ??
          user?.id;

        if (!studentId) {
          setCourses([]);
          return;
        }
        const data = await getStudentCourses(studentId);
        setCourses(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching student courses:", error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  if (loading) {
    return <Loader className="py-12" />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 flex flex-col items-center justify-start pt-10 px-4">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* Tab Navigation */}
        <div className="w-full flex justify-center mb-8">
          <nav className="bg-blue-600 rounded-lg shadow flex">
            <button
              className={`px-8 py-3 text-lg font-semibold focus:outline-none transition-colors duration-200 rounded-l-lg ${
                activeTab === "details"
                  ? "bg-white dark:bg-gray-900 text-blue-600"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              onClick={() => setActiveTab("details")}
            >
              Class Details
            </button>
            <button
              className={`px-8 py-3 text-lg font-semibold focus:outline-none transition-colors duration-200 ${
                activeTab === "marks"
                  ? "bg-white dark:bg-gray-900 text-blue-600"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              onClick={() => setActiveTab("marks")}
            >
              Subject Marks
            </button>
            <button
              className={`px-8 py-3 text-lg font-semibold focus:outline-none transition-colors duration-200 rounded-r-lg ${
                activeTab === "chart"
                  ? "bg-white dark:bg-gray-900 text-blue-600"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              onClick={() => setActiveTab("chart")}
            >
              Marks Chart
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "details" && (
          <>
            <div className="w-full flex flex-col items-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                Class Details
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 font-medium text-center">
                You are currently in Class{" "}
                <span className="font-bold text-gray-800 dark:text-white">
                  Grade 11
                </span>
              </p>
            </div>
            {courses.length > 0 ? (
              <div className="w-full flex flex-wrap justify-center gap-8 mt-6">
                {courses.map((course) => (
                  <Link
                    key={course.id}
                    to={`/student/courses/${course.id}`}
                    className="no-underline"
                  >
                    <div className="bg-blue-200 dark:bg-blue-900 rounded-xl shadow-lg flex flex-col items-center p-8 w-80 max-w-full transition-transform hover:scale-105 group hover:shadow-2xl">
                      <div className="bg-blue-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mb-4 shadow-md">
                        {course.name.charAt(0)}
                      </div>
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 text-center group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                        {course.name}
                      </div>
                      <div className="text-md text-gray-700 dark:text-gray-300 text-center">
                        {course.code}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No courses enrolled"
                description="You are not enrolled in any courses yet."
                action={
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Browse Courses
                  </button>
                }
              />
            )}
          </>
        )}
        {activeTab === "marks" && (
          <div className="w-full flex flex-col items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              Subject Marks
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 font-medium text-center">
              Marks for each subject will be shown here.
            </p>
            {/* TODO: Replace with actual marks table or component */}
            <div className="mt-8 w-full flex justify-center">
              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg shadow p-8 w-96 max-w-full text-center text-gray-700 dark:text-gray-200">
                <span>Subject marks data goes here.</span>
              </div>
            </div>
          </div>
        )}
        {activeTab === "chart" && (
          <div className="w-full flex flex-col items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              Marks Chart
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 font-medium text-center">
              Visual chart of marks will be shown here.
            </p>
            {/* TODO: Replace with actual chart component */}
            <div className="mt-8 w-full flex justify-center">
              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg shadow p-8 w-96 max-w-full text-center text-gray-700 dark:text-gray-200">
                <span>Marks chart visualization goes here.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCourses;
