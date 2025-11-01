// src/components/attendance/QRScanner.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { recordAttendance } from "../../services/attendanceService";
import { getTeacherCourses } from "../../services/courseService";
import Button from "../common/Button";

const QRScanner = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  // Course selection (replaces subject selection)
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // Simple camera preview to match the uploaded UI
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const teacherId =
          user?.teacherId ??
          user?.TeacherId ??
          user?.teacherID ??
          user?.TeacherID ??
          user?.id ??
          user?.Id ??
          user?.userId ??
          user?.userID ??
          user?.UserId ??
          user?.UserID ??
          null;

        const list = teacherId ? await getTeacherCourses(teacherId) : [];
        setCourses(Array.isArray(list) ? list : []);
        setSelectedCourseId("");
      } catch (_) {
        setCourses([]);
      }
    };
    fetchCourses();
  }, [user]);

  const stopCamera = () => {
    const current = streamRef.current;
    if (current && current.getTracks) {
      current.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const path = location?.pathname?.toLowerCase() ?? "";
  const isTeacherAttendanceRoute =
    path.includes("teacher") && path.includes("attendance");

  useEffect(() => {
    if (!isTeacherAttendanceRoute) {
      stopCamera();
      return undefined;
    }

    let cancelled = false;

    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (_) {
        // ignore camera errors for now; UI still renders
      }
    };

    setupCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isTeacherAttendanceRoute]);

  const handleScan = async () => {
    try {
      setStatus("loading");
      await recordAttendance(sessionId, user.id);
      setStatus("success");
      setMessage("Attendance recorded successfully!");
    } catch (error) {
      setStatus("error");
      setMessage("Failed to record attendance");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-indigo-700 dark:text-indigo-300">
        Scan QR Code for Attendance
      </h2>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Select Course (replaces subject) */}
        <div className="relative">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Course</option>
            {courses.map((c) => (
              <option
                key={c.id ?? c.CourseID}
                value={String(c.id ?? c.CourseID)}
              >
                {c.name ?? c.CourseName ?? c.code}
              </option>
            ))}
          </select>
        </div>

        {/* Date Picker */}
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            📅
          </span>
        </div>
      </div>

      {/* Camera preview inside dashed border */}
      <div className="rounded-2xl border-2 border-dashed border-indigo-400/70 p-3">
        <div className="rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 aspect-video flex items-center justify-center">
          <video ref={videoRef} className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button
          onClick={handleScan}
          disabled={status === "loading" || !selectedCourseId}
        >
          {status === "loading" ? "Processing..." : "Simulate Scan"}
        </Button>
        {selectedCourseId === "" && (
          <span className="text-sm text-gray-500">
            Select a course to enable scanning
          </span>
        )}
      </div>

      {status === "success" && (
        <p className="mt-4 text-green-600 dark:text-green-400">{message}</p>
      )}

      {status === "error" && (
        <p className="mt-4 text-red-600 dark:text-red-400">{message}</p>
      )}
    </div>
  );
};

export default QRScanner;
