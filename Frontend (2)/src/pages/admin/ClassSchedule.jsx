import React, { useEffect, useMemo, useState } from "react";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import Card from "../../components/common/Card";
import { getAllCourses } from "../../services/courseService";
import { getAllSubjects } from "../../services/subjectService";

// Placeholder fetch; replace with real API integration
const fetchSchedules = async () => {
  await new Promise((r) => setTimeout(r, 400));
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
      courseId: 6,
      subjectId: 3,
      dayOfWeek: 2,
      startTime: "09:00:00",
      endTime: "10:30:00",
      roomNumber: "A-102",
      isRecurring: true,
      courseName: "Mathematics",
      subjectName: "Algebra I",
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
  const [hh, mm] = t.split(":");
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

const AdminClassSchedule = () => {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [view, setView] = useState("week");
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ course: "", subject: "", room: "" });
  const [coursesList, setCoursesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [formCourseId, setFormCourseId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formDayOfWeek, setFormDayOfWeek] = useState(1);
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formRoomNumber, setFormRoomNumber] = useState("");
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchSchedules().then((data) => {
      if (mounted) {
        setSchedules(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    });
    // load courses & subjects for the create modal
    (async () => {
      try {
        const [courses, subjects] = await Promise.all([
          getAllCourses(),
          getAllSubjects(),
        ]);
        if (!mounted) return;
        setCoursesList(courses || []);
        setSubjectsList(subjects || []);
      } catch (err) {
        console.error("Failed to load courses or subjects", err);
      }
    })();
    return () => (mounted = false);
  }, []);

  // validate live and set validity flag
  useEffect(() => {
    const ok = validateForm();
    setIsFormValid(ok);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formCourseId, formSubjectId, formStartTime, formEndTime, formRoomNumber]);

  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      if (
        filters.course &&
        !String(s.courseName || s.courseId)
          .toLowerCase()
          .includes(filters.course.toLowerCase())
      )
        return false;
      if (
        filters.subject &&
        !String(s.subjectName || s.subjectId)
          .toLowerCase()
          .includes(filters.subject.toLowerCase())
      )
        return false;
      if (
        filters.room &&
        !String(s.roomNumber).toLowerCase().includes(filters.room.toLowerCase())
      )
        return false;
      return true;
    });
  }, [schedules, filters]);

  const groupedByDay = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      const day = item.dayOfWeek;
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(item);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [filtered]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  useEffect(() => {
    // reset form fields when opening modal
    if (!showCreate) return;
    setFormCourseId("");
    setFormSubjectId("");
    setFormDayOfWeek(1);
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setFormRoomNumber("");
    setFormIsRecurring(false);
    setFormErrors({});
  }, [showCreate]);

  const validateForm = () => {
    const errors = {};
    if (!formCourseId) errors.courseId = "Please select a course.";
    if (!formSubjectId) errors.subjectId = "Please select a subject.";
    if (!formStartTime) errors.startTime = "Start time is required.";
    if (!formEndTime) errors.endTime = "End time is required.";
    if (formStartTime && formEndTime) {
      const [sh, sm] = String(formStartTime).split(":").map(Number);
      const [eh, em] = String(formEndTime).split(":").map(Number);
      const startMin = sh * 60 + (sm || 0);
      const endMin = eh * 60 + (em || 0);
      if (endMin <= startMin)
        errors.timeOrder = "End time must be after start time.";
    }
    if (!formRoomNumber || !String(formRoomNumber).trim())
      errors.roomNumber = "Room is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    // when course changes, if there's exactly one matching subject, preselect it
    if (!formCourseId) return;
    const cid = String(formCourseId);
    const filtered = (subjectsList || []).filter((s) => {
      const ids = (s.courseIds || s.CourseIDs || s.courseIds || []).map((x) =>
        String(x)
      );
      return ids.length ? ids.includes(cid) : true;
    });
    if (filtered.length === 1) setFormSubjectId(String(filtered[0].id));
  }, [formCourseId, subjectsList]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Class Schedule
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View and manage weekly class times.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === "week" ? "list" : "week")}
            className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors"
          >
            {view === "week" ? "List View" : "Week View"}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors"
          >
            Add Schedule
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
            Course
          </label>
          <input
            name="course"
            value={filters.course}
            onChange={handleInput}
            placeholder="Search course"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
            Subject
          </label>
          <input
            name="subject"
            value={filters.subject}
            onChange={handleInput}
            placeholder="Search subject"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
            Room
          </label>
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
        <EmptyState
          title="No schedules"
          description="Try adjusting filters or add a new schedule."
        />
      ) : view === "list" ? (
        <div className="space-y-4">
          {filtered.map((s) => {
            const color = pickColorForCourse(s.courseId);
            return (
              <Card
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block w-2 h-2 rounded-full bg-${color}-500`}
                    ></span>
                    <h2 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {s.courseName || `Course ${s.courseId}`} /{" "}
                      {s.subjectName || `Subject ${s.subjectId}`}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {dayNames[s.dayOfWeek]} • {formatTime(s.startTime)} –{" "}
                    {formatTime(s.endTime)} • Room {s.roomNumber}
                    {s.isRecurring && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        Recurring
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition">
                    Edit
                  </button>
                  <button className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-800 transition">
                    Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        // Enhanced week view with time axis and positioned blocks
        <div className="overflow-auto border rounded-md bg-white dark:bg-gray-800 p-4">
          <div className="flex gap-4">
            {/* Time axis */}
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
                      <div
                        key={h}
                        className="h-12 text-xs text-gray-500 dark:text-gray-400 flex items-center"
                        style={{ height: `${60}px` }}
                      >
                        {h % 12 === 0 ? 12 : h % 12}:00
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Days columns */}
            <div className="flex-1 min-w-[1050px]">
              <div className="grid grid-cols-7 gap-4">
                {/* iterate Monday -> Sunday using index order [1..6,0] */}
                {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                  const dayName = dayNames[dayIndex];
                  const dayItems = groupedByDay.get(dayIndex) || [];

                  // layout computation: convert times to minutes and assign columns for overlaps
                  const parseMinutes = (t) => {
                    if (!t) return 0;
                    const [hh, mm] = t.split(":");
                    return Number(hh) * 60 + Number(mm);
                  };

                  const startHour = 7;
                  const endHour = 19;
                  const totalMinutes = (endHour - startHour) * 60;
                  const minuteHeight = 1; // px per minute
                  const containerHeight = totalMinutes * minuteHeight; // px

                  // prepare events with minutes
                  const items = dayItems.map((it) => {
                    const s = parseMinutes(it.startTime);
                    const e = parseMinutes(it.endTime);
                    return { ...it, startMin: s, endMin: e };
                  });

                  // assign columns greedily
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
                      <div className="mb-2 font-medium text-sm text-gray-700 dark:text-gray-200">
                        {dayName}
                      </div>
                      <div
                        className="relative rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"
                        style={{ height: containerHeight }}
                      >
                        {/* hour separators */}
                        {Array.from({ length: endHour - startHour }).map(
                          (_, i) => (
                            <div
                              key={i}
                              className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-700"
                              style={{ top: `${i * 60 * minuteHeight}px` }}
                            />
                          )
                        )}

                        {placed.map((s) => {
                          const top = Math.max(
                            0,
                            (s.startMin - startHour * 60) * minuteHeight
                          );
                          const height = Math.max(
                            28,
                            Math.max(15, s.endMin - s.startMin) * minuteHeight
                          );
                          const widthPercent = 100 / colCount;
                          const leftPercent = s.col * widthPercent;
                          const primary = getColor(s.courseId);
                          const gradient = `linear-gradient(135deg, ${primary}20, ${primary}10)`; // translucent gradient
                          return (
                            <div
                              key={s.id}
                              className="absolute rounded-lg p-2 shadow-md cursor-pointer overflow-hidden"
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                left: `${leftPercent}%`,
                                width: `calc(${widthPercent}% - 6px)`,
                                marginLeft: "3px",
                                marginRight: "3px",
                                background: gradient,
                                borderLeft: `4px solid ${primary}`,
                              }}
                              title={`${s.courseName} • ${
                                s.subjectName
                              } • ${formatTime(s.startTime)} - ${formatTime(
                                s.endTime
                              )}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                                    {s.courseName || `Course ${s.courseId}`}
                                  </div>
                                  <div className="text-[11px] text-gray-600 dark:text-gray-300 truncate">
                                    {s.subjectName || `Subject ${s.subjectId}`}
                                  </div>
                                </div>
                                <div className="text-[11px] text-gray-700 dark:text-gray-200 ml-2">
                                  {formatTime(s.startTime)}
                                </div>
                              </div>
                              <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">
                                Room {s.roomNumber}
                              </div>
                            </div>
                          );
                        })}

                        {placed.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                            No classes
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Schedule"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // validate before proceeding
            if (!validateForm()) return;
            const form = new FormData(e.currentTarget);
            const payload = Object.fromEntries(form.entries());

            const selectedCourse = (coursesList || []).find(
              (c) =>
                String(c.id ?? c.CourseID ?? c.CourseId ?? c.courseId) ===
                String(payload.courseId)
            );
            const selectedSubject = (subjectsList || []).find(
              (s) => String(s.id) === String(payload.subjectId)
            );

            const newItem = {
              id: Date.now(),
              courseId: payload.courseId
                ? Number(payload.courseId)
                : payload.courseId || null,
              subjectId: payload.subjectId || null,
              courseName:
                selectedCourse?.name ||
                payload.courseName ||
                String(payload.courseId || ""),
              subjectName:
                selectedSubject?.name ||
                payload.subjectName ||
                String(payload.subjectId || ""),
              dayOfWeek: Number(payload.dayOfWeek) || 1,
              startTime: payload.startTime || "09:00:00",
              endTime: payload.endTime || "10:00:00",
              roomNumber: payload.roomNumber || "TBD",
              isRecurring: !!payload.isRecurring,
            };
            setSchedules((list) => [...list, newItem]);
            setShowCreate(false);
          }}
          className="space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
                Course
              </label>
              <select
                name="courseId"
                value={formCourseId}
                onChange={(e) => {
                  setFormCourseId(e.target.value);
                  setFormSubjectId("");
                }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm"
              >
                <option value="">-- Select course --</option>
                {coursesList.map((c) => (
                  <option
                    key={String(c.id || c.CourseID || c.CourseId || c.courseId)}
                    value={String(
                      c.id ?? c.CourseID ?? c.CourseId ?? c.courseId
                    )}
                  >
                    {c.name || c.CourseName || c.title || c.courseName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
                Subject
              </label>
              <select
                name="subjectId"
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm"
              >
                <option value="">-- Select subject --</option>
                {(subjectsList || [])
                  .filter((s) => {
                    if (!formCourseId) return true;
                    const cid = String(formCourseId);
                    const ids = (
                      s.courseIds ||
                      s.CourseIDs ||
                      s.courseIds ||
                      []
                    ).map((x) => String(x));
                    // allow subjects that list the selected course or those that have no course restriction
                    return ids.length ? ids.includes(cid) : true;
                  })
                  .map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
                Day Of Week
              </label>
              <select
                name="dayOfWeek"
                value={formDayOfWeek}
                onChange={(e) => setFormDayOfWeek(Number(e.target.value))}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm"
              >
                {dayNames.map((d, i) => (
                  <option value={i} key={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
                Room
              </label>
              <input
                name="roomNumber"
                value={formRoomNumber}
                onChange={(e) => setFormRoomNumber(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm"
              />
              {formErrors.roomNumber && (
                <div className="text-xs text-red-500 mt-1">
                  {formErrors.roomNumber}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
                Start Time
              </label>
              <input
                type="time"
                name="startTime"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm"
              />
              {formErrors.startTime && (
                <div className="text-xs text-red-500 mt-1">
                  {formErrors.startTime}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium mb-1 text-gray-500 uppercase tracking-wide">
                End Time
              </label>
              <input
                type="time"
                name="endTime"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm"
              />
              {formErrors.endTime && (
                <div className="text-xs text-red-500 mt-1">
                  {formErrors.endTime}
                </div>
              )}
              {formErrors.timeOrder && (
                <div className="text-xs text-red-500 mt-1">
                  {formErrors.timeOrder}
                </div>
              )}
            </div>
            <div className="flex flex-row items-center gap-2">
              <input
                type="checkbox"
                id="isRecurring"
                name="isRecurring"
                checked={formIsRecurring}
                onChange={(e) => setFormIsRecurring(!!e.target.checked)}
                className="h-4 w-4"
              />
              <label
                htmlFor="isRecurring"
                className="text-xs font-medium text-gray-600 dark:text-gray-300"
              >
                Recurring weekly
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white shadow transition ${
                isFormValid
                  ? "bg-indigo-600 hover:bg-indigo-500"
                  : "bg-indigo-300 cursor-not-allowed"
              }`}
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminClassSchedule;
