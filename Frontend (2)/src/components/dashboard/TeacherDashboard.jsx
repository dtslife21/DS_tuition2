import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getTeacherCourses,
  getTeacherStudents,
} from "../../services/courseService";
import { getRecentMaterials } from "../../services/materialService";
import CourseCard from "../courses/CourseCard";
import StudentCard from "../users/UserCard";
import MaterialCard from "../materials/MaterialCard";
import Card from "../common/Card";
import StatsCard from "../common/StatsCard";
import Loader from "../common/Loader";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("notices");
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesData, studentsData, materialsData] = await Promise.all([
          getTeacherCourses(user.id),
          getTeacherStudents(user.id),
          getRecentMaterials(user.id),
        ]);
        setCourses(coursesData);
        setStudents(studentsData);
        setMaterials(materialsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

  if (loading) {
    return <Loader className="py-12" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatsCard
          title="Class Students"
          value={students.length}
          icon={<span className="text-3xl">👨‍🎓</span>}
        />
        <StatsCard
          title="Total Lessons"
          value={courses.reduce((acc, c) => acc + (c.lessons?.length || 0), 0)}
          icon={<span className="text-3xl">📘</span>}
        />
        <StatsCard
          title="Tests Taken"
          value={24}
          icon={<span className="text-3xl">📝</span>}
        />
        <StatsCard
          title="Total Hours"
          value={`30 hrs`}
          icon={<span className="text-3xl">⏰</span>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Courses
          </h3>
          <div className="space-y-4">
            {courses.slice(0, 3).map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Students
          </h3>
          <div className="space-y-4">
            {students.slice(0, 5).map((student) => (
              <StudentCard key={student.id} user={student} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Recent Materials
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.slice(0, 3).map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      </div>

      {/* Notices & Announcements Card (visual only, empty state) */}
      <div>
        <Card className="p-0">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 rounded-full w-12 h-12 flex items-center justify-center">
                <span className="text-white text-xl">🔔</span>
              </div>
              <div>
                <h4 className="text-white text-xl font-semibold">
                  Notices & Announcements
                </h4>
                <div className="text-white/80 text-sm">
                  (Stay updated with the latest information)
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-white">
              <button className="p-2 hover:bg-white/10 rounded">🔔</button>
              <button className="p-2 hover:bg-white/10 rounded">🔍</button>
              <button className="p-2 hover:bg-white/10 rounded">⋮</button>
            </div>
          </div>

          <div className="p-6">
            <div className="border-b">
              <nav className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-300 p-4">
                <button
                  onClick={() => setActiveTab("notices")}
                  className={`flex flex-col items-start focus:outline-none ${
                    activeTab === "notices" ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-500">🔔</span>
                    <span className="font-medium">NOTICES (0)</span>
                  </div>
                  <div
                    className={`h-0.5 w-full mt-3 ${
                      activeTab === "notices" ? "bg-blue-600" : "bg-transparent"
                    }`}
                  />
                </button>

                <button
                  onClick={() => setActiveTab("attachments")}
                  className={`flex flex-col items-start focus:outline-none ${
                    activeTab === "attachments"
                      ? "text-blue-600"
                      : "text-gray-500"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">📎</span>
                    <span className="font-medium">ATTACHMENTS (0)</span>
                  </div>
                  <div
                    className={`h-0.5 w-full mt-3 ${
                      activeTab === "attachments"
                        ? "bg-blue-600"
                        : "bg-transparent"
                    }`}
                  />
                </button>
              </nav>
            </div>

            {activeTab === "notices" ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500">
                <div className="text-4xl">🔔</div>
                <h5 className="mt-4 text-lg font-medium text-gray-700">
                  No notices available
                </h5>
                <p className="mt-2 text-sm">Check back later for updates</p>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                <div className="bg-white/20 dark:bg-white/10 rounded-full w-20 h-20 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-gray-300 dark:text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.44 11.05l-9.19 9.19a5.5 5.5 0 01-7.78-7.78l8.48-8.48a4 4 0 015.66 5.66L9.5 19.5a2.5 2.5 0 01-3.54-3.54l7.07-7.07"
                    />
                  </svg>
                </div>
                <h5 className="mt-6 text-lg font-medium text-gray-700 dark:text-gray-200">
                  No attachments available
                </h5>
                <p className="mt-2 text-sm text-gray-400 dark:text-gray-300">
                  Check back later for updates
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Floating action button */}
        <button className="fixed right-8 bottom-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center">
          💬
        </button>
      </div>
    </div>
  );
};

export default TeacherDashboard;
