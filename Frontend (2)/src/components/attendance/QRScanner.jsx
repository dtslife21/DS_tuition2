// src/components/attendance/QRScanner.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
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
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const audioCtxRef = useRef(null);

  const [scanError, setScanError] = useState("");
  const [lastRecord, setLastRecord] = useState(null);
  const [scanIteration, setScanIteration] = useState(0);

  const teacherId = useMemo(() => {
    return (
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
      null
    );
  }, [user]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const list = teacherId ? await getTeacherCourses(teacherId) : [];
        setCourses(Array.isArray(list) ? list : []);
        setSelectedCourseId("");
      } catch (_) {
        setCourses([]);
      }
    };
    fetchCourses();
  }, [teacherId]);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (_) {
        // ignore stop errors
      }
      controlsRef.current = null;
    }

    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (_) {
        // ignore reset errors
      }
      readerRef.current = null;
    }

    const video = videoRef.current;
    if (video && video.srcObject) {
      const tracks =
        typeof video.srcObject.getTracks === "function"
          ? video.srcObject.getTracks()
          : [];
      tracks.forEach((track) => {
        try {
          track.stop();
        } catch (_) {
          // ignore stop errors
        }
      });
      video.srcObject = null;
    }
  }, []);

  const path = location?.pathname?.toLowerCase() ?? "";
  const isTeacherAttendanceRoute =
    path.includes("teacher") && path.includes("attendance");

  const canScan = isTeacherAttendanceRoute && Boolean(selectedCourseId);

  const resolveAttendanceDate = useCallback(() => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    return new Date().toISOString();
  }, [selectedDate]);

  const handleDecoded = useCallback(
    async (rawText) => {
      if (!rawText) {
        setStatus("error");
        setMessage("Empty QR result. Please try again.");
        setScanError("QR code did not contain any data.");
        return;
      }

      stopCamera();
      setStatus("loading");
      setMessage("");
      setScanError("");
      setLastRecord(null);

      let parsed = null;
      try {
        parsed = JSON.parse(rawText);
      } catch (_) {
        parsed = rawText;
      }

      const payload = parsed && typeof parsed === "object" ? parsed : {};

      const qrType =
        payload.type ??
        payload.Type ??
        payload.qrType ??
        payload.QRType ??
        null;

      if (qrType && String(qrType).toLowerCase() !== "student-attendance") {
        setStatus("error");
        setMessage("This QR code is not a student attendance code.");
        setScanError(
          "Present a student attendance QR generated from the student portal."
        );
        return;
      }

      const resolvedStudentId = (() => {
        if (payload && typeof payload === "object") {
          return (
            payload.studentId ??
            payload.StudentID ??
            payload.studentID ??
            payload.id ??
            payload.Id ??
            payload.userId ??
            payload.UserID ??
            null
          );
        }

        if (typeof parsed === "string") {
          const trimmed = parsed.trim();
          if (!trimmed.length) {
            return null;
          }
          if (trimmed.startsWith("STD-")) {
            const parts = trimmed.split("-");
            return parts.length >= 2 ? parts[1] : trimmed;
          }
          return trimmed;
        }

        return null;
      })();

      if (!resolvedStudentId) {
        setStatus("error");
        setMessage("Invalid student QR code detected.");
        setScanError(
          "Could not extract student information from this QR code."
        );
        return;
      }

      const resolvedCourseId =
        selectedCourseId ||
        payload.courseId ||
        payload.CourseID ||
        payload.courseID ||
        null;

      if (!resolvedCourseId) {
        setStatus("error");
        setMessage("Select a course before scanning student QR codes.");
        setScanError("Course selection is required to record attendance.");
        return;
      }

      const resolvedName =
        payload.name ??
        payload.studentName ??
        payload.StudentName ??
        payload.fullName ??
        payload.FullName ??
        "";

      const attendanceDate = resolveAttendanceDate();

      try {
        const record = await recordAttendance({
          sessionId:
            sessionId ??
            payload.sessionId ??
            payload.sessionID ??
            payload.SessionID ??
            null,
          studentId: resolvedStudentId,
          courseId: resolvedCourseId,
          teacherId,
          date: attendanceDate,
          status: payload.status ?? "Present",
        });

        setStatus("success");
        // play a short beep to indicate successful scan
        try {
          if (typeof window !== "undefined") {
            const AudioContext =
              window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
              if (!audioCtxRef.current)
                audioCtxRef.current = new AudioContext();
              const ctx = audioCtxRef.current;
              // try to resume context if suspended (some browsers require a user gesture)
              if (
                ctx.state === "suspended" &&
                typeof ctx.resume === "function"
              ) {
                ctx.resume().catch(() => {});
              }
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = "sine";
              osc.frequency.value = 950;
              gain.gain.value = 0.06;
              osc.connect(gain);
              gain.connect(ctx.destination);
              const now = ctx.currentTime;
              osc.start(now);
              osc.stop(now + 0.18);
              // cleanup
              setTimeout(() => {
                try {
                  osc.disconnect();
                  gain.disconnect();
                } catch (_) {}
              }, 500);
            }
          }
        } catch (e) {
          // ignore audio errors
        }
        setLastRecord(record);
        const displayName =
          resolvedName ||
          record?.studentName ||
          record?.StudentName ||
          String(resolvedStudentId);
        setMessage(`Attendance recorded for ${displayName}.`);
      } catch (error) {
        console.error("Failed to record attendance", error);
        setStatus("error");
        setMessage("Failed to record attendance. Please try again.");
        setScanError(
          "Recording attendance failed. Check your connection and retry."
        );
      }
    },
    [resolveAttendanceDate, selectedCourseId, sessionId, stopCamera, teacherId]
  );

  useEffect(() => {
    if (!canScan) {
      stopCamera();
      if (!selectedCourseId || !isTeacherAttendanceRoute) {
        setStatus("idle");
        setMessage("");
        setScanError("");
        setLastRecord(null);
      }
      return undefined;
    }

    let cancelled = false;
    const videoElement = videoRef.current;

    if (!videoElement) {
      return undefined;
    }

    setStatus("scanning");
    setMessage("");
    setScanError("");
    setLastRecord(null);

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(
        undefined,
        videoElement,
        (result, err, controls) => {
          if (cancelled) {
            try {
              controls?.stop();
            } catch (_) {
              // ignore stop errors when cancelled
            }
            return;
          }

          if (result) {
            controlsRef.current = controls;
            handleDecoded(result.getText());
            return;
          }

          if (err && err.name !== "NotFoundException") {
            setScanError("Unable to read QR code. Hold steady and try again.");
          }
        }
      )
      .then((controls) => {
        if (cancelled) {
          try {
            controls?.stop();
          } catch (_) {
            // ignore stop errors when cancelled
          }
          return;
        }
        controlsRef.current = controls;
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error("Failed to access camera", error);
        setStatus("error");
        setMessage(
          "Camera access failed. Check browser permissions and retry."
        );
        setScanError(error?.message ?? "Camera access was blocked.");
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [
    canScan,
    handleDecoded,
    isTeacherAttendanceRoute,
    scanIteration,
    selectedCourseId,
    stopCamera,
  ]);

  const restartScanner = useCallback(() => {
    setMessage("");
    setScanError("");
    setLastRecord(null);
    setScanIteration((value) => value + 1);
  }, []);

  const actionButtonLabel = (() => {
    if (!canScan) {
      return "Start Scanning";
    }
    if (status === "scanning") {
      return "Scanning...";
    }
    if (status === "loading") {
      return "Recording...";
    }
    if (status === "success") {
      return "Scan Next Student";
    }
    if (status === "error") {
      return "Retry Scan";
    }
    return "Start Scanning";
  })();

  const lastRecordInfo = useMemo(() => {
    if (!lastRecord) {
      return null;
    }

    const studentLabel =
      lastRecord.studentId ??
      lastRecord.StudentID ??
      lastRecord.userId ??
      lastRecord.UserID ??
      "";

    const recordDate =
      lastRecord.date ??
      lastRecord.Date ??
      lastRecord.recordedAt ??
      lastRecord.RecordedAt ??
      lastRecord.scanTime ??
      lastRecord.scan_time ??
      null;

    const courseLabel =
      lastRecord.courseId ?? lastRecord.CourseID ?? lastRecord.courseID ?? "";

    return { studentLabel, recordDate, courseLabel };
  }, [lastRecord]);

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
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            autoPlay
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button
          onClick={restartScanner}
          disabled={!canScan || status === "scanning" || status === "loading"}
        >
          {actionButtonLabel}
        </Button>
        {selectedCourseId === "" && (
          <span className="text-sm text-gray-500">
            Select a course to enable scanning
          </span>
        )}
      </div>

      {message && (
        <p
          className={`mt-4 ${
            status === "success"
              ? "text-green-600 dark:text-green-400"
              : status === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {message}
        </p>
      )}

      {scanError && (
        <p className="mt-2 text-sm text-red-500 dark:text-red-400">
          {scanError}
        </p>
      )}

      {lastRecordInfo && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Last scan:{" "}
            <span className="font-medium">
              {lastRecordInfo.studentLabel || "Unknown"}
            </span>
          </p>
          {lastRecordInfo.recordDate && (
            <p>
              Recorded at:{" "}
              <span className="font-medium">
                {new Date(lastRecordInfo.recordDate).toLocaleString()}
              </span>
            </p>
          )}
          {lastRecordInfo.courseLabel && (
            <p>
              Course:{" "}
              <span className="font-medium">{lastRecordInfo.courseLabel}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default QRScanner;
