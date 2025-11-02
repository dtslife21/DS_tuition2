// src/components/attendance/QRScanner.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { recordAttendance } from "../../services/attendanceService";
import {
  getTeacherCourses,
  getTeacherCourseStudents,
} from "../../services/courseService";
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
  const [courseStudents, setCourseStudents] = useState([]);
  const [rosterStatus, setRosterStatus] = useState("idle");
  const [rosterError, setRosterError] = useState("");

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

  useEffect(() => {
    if (!teacherId || !selectedCourseId) {
      setCourseStudents([]);
      setRosterStatus("idle");
      setRosterError("");
      return;
    }

    let cancelled = false;
    setRosterStatus("loading");
    setRosterError("");
    setCourseStudents([]);

    const loadRoster = async () => {
      try {
        const { students } = await getTeacherCourseStudents(
          teacherId,
          selectedCourseId
        );
        if (cancelled) {
          return;
        }
        const list = Array.isArray(students) ? students : [];
        setCourseStudents(list);
        setRosterStatus("success");
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to fetch course roster", error);
        setCourseStudents([]);
        setRosterStatus("error");
        setRosterError(
          "Unable to load enrolled students. Scanning is disabled for this course."
        );
      }
    };

    loadRoster();

    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, teacherId]);

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

  const rosterReady = rosterStatus === "success";
  const canScan =
    isTeacherAttendanceRoute && Boolean(selectedCourseId) && rosterReady;

  const resolveAttendanceDate = useCallback(() => {
    if (selectedDate) {
      const now = new Date();
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts.map((part) => Number(part));
        if (
          Number.isFinite(year) &&
          Number.isFinite(month) &&
          Number.isFinite(day)
        ) {
          const parsed = new Date(now);
          parsed.setFullYear(year, month - 1, day);
          if (!Number.isNaN(parsed.getTime())) {
            return {
              iso: parsed.toISOString(),
              display: selectedDate,
            };
          }
        }
      }

      const parsed = new Date(`${selectedDate}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        // fallback to midnight if time merge failed
        return {
          iso: parsed.toISOString(),
          display: selectedDate,
        };
      }
    }

    const now = new Date();
    const fallbackDisplay = now.toISOString().split("T")[0];
    return {
      iso: now.toISOString(),
      display: fallbackDisplay,
    };
  }, [selectedDate]);

  const playBeep = useCallback(
    (times = 1, freq = 950, duration = 0.18, gap = 0.12) => {
      try {
        if (typeof window === "undefined") return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;

        // resume if suspended (some browsers block until user interaction)
        if (ctx.state === "suspended" && typeof ctx.resume === "function") {
          ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        for (let i = 0; i < times; i++) {
          const start = now + i * (duration + gap);
          const stop = start + duration;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.value = 0.06;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(stop);
          // cleanup after the tone finishes
          setTimeout(() => {
            try {
              osc.disconnect();
              gain.disconnect();
            } catch (_) {}
          }, (i * (duration + gap) + duration + 0.1) * 1000);
        }
      } catch (_) {
        // ignore audio errors
      }
    },
    []
  );

  const enrolledStudentIds = useMemo(() => {
    if (!Array.isArray(courseStudents) || courseStudents.length === 0) {
      return new Set();
    }

    const ids = courseStudents
      .map((student) => {
        if (!student || typeof student !== "object") {
          return null;
        }
        const identifier =
          student.studentId ??
          student.StudentID ??
          student.id ??
          student.Id ??
          student.userId ??
          student.UserID ??
          null;

        if (identifier === undefined || identifier === null) {
          return null;
        }

        const text = String(identifier).trim();
        return text.length ? text : null;
      })
      .filter(Boolean);

    return new Set(ids);
  }, [courseStudents]);

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

      if (!rosterReady) {
        const pendingMessage =
          rosterStatus === "loading"
            ? "Student roster is still loading."
            : "Student roster unavailable.";
        setStatus("error");
        setMessage(pendingMessage);
        setScanError(
          rosterStatus === "loading"
            ? "Please wait for the enrolled student list to finish loading before scanning."
            : rosterError ||
                "Unable to verify the enrolled students for this course."
        );
        return;
      }

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
      const attendanceIso = attendanceDate.iso;
      const attendanceDisplay = attendanceDate.display;

      const enrollmentKey = String(resolvedStudentId).trim();
      if (!enrollmentKey || !enrolledStudentIds.has(enrollmentKey)) {
        setStatus("error");
        setMessage("Student is not enrolled in the selected course.");
        setScanError(
          "This QR belongs to a student who is not registered for the selected course."
        );
        // double beep to indicate mismatch (not enrolled)
        try {
          playBeep(2, 700, 0.14, 0.12);
        } catch (_) {}
        return;
      }

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
          date: attendanceIso,
          attendanceDate: attendanceDisplay,
          status: payload.status ?? "Present",
        });

        setStatus("success");
        // play a short beep to indicate successful scan
        playBeep(1, 950, 0.18, 0.12);
        setLastRecord({
          ...record,
          attendanceDate:
            record?.attendanceDate ??
            record?.AttendanceDate ??
            attendanceDisplay,
        });
        const displayName =
          resolvedName ||
          record?.studentName ||
          record?.StudentName ||
          String(resolvedStudentId);
        const dateText = attendanceDisplay ? ` on ${attendanceDisplay}` : "";
        setMessage(`Attendance recorded for ${displayName}${dateText}.`);
      } catch (error) {
        console.error("Failed to record attendance", error);
        setStatus("error");
        setMessage("Failed to record attendance. Please try again.");
        setScanError(
          "Recording attendance failed. Check your connection and retry."
        );
      }
    },
    [
      enrolledStudentIds,
      resolveAttendanceDate,
      rosterReady,
      rosterStatus,
      rosterError,
      selectedCourseId,
      sessionId,
      stopCamera,
      teacherId,
    ]
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

          if (err) {
            const ignorable = new Set([
              "NotFoundException",
              "ChecksumException",
              "FormatException",
              "ChecksumError",
              "FormatError",
            ]);

            if (!ignorable.has(err.name)) {
              setScanError(
                "Unable to read QR code. Hold steady and try again."
              );
            } else {
              setScanError("");
            }
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
      lastRecord.attendanceDate ??
      lastRecord.AttendanceDate ??
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
        {selectedCourseId !== "" && rosterStatus === "loading" && (
          <span className="text-sm text-gray-500">
            Loading enrolled students...
          </span>
        )}
        {selectedCourseId !== "" && rosterStatus === "error" && (
          <span className="text-sm text-red-500">{rosterError}</span>
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
