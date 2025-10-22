import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getStudentAttendance } from "../../services/attendanceService";
import { getStudentMaterials } from "../../services/materialService";
import AttendanceCard from "../attendance/AttendanceCard";
import MaterialCard from "../materials/MaterialCard";
import AnnouncementList from "../announcements/AnnouncementList";
import { getAnnouncementsForStudent } from "../../services/announcementService";
import { useTheme } from "../../contexts/ThemeContext";
import Card from "../common/Card";
import Loader from "../common/Loader";
import StatsCard from "../common/StatsCard";

const resolveStudentIdentifiers = (user) => {
  if (!user || typeof user !== "object") {
    return { studentId: null, userId: null };
  }

  const studentId =
    user.StudentID ??
    user.studentID ??
    user.studentId ??
    user.Student?.StudentID ??
    user.student?.StudentID ??
    user.Student?.id ??
    user.student?.id ??
    null;

  const userId =
    user.UserID ??
    user.userID ??
    user.userId ??
    user.id ??
    user.User?.UserID ??
    user.User?.id ??
    null;

  return {
    studentId: studentId ?? userId,
    userId,
  };
};

const PieChart = ({
  percent = 90,
  size = 120,
  colors = ["#8B0000", "#28a745"],
}) => {
  const stroke = 40;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle
          r={radius}
          fill="none"
          stroke={colors[0]}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={0}
        />
        <circle
          r={radius}
          fill="none"
          stroke={colors[1]}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          transform={`rotate(-90)`}
        />
        <text x="0" y="6" textAnchor="middle" fontSize="16" fill="#fff">
          {percent}%
        </text>
      </g>
    </svg>
  );
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [attendance, setAttendance] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  // UI state for header actions (search & sort)
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [sortOrder, setSortOrder] = useState("desc");
  const searchInputRef = useRef(null);
  const searchBoxRef = useRef(null);
  const optionsRef = useRef(null);
  const [activeTab, setActiveTab] = useState("notices");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { studentId, userId } = resolveStudentIdentifiers(user);

    if (!studentId && !userId) {
      setAttendance([]);
      setMaterials([]);
      setAnnouncements([]);
      setLoading(false);
      return;
    }

    let isActive = true;

    const fetchData = async () => {
      try {
        const resolvedStudentId = studentId ?? userId;
        const [attendanceData, materialsData, announcementsData] =
          await Promise.all([
            getStudentAttendance(resolvedStudentId),
            getStudentMaterials(resolvedStudentId),
            getAnnouncementsForStudent(resolvedStudentId),
          ]);

        if (!isActive) {
          return;
        }

        const normalizedAttendance = attendanceData.filter((record) => {
          const recordStudentId =
            record.StudentID ??
            record.studentID ??
            record.studentId ??
            record.userId ??
            record.UserID ??
            null;

          if (recordStudentId === null) {
            return true;
          }

          const candidate = String(recordStudentId);
          return (
            candidate === String(resolvedStudentId) ||
            (userId !== null && candidate === String(userId))
          );
        });

        setAttendance(normalizedAttendance);
        setMaterials(materialsData || []);
        setAnnouncements(announcementsData || []);
      } catch (error) {
        console.error("Error fetching student dashboard data:", error);
        if (isActive) {
          setAttendance([]);
          setMaterials([]);
          setAnnouncements([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isActive = false;
    };
  }, [user]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

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

  if (loading) return <Loader className="py-12" />;

  const uniqueCourseIds = new Set();
  const addCourseId = (value) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    uniqueCourseIds.add(String(value));
  };

  attendance.forEach((record) =>
    addCourseId(record.courseId ?? record.CourseID)
  );
  materials.forEach((material) =>
    addCourseId(material.courseId ?? material.CourseID)
  );
  announcements.forEach((announcement) =>
    addCourseId(announcement.courseId ?? announcement.CourseID)
  );

  const totalSubjects = uniqueCourseIds.size;
  const totalAssignments = materials.length;
  const presentCount = attendance.reduce((count, record) => {
    const status = (record.status ?? record.Status ?? "")
      .toString()
      .toLowerCase();
    return status === "present" ? count + 1 : count;
  }, 0);
  const attendanceRate = attendance.length
    ? Math.min(
        100,
        Math.max(0, Math.round((presentCount / attendance.length) * 100))
      )
    : 0;

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

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatsCard
          icon={
            <svg
              className="w-8 h-8"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M3 7h18M6 11h12M10 15h4"
                stroke="#10B981"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="Total Subjects"
          value={totalSubjects}
        />

        <StatsCard
          icon={
            <svg
              className="w-8 h-8"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 20v-8"
                stroke="#10B981"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 12l-4-4-4 4"
                stroke="#10B981"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="Total Assignments"
          value={totalAssignments}
        />

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex items-center justify-center transition-base hover-lift soft-shadow">
          <div className="flex items-center space-x-6">
            <div>
              <PieChart percent={attendanceRate} />
            </div>
            <div>
              <div className="text-sm text-gray-500">Attendance Rate</div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {attendanceRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements panel */}
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
              🔔
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
              className="p-2 rounded-full bg-white/20"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setShowSearch((v) => !v);
                setShowOptions(false);
              }}
              title="Search notices"
            >
              🔍
            </button>
            <button
              className="p-2 rounded-full bg-white/20"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setShowOptions((v) => !v);
                setShowSearch(false);
              }}
              title="Options"
            >
              ⚙️
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
              <button
                onClick={() => setActiveTab("notices")}
                className={`pb-3 ${
                  activeTab === "notices"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Notices ({announcements.length})
              </button>

              <button
                onClick={() => setActiveTab("attachments")}
                className={`pb-3 ${
                  activeTab === "attachments"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Attachments ({materials.length})
              </button>
            </nav>
          </div>

          <div className="min-h-[200px]">
            {activeTab === "notices" ? (
              // Use existing AnnouncementList - it will show EmptyState when announcements are empty
              <AnnouncementList announcements={filteredAnnouncements} />
            ) : (
              <div>
                {materials.length > 0 ? (
                  <div className="space-y-4 stagger-children">
                    {materials.map((m) => (
                      <div
                        key={m.id}
                        className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-4 transition-base hover-lift"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-md font-medium text-gray-900 dark:text-white">
                              {m.title}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {m.description}
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(m.uploadDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <AnnouncementList announcements={[]} />
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Attendance
          </h3>
          <div className="space-y-4">
            {attendance.slice(0, 5).map((record) => (
              <AttendanceCard key={record.id} record={record} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Materials
          </h3>
          <div className="space-y-4">
            {materials.slice(0, 3).map((material) => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
