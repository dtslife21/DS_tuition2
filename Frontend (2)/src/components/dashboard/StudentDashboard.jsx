import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getCourseAttendance } from "../../services/attendanceService";
import { getCourseMaterials } from "../../services/materialService";
import AttendanceCard from "../attendance/AttendanceCard";
import MaterialCard from "../materials/MaterialCard";
import AnnouncementList from "../announcements/AnnouncementList";
import { getCourseAnnouncements } from "../../services/announcementService";
import { useTheme } from "../../contexts/ThemeContext";
import Card from "../common/Card";
import Loader from "../common/Loader";
import AnnouncementCard from "../announcements/AnnouncementCard";
import StatsCard from "../common/StatsCard";



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
  const [activeTab, setActiveTab] = useState("notices");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // For demo purposes, we'll use courseId 1
        const [attendanceData, materialsData, announcementsData] =
          await Promise.all([
            getCourseAttendance(1),
            getCourseMaterials(1),
            getCourseAnnouncements(1),
          ]);

        setAttendance(attendanceData.filter((a) => a.studentId === user.id));
        setMaterials(materialsData);
        setAnnouncements(announcementsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

  if (loading) 
    return <Loader className="py-12" />;

  // Demo values for stats that aren't available from API
  const totalSubjects = 1;
  const totalAssignments = 15;
  const attendanceRate =
    Math.round(
      (attendance.length / Math.max(1, attendance.length + 1)) * 100
    ) || 85;

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

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex items-center justify-center">
          <div className="flex items-center space-x-6">
            <div>
              <PieChart percent={90} />
            </div>
            <div>
              <div className="text-sm text-gray-500">Attendance Rate</div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                90%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements panel */}
      <Card className="p-0">
        <div
          className={`p-6 rounded-t-lg text-white flex items-center justify-between ${
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
            <button className="p-2 rounded-full bg-white/20">🔍</button>
            <button className="p-2 rounded-full bg-white/20">⚙️</button>
          </div>
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
              <AnnouncementList announcements={announcements} />
            ) : (
              <div>
                {materials.length > 0 ? (
                  <div className="space-y-4">
                    {materials.map((m) => (
                      <div
                        key={m.id}
                        className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-4"
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
