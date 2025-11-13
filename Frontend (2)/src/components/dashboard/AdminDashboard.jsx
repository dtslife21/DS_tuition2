import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getAllUsers } from "../../services/userService";
import { getAllStudents } from "../../services/studentService";
import { getAllCourses } from "../../services/courseService";
import { getAllTeachers } from "../../services/teacherService";
import { getAllAnnouncements } from "../../services/announcementService";
import Card from "../common/Card";
import EmptyState from "../common/EmptyState";
import Loader from "../common/Loader";
import Avatar from "../common/Avatar";
import StatsCard from "../common/StatsCard";
import AnnouncementList from "../announcements/AnnouncementList";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("notices");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          usersData,
          studentsData,
          coursesData,
          teachersData,
          announcementsData,
        ] = await Promise.all([
          getAllUsers(),
          getAllStudents(),
          getAllCourses(),
          getAllTeachers(),
          getAllAnnouncements(),
        ]);
        setUsers(Array.isArray(usersData) ? usersData.filter(Boolean) : []);

        setStudents(
          Array.isArray(studentsData) ? studentsData.filter(Boolean) : []
        );
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setTeachers(Array.isArray(teachersData) ? teachersData : []);
        setAnnouncements(
          Array.isArray(announcementsData) ? announcementsData : []
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        setUsers([]);
        setStudents([]);
        setCourses([]);
        setTeachers([]);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <Loader className="py-12" />;
  }

  return (
    <div className="space-y-8">
      {/* Stats header */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
        <StatsCard icon="🎓" title="Total Students" value={students.length} />
        <StatsCard icon="�" title="Total Courses" value={courses.length} />
        <StatsCard icon="🧑‍🏫" title="Total Teachers" value={teachers.length} />
        {/* <StatsCard icon="💵" title="Fees Collection" value={`Rs.${0}`} /> */}
      </div>

      {/* Notices & Announcements panel */}
      <Card>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-5 text-white flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Notices & Announcements</h3>
            <p className="text-xs opacity-90">
              Stay updated with the latest information
            </p>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <span className="text-lg">🔔</span>
            <span className="text-lg">🔎</span>
            <span className="text-lg">⚙️</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-4">
          <nav className="-mb-px flex gap-6" aria-label="Tabs">
            <button
              onClick={() => setTab("notices")}
              className={`whitespace-nowrap py-4 text-sm font-medium border-b-2 transition-colors ${
                tab === "notices"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              NOTICES ({announcements.length})
            </button>
            <button
              onClick={() => setTab("attachments")}
              className={`whitespace-nowrap py-4 text-sm font-medium border-b-2 transition-colors ${
                tab === "attachments"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              ATTACHMENTS (0)
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {tab === "notices" ? (
            announcements.length ? (
              <AnnouncementList announcements={announcements} />
            ) : (
              <EmptyState
                title="No notices available"
                description="Check back later for updates"
              />
            )
          ) : (
            <EmptyState
              title="No attachments available"
              description="Attachments shared with announcements will appear here."
            />
          )}
        </div>
      </Card>

      {/* Recent Users & Courses (kept for quick access) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Users
          </h3>
          {users.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 stagger-children">
                {users.slice(0, 5).map((user) => (
                  <li key={user.id}>
                    <div className="px-4 py-4 flex items-center sm:px-6 transition-base hover-lift">
                      <div className="min-w-0 flex-1 flex items-center">
                        <div className="flex-shrink-0">
                          <Avatar
                            name={`${user.firstName} ${user.lastName}`}
                            size="sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                          <div>
                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <span className="truncate">{user.email}</span>
                            </p>
                          </div>
                          <div className="hidden md:block">
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white">
                                Role: {user.userType}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              title="No users found"
              description="There are currently no users in the system."
            />
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Courses
          </h3>
          {courses.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 stagger-children">
                {courses.slice(0, 5).map((course) => (
                  <li key={course.id}>
                    <div className="px-4 py-4 sm:px-6 transition-base hover-lift">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                          {course.name}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {course.code}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            {course.subject}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                          <p>{course.academicYear}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              title="No courses found"
              description="There are currently no courses in the system."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
