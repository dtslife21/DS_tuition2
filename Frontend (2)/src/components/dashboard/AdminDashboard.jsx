import { useState, useEffect, useRef } from "react";
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
import { useTheme } from "../../contexts/ThemeContext";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  // UI state for header actions (search & sort)
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [sortOrder, setSortOrder] = useState("desc");
  const searchInputRef = useRef(null);
  const searchBoxRef = useRef(null);
  const optionsRef = useRef(null);
  const { theme } = useTheme();

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

  // Close overlays when clicking/touching outside
  useEffect(() => {
    const handlePointerDown = (e) => {
      const t = e.target;
      if (
        showSearch &&
        searchBoxRef.current &&
        !searchBoxRef.current.contains(t)
      ) {
        setShowSearch(false);
      }
      if (
        showOptions &&
        optionsRef.current &&
        !optionsRef.current.contains(t)
      ) {
        setShowOptions(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showSearch, showOptions]);

  // Prepare announcements list based on search + sort
  const filteredAnnouncements = (announcements || [])
    .filter((a) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title?.toLowerCase().includes(q) ||
        a.content?.toLowerCase().includes(q)
      );
    })
    .slice()
    .sort((a, b) => {
      const da = new Date(a.postDate || 0).getTime();
      const db = new Date(b.postDate || 0).getTime();
      return sortOrder === "desc" ? db - da : da - db;
    });

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

      {/* Notices & Announcements panel (teacher-style) */}
      <Card className="p-0 ">
        <div
          className={`p-6 rounded-t-lg text-white flex items-center justify-between relative ${
            theme === "dark"
              ? "bg-gradient-to-r from-blue-700 to-indigo-800"
              : "bg-gradient-to-r from-blue-400 to-indigo-500"
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-2xl">🔔</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Notices & Announcements</h3>
              <p className="text-sm opacity-80">
                (Stay updated with the latest information)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              className="relative p-2 rounded-full bg-white/20"
              onClick={() => {
                // focus the notices area; no-op for now but keeps behavior consistent
                setShowSearch(false);
                setShowOptions(false);
              }}
              title="View notices"
            >
              <svg
                className="w-6 h-6 text-white/90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5"
                />
              </svg>
              {announcements.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">
                  {announcements.length}
                </span>
              )}
            </button>

            <button
              className="p-2 rounded-full bg-white/20"
              onClick={() => {
                setShowSearch((v) => !v);
                setShowOptions(false);
              }}
              title="Search notices"
            >
              <svg
                className="w-6 h-6 text-white/90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                />
              </svg>
            </button>
            <button
              onClick={() => {
                setShowOptions((v) => !v);
                setShowSearch(false);
              }}
              title="Options"
              className="p-2 rounded-full bg-white/20"
            >
              <svg
                className="w-6 h-6 text-white/90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Search input overlay */}
          {showSearch && (
            <div ref={searchBoxRef} className="absolute right-4 top-4">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notices..."
                className="w-56 sm:w-72 rounded-md bg-white/90 text-gray-800 placeholder-gray-500 px-3 py-1.5 focus:outline-none shadow"
              />
            </div>
          )}

          {/* Options dropdown */}
          {showOptions && (
            <div
              ref={optionsRef}
              className="absolute right-4 top-14 bg-white text-gray-700 rounded-md shadow w-52 ring-1 ring-black/5"
            >
              <div className="py-1 text-sm">
                <div className="px-3 py-1.5 text-xs uppercase tracking-wide text-gray-500">
                  Sort
                </div>
                <button
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                    sortOrder === "desc" ? "font-semibold text-gray-900" : ""
                  }`}
                  onClick={() => {
                    setSortOrder("desc");
                    setShowOptions(false);
                  }}
                >
                  Newest first
                </button>
                <button
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                    sortOrder === "asc" ? "font-semibold text-gray-900" : ""
                  }`}
                  onClick={() => {
                    setSortOrder("asc");
                    setShowOptions(false);
                  }}
                >
                  Oldest first
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="border-b mb-6">
            <nav className="flex space-x-6 text-sm text-gray-500">
              <div className={`pb-3 border-b-2 border-blue-500 text-blue-600`}>
                Notices ({announcements.length})
              </div>
            </nav>
          </div>

          <div className="min-h-[200px]">
            {announcements.length ? (
              <AnnouncementList announcements={filteredAnnouncements} />
            ) : (
              <EmptyState
                title="No notices available"
                description="Check back later for updates"
              />
            )}
          </div>
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
