import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import Card from "../../components/common/Card";
import { getStudentCourses } from "../../services/courseService";

// Placeholder schedules - replace with actual schedule API
const fetchSchedules = async () => {
  await new Promise((r) => setTimeout(r, 300));
  return [
    {
      id: 1,
      courseId: 6,
      subjectId: 3,
      dayOfWeek: 1,
      startTime: "09:00:00",
      endTime: "10:30:00",
      roomNumber: "A-101",
      isRecurring: true,
      courseName: "Mathematics",
      subjectName: "Algebra I",
    },
    {
      id: 2,
      courseId: 7,
      subjectId: 5,
      dayOfWeek: 2,
      startTime: "11:00:00",
      endTime: "12:00:00",
      roomNumber: "B-201",
      isRecurring: true,
      courseName: "Physics",
      subjectName: "Mechanics",
    },
  ];
};

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const formatTime = (t) => {
  if (!t) return "";
  const [hh, mm] = String(t).split(":");
  const hour = Number(hh);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${mm} ${suffix}`;
};

const colors = [
  "indigo",
  "violet",
  "emerald",
  "rose",
  "amber",
  "cyan",
  "fuchsia",
  "orange",
  "blue",
  "teal",
];

const pickColorForCourse = (courseId) => {
  if (courseId == null) return "gray";
  const idx = Math.abs(Number(courseId)) % colors.length;
  return colors[idx];
};

const StudentClassSchedule = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [view, setView] = useState("week");
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({ course: "", subject: "", room: "" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [scheds, studentCourses] = await Promise.all([
          fetchSchedules(),
          getStudentCourses(user?.userID ?? user?.userId ?? user?.id),
        ]);
        if (!mounted) return;
        setSchedules(Array.isArray(scheds) ? scheds : []);
        setCourses(Array.isArray(studentCourses) ? studentCourses : []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [user]);

  const studentCourseIds = useMemo(() => {
    return (courses || []).map((c) => String(c.id ?? c.CourseID ?? c.courseId));
  }, [courses]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const filtered = useMemo(() => {
    return (schedules || []).filter((s) => {
      if (studentCourseIds.length && !studentCourseIds.includes(String(s.courseId))) return false;
      if (filters.course && !String(s.courseName || s.courseId).toLowerCase().includes(filters.course.toLowerCase())) return false;
      if (filters.subject && !String(s.subjectName || s.subjectId).toLowerCase().includes(filters.subject.toLowerCase())) return false;
      if (filters.room && !String(s.roomNumber || "").toLowerCase().includes(filters.room.toLowerCase())) return false;
      return true;
    });
  }, [schedules, studentCourseIds, filters]);

  const groupedByDay = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      const day = item.dayOfWeek;
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(item);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [filtered]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Class Schedule</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">View your weekly class schedule.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === "week" ? "list" : "week")}
            className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors"
          >
            {view === "week" ? "List View" : "Week View"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">Course</label>
          <input
            name="course"
            value={filters.course}
            onChange={handleInput}
            placeholder="Search course"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">Subject</label>
          <input
            name="subject"
            value={filters.subject}
            onChange={handleInput}
            placeholder="Search subject"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">Room</label>
          <input
            name="room"
            value={filters.room}
            onChange={handleInput}
            placeholder="Search room"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <Loader label="Loading schedules" />
      ) : !filtered.length ? (
        <EmptyState title="No schedules" description="No classes found for your courses." />
      ) : view === "list" ? (
        <div className="space-y-4">
          {filtered.map((s) => {
            const color = pickColorForCourse(s.courseId);
            return (
              <Card key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block w-2 h-2 rounded-full bg-${color}-500`} />
                    <h2 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{s.courseName || `Course ${s.courseId}`} / {s.subjectName || `Subject ${s.subjectId}`}</h2>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{dayNames[s.dayOfWeek]} • {formatTime(s.startTime)} – {formatTime(s.endTime)} • Room {s.roomNumber} {s.isRecurring && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase tracking-wide">Recurring</span>}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition">Details</button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="overflow-auto border rounded-md bg-white dark:bg-gray-800 p-4">
          <div className="flex gap-4">
            <div className="w-20 flex-shrink-0">
              <div className="h-8" />
              {(() => {
                const startHour = 7;
                const endHour = 19;
                const hours = [];
                for (let h = startHour; h <= endHour; h++) hours.push(h);
                return (
                  <div className="relative">
                    {hours.map((h) => (
                      <div key={h} className="h-12 text-xs text-gray-500 dark:text-gray-400 flex items-center" style={{ height: `${60}px` }}>{h % 12 === 0 ? 12 : h % 12}:00</div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="flex-1 min-w-[1050px]">
              <div className="grid grid-cols-7 gap-4">
                {[1,2,3,4,5,6,0].map((dayIndex) => {
                  const dayName = dayNames[dayIndex];
                  const dayItems = groupedByDay.get(dayIndex) || [];

                  const parseMinutes = (t) => {
                    if (!t) return 0;
                    const parts = String(t).split(":");
                    const hh = Number(parts[0] || 0);
                    const mm = Number(parts[1] || 0);
                    return hh * 60 + mm;
                  };

                  const startHour = 7;
                  const endHour = 19;
                  const totalMinutes = (endHour - startHour) * 60;
                  const minuteHeight = 1;
                  const containerHeight = totalMinutes * minuteHeight;

                  const items = dayItems.map((it) => {
                    const s = parseMinutes(it.startTime);
                    const e = parseMinutes(it.endTime);
                    return { ...it, startMin: s, endMin: e };
                  });

                  const columns = [];
                  const placed = items.map((ev) => ({ ...ev, col: 0 }));
                  placed.sort((a, b) => a.startMin - b.startMin);
                  for (const ev of placed) {
                    let placedCol = -1;
                    for (let c = 0; c < columns.length; c++) {
                      if (columns[c] <= ev.startMin) {
                        placedCol = c;
                        columns[c] = ev.endMin;
                        break;
                      }
                    }
                    if (placedCol === -1) {
                      columns.push(ev.endMin);
                      placedCol = columns.length - 1;
                    }
                    ev.col = placedCol;
                  }

                  const colCount = Math.max(1, columns.length);

                  const colorMap = {
                    indigo: "#6366f1",
                    violet: "#7c3aed",
                    emerald: "#10b981",
                    rose: "#f43f5e",
                    amber: "#f59e0b",
                    cyan: "#06b6d4",
                    fuchsia: "#d946ef",
                    orange: "#f97316",
                    blue: "#3b82f6",
                    teal: "#14b8a6",
                    gray: "#9ca3af",
                  };

                  const getColor = (courseId) => {
                    const name = pickColorForCourse(courseId);
                    return colorMap[name] || colorMap.gray;
                  };

                  return (
                    <div key={dayName} className="flex flex-col">
                      <div className="mb-2 font-medium text-sm text-gray-700 dark:text-gray-200">{dayName}</div>
                      <div className="relative rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800" style={{ height: containerHeight }}>
                        {Array.from({ length: endHour - startHour }).map((_, i) => (
                          <div key={i} className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-700" style={{ top: `${i * 60 * minuteHeight}px` }} />
                        ))}

                        {placed.map((s) => {
                          const top = Math.max(0, (s.startMin - startHour * 60) * minuteHeight);
                          const height = Math.max(28, Math.max(15, s.endMin - s.startMin) * minuteHeight);
                          const widthPercent = 100 / colCount;
                          const leftPercent = s.col * widthPercent;
                          const primary = getColor(s.courseId);
                          const gradient = `linear-gradient(135deg, ${primary}20, ${primary}10)`;
                          return (
                            <div key={s.id} className="absolute rounded-lg p-2 shadow-md cursor-pointer overflow-hidden" style={{ top: `${top}px`, height: `${height}px`, left: `${leftPercent}%`, width: `calc(${widthPercent}% - 6px)`, marginLeft: "3px", marginRight: "3px", background: gradient, borderLeft: `4px solid ${primary}` }} title={`${s.courseName} • ${s.subjectName} • ${formatTime(s.startTime)} - ${formatTime(s.endTime)}`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{s.courseName || `Course ${s.courseId}`}</div>
                                  <div className="text-[11px] text-gray-600 dark:text-gray-300 truncate">{s.subjectName || `Subject ${s.subjectId}`}</div>
                                </div>
                                <div className="text-[11px] text-gray-700 dark:text-gray-200 ml-2">{formatTime(s.startTime)}</div>
                              </div>
                              <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">Room {s.roomNumber}</div>
                            </div>
                          );
                        })}

                        {placed.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">No classes</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentClassSchedule;
