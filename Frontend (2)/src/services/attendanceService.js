import axios from "axios";
import { mockAttendance } from "../utils/mockData";

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeStatus = (value) => {
  if (value === undefined || value === null) {
    return "Present";
  }

  const text = String(value).toLowerCase();

  if (text === "present" || text === "p") {
    return "Present";
  }

  if (text === "absent" || text === "a" || text === "0") {
    return "Absent";
  }

  if (text === "late" || text === "l") {
    return "Late";
  }

  return String(value);
};

const normalizeDate = (value) => {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
};

const normalizeAttendanceRecord = (record) => {
  if (!record || typeof record !== "object") {
    return null;
  }

  const student =
    record.Student ||
    record.student ||
    record.StudentDetails ||
    record.studentDetails ||
    {};

  const course =
    record.Course ||
    record.course ||
    record.CourseDetails ||
    record.courseDetails ||
    {};

  const resolvedId =
    record.AttendanceID ??
    record.attendanceID ??
    record.AttendanceId ??
    record.attendanceId ??
    record.AttendanceRecordID ??
    record.attendanceRecordId ??
    record.id ??
    null;

  const courseId =
    record.CourseID ??
    record.courseID ??
    record.courseId ??
    record.CourseId ??
    course.CourseID ??
    course.courseID ??
    course.courseId ??
    course.id ??
    null;

  const studentId =
    record.StudentID ??
    record.studentID ??
    record.studentId ??
    record.StudentId ??
    student.StudentID ??
    student.studentID ??
    student.studentId ??
    student.id ??
    null;

  const status = normalizeStatus(
    record.Status ??
      record.status ??
      record.AttendanceStatus ??
      record.attendanceStatus ??
      (record.isPresent === false
        ? "Absent"
        : record.isPresent === true
        ? "Present"
        : undefined)
  );

  const date = normalizeDate(
    record.Date ??
      record.date ??
      record.AttendanceDate ??
      record.attendanceDate ??
      record.SessionDate ??
      record.sessionDate ??
      record.RecordedAt ??
      record.recordedAt ??
      record.CreatedAt ??
      record.createdAt ??
      record.timestamp
  );

  const sessionId =
    record.SessionID ??
    record.sessionID ??
    record.SessionId ??
    record.sessionId ??
    record.Session?.SessionID ??
    record.session?.sessionId ??
    null;

  const normalized = {
    id:
      resolvedId ??
      `${courseId ?? "course"}-${studentId ?? "student"}-${date ?? Date.now()}`,
    attendanceId: resolvedId ?? null,
    AttendanceID: resolvedId ?? null,
    courseId,
    CourseID: courseId,
    studentId,
    StudentID: studentId,
    status,
    Status: status,
    date,
    Date: date,
    sessionId,
    SessionID: sessionId,
    raw: record,
  };

  return normalized;
};

const extractAttendance = (payload) => {
  const list = (() => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === "object") {
      if (Array.isArray(payload.data)) {
        return payload.data;
      }
      if (Array.isArray(payload.records)) {
        return payload.records;
      }
      if (Array.isArray(payload.attendance)) {
        return payload.attendance;
      }
      if (Array.isArray(payload.Attendance)) {
        return payload.Attendance;
      }
      if (Array.isArray(payload.items)) {
        return payload.items;
      }
      if (Array.isArray(payload.results)) {
        return payload.results;
      }
    }

    return [];
  })();

  return list.map(normalizeAttendanceRecord).filter(Boolean);
};

const fetchAttendance = async (url, config) => {
  const response = await axios.get(url, config);
  return extractAttendance(response.data);
};

const resolveCourseId = (courseId) => {
  if (courseId === undefined || courseId === null) {
    return null;
  }

  return String(courseId).trim();
};

const resolveStudentId = (studentId) => {
  if (studentId === undefined || studentId === null) {
    return null;
  }

  return String(studentId).trim();
};

const isNotFound = (error) => error?.response?.status === 404;

export const getCourseAttendance = async (courseId) => {
  const resolvedId = resolveCourseId(courseId);

  if (!resolvedId) {
    return [];
  }

  const candidateEndpoints = [
    `/Attendance/course/${resolvedId}`,
    `/Attendance/Course/${resolvedId}`,
    `/Attendance/${resolvedId}`,
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      return await fetchAttendance(endpoint);
    } catch (error) {
      if (isNotFound(error)) {
        return [];
      }
      console.warn(`Attendance endpoint failed (${endpoint})`, error);
    }
  }

  try {
    return await fetchAttendance(`/Attendance`, {
      params: { courseId: resolvedId },
    });
  } catch (error) {
    if (!isNotFound(error)) {
      console.error(
        "Failed to load course attendance from API, using mocks",
        error
      );
    }
  }

  await delay(500);
  return mockAttendance
    .filter((att) => String(att.courseId ?? att.CourseID) === resolvedId)
    .map(normalizeAttendanceRecord);
};

export const getStudentAttendance = async (studentId) => {
  const resolvedId = resolveStudentId(studentId);

  if (!resolvedId) {
    return [];
  }

  const candidateEndpoints = [
    `/Attendance/student/${resolvedId}`,
    `/Attendance/Student/${resolvedId}`,
    `/Attendance/by-student/${resolvedId}`,
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      return await fetchAttendance(endpoint);
    } catch (error) {
      if (isNotFound(error)) {
        return [];
      }
      console.warn(`Student attendance endpoint failed (${endpoint})`, error);
    }
  }

  try {
    return await fetchAttendance(`/Attendance`, {
      params: { studentId: resolvedId },
    });
  } catch (error) {
    if (!isNotFound(error)) {
      console.error(
        "Failed to load student attendance from API, using mocks",
        error
      );
    }
  }

  await delay(500);
  return mockAttendance
    .filter((att) => String(att.studentId ?? att.StudentID) === resolvedId)
    .map(normalizeAttendanceRecord);
};

export const generateQRSession = async (sessionData) => {
  try {
    const response = await axios.post(`/Attendance/sessions`, sessionData);
    const payload = response.data;

    if (payload && typeof payload === "object") {
      return {
        id:
          payload.SessionID ??
          payload.sessionID ??
          payload.id ??
          Math.random().toString(36).substring(7),
        ...payload,
      };
    }
  } catch (error) {
    console.error("Failed to generate QR session via API, using mock", error);
  }

  await delay(500);
  return {
    id: Math.random().toString(36).substring(7),
    ...sessionData,
    QRCodeData: `session-${Math.random().toString(36).substring(7)}`,
    sessionDate: new Date().toISOString(),
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
};

export const recordAttendance = async (sessionId, studentId) => {
  try {
    const response = await axios.post(`/Attendance/record`, {
      sessionId,
      studentId,
    });
    const payload = response.data;
    return (
      normalizeAttendanceRecord(payload) ?? {
        id: Math.random().toString(36).substring(7),
        sessionId,
        studentId,
        scanTime: new Date().toISOString(),
        status: "Present",
      }
    );
  } catch (error) {
    console.error("Failed to record attendance via API, using mock", error);
  }

  await delay(500);
  return {
    id: Math.random().toString(36).substring(7),
    sessionId,
    studentId,
    scanTime: new Date().toISOString(),
    status: "Present",
  };
};
