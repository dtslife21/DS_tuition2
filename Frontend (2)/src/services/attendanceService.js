import axios from "axios";
import { ATTENDANCE_STATUS } from "../utils/constants";

const sanitizeRecordPayload = (source) => {
  if (!source || typeof source !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(source).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
};

const normalizeIdentifier = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text.length ? text : null;
};

const toNumericId = (value) => {
  const normalized = normalizeIdentifier(value);
  if (normalized === null) {
    return null;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

const toIsoOrNull = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const mapAttendanceStatus = (value) => {
  if (value === undefined || value === null) {
    return ATTENDANCE_STATUS.PRESENT;
  }

  const text = String(value).toLowerCase();

  if (text === "present" || text === "p") {
    return ATTENDANCE_STATUS.PRESENT;
  }

  if (text === "absent" || text === "a" || text === "0") {
    return ATTENDANCE_STATUS.ABSENT;
  }

  if (text === "late" || text === "l") {
    return ATTENDANCE_STATUS.LATE;
  }

  return String(value);
};

const toIsoDate = (value) => {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
};

const buildAttendanceRecord = (record) => {
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

  const status = mapAttendanceStatus(
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

  const date = toIsoDate(
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

  const recordData = {
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

  return recordData;
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

  return list.map(buildAttendanceRecord).filter(Boolean);
};

const fetchAttendance = async (url, config) => {
  const response = await axios.get(url, config);
  return extractAttendance(response.data);
};

const buildQrSession = (session) => {
  if (!session || typeof session !== "object") {
    return null;
  }

  const course = session.Course ?? session.course ?? {};
  const teacher = session.Teacher ?? session.teacher ?? {};

  const sessionId =
    session.SessionID ??
    session.sessionID ??
    session.sessionId ??
    session.id ??
    null;

  const courseId =
    session.CourseID ??
    session.courseID ??
    session.courseId ??
    session.CourseId ??
    course.CourseID ??
    course.courseID ??
    course.courseId ??
    course.id ??
    null;

  const teacherId =
    session.TeacherID ??
    session.teacherID ??
    session.teacherId ??
    session.TeacherId ??
    teacher.TeacherID ??
    teacher.teacherID ??
    teacher.teacherId ??
    teacher.id ??
    null;

  const startTime =
    toIsoOrNull(session.StartTime ?? session.startTime) ??
    toIsoOrNull(session.SessionStart);
  const endTime =
    toIsoOrNull(session.EndTime ?? session.endTime) ??
    toIsoOrNull(session.SessionEnd);
  const expiryTime =
    toIsoOrNull(session.ExpiryTime ?? session.expiryTime) ??
    toIsoOrNull(session.SessionExpiry ?? session.expiry);
  const sessionDate =
    toIsoOrNull(session.SessionDate ?? session.sessionDate) ?? startTime;

  const qrCodeData =
    session.QRCodeData ??
    session.qrCodeData ??
    session.QRCode ??
    session.qrCode ??
    null;

  return {
    id:
      sessionId ??
      qrCodeData ??
      `${normalizeIdentifier(courseId) ?? "course"}-${Date.now()}`,
    sessionId: sessionId ?? null,
    SessionID: sessionId ?? null,
    courseId: normalizeIdentifier(courseId),
    CourseID: normalizeIdentifier(courseId),
    teacherId: normalizeIdentifier(teacherId),
    TeacherID: normalizeIdentifier(teacherId),
    qrCodeData,
    QRCodeData: qrCodeData,
    sessionDate,
    SessionDate: sessionDate,
    startTime,
    StartTime: startTime,
    endTime,
    EndTime: endTime,
    expiryTime,
    ExpiryTime: expiryTime,
    isActive:
      session.IsActive ??
      session.isActive ??
      session.Active ??
      session.active ??
      (expiryTime ? new Date(expiryTime).getTime() >= Date.now() : true),
    IsActive:
      session.IsActive ??
      session.isActive ??
      session.Active ??
      session.active ??
      (expiryTime ? new Date(expiryTime).getTime() >= Date.now() : true),
    createdAt: toIsoOrNull(session.CreatedAt ?? session.createdAt),
    CreatedAt: toIsoOrNull(session.CreatedAt ?? session.createdAt),
    course,
    teacher,
    raw: session,
  };
};

const extractSessions = (payload) => {
  const list = (() => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === "object") {
      if (Array.isArray(payload.sessions)) {
        return payload.sessions;
      }
      if (Array.isArray(payload.Sessions)) {
        return payload.Sessions;
      }
      if (Array.isArray(payload.data)) {
        return payload.data;
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

  return list.map(buildQrSession).filter(Boolean);
};

const fetchSessions = async (url, config) => {
  const response = await axios.get(url, config);
  return extractSessions(response.data);
};

const resolveCourseId = (courseId) => {
  return normalizeIdentifier(courseId);
};

const resolveStudentId = (studentId) => {
  return normalizeIdentifier(studentId);
};

const resolveTeacherId = (teacherId) => normalizeIdentifier(teacherId);

const getSessionCourseId = (session) =>
  resolveCourseId(
    session?.courseId ??
      session?.CourseID ??
      session?.CourseId ??
      session?.Course?.CourseID ??
      session?.Course?.courseID ??
      session?.Course?.courseId ??
      session?.Course?.CourseId ??
      null
  );

const getSessionTeacherId = (session) =>
  resolveTeacherId(
    session?.teacherId ??
      session?.TeacherID ??
      session?.TeacherId ??
      session?.Teacher?.TeacherID ??
      session?.Teacher?.teacherID ??
      session?.Teacher?.teacherId ??
      session?.Teacher?.TeacherId ??
      null
  );

const getSessionQrCode = (session) =>
  normalizeIdentifier(
    session?.QRCodeData ??
      session?.qrCodeData ??
      session?.QRCode ??
      session?.qrCode ??
      null
  );

const isNotFound = (error) => error?.response?.status === 404;

const isSessionActive = (session) => {
  if (!session || typeof session !== "object") {
    return false;
  }

  const activeFlag =
    session.IsActive ?? session.isActive ?? session.Active ?? session.active;

  if (activeFlag === false) {
    return false;
  }

  const now = Date.now();

  const start = toIsoOrNull(session.StartTime ?? session.startTime);
  if (start) {
    const startTime = new Date(start).getTime();
    if (Number.isFinite(startTime) && startTime > now) {
      return false;
    }
  }

  const expiry = toIsoOrNull(session.ExpiryTime ?? session.expiryTime);
  if (expiry) {
    const expiryTime = new Date(expiry).getTime();
    if (Number.isFinite(expiryTime) && expiryTime < now) {
      return false;
    }
    return true;
  }

  const end = toIsoOrNull(session.EndTime ?? session.endTime);
  if (end) {
    const endTime = new Date(end).getTime();
    if (Number.isFinite(endTime) && endTime < now) {
      return false;
    }
  }

  return activeFlag !== false;
};

const findActiveSession = async ({ courseId, teacherId, qrCodeData } = {}) => {
  const normalizedCourse = resolveCourseId(courseId);
  const normalizedTeacher = resolveTeacherId(teacherId);
  const normalizedCode = normalizeIdentifier(qrCodeData);

  const matchesCriteria = (session) => {
    if (!session) {
      return false;
    }

    const sessionCode = getSessionQrCode(session);
    if (normalizedCode && sessionCode === normalizedCode) {
      return true;
    }

    if (!isSessionActive(session)) {
      return false;
    }

    if (normalizedCourse) {
      const sessionCourse = getSessionCourseId(session);
      if (sessionCourse !== normalizedCourse) {
        return false;
      }
    }

    if (normalizedTeacher) {
      const sessionTeacher = getSessionTeacherId(session);
      if (sessionTeacher !== normalizedTeacher) {
        return false;
      }
    }

    if (normalizedCode) {
      return sessionCode === normalizedCode;
    }

    return true;
  };

  const tryFetch = async (endpoint, warnLabel) => {
    try {
      const sessions = await fetchSessions(endpoint);
      return sessions.find(matchesCriteria) ?? null;
    } catch (error) {
      if (!isNotFound(error)) {
        console.warn(`Failed to fetch sessions from ${warnLabel}`, error);
      }
      return null;
    }
  };

  if (normalizedCourse) {
    const session = await tryFetch(
      `/QRSessions/Course/${normalizedCourse}`,
      "course endpoint"
    );
    if (session) {
      return session;
    }
  }

  if (normalizedTeacher && !normalizedCourse) {
    const session = await tryFetch(`/QRSessions`, "default endpoint");
    if (session) {
      return session;
    }
  }

  const activeSession = await tryFetch(`/QRSessions/Active`, "active endpoint");
  if (activeSession) {
    return activeSession;
  }

  if (normalizedCode) {
    const session = await tryFetch(`/QRSessions`, "default endpoint");
    if (session) {
      return session;
    }
  }

  return null;
};

export const getCourseAttendance = async (courseId, teacherId) => {
  const resolvedCourseId = resolveCourseId(courseId);

  if (!resolvedCourseId) {
    return [];
  }

  try {
    const sessions = await getQRSessionsByCourse(resolvedCourseId, teacherId);

    if (Array.isArray(sessions) && sessions.length) {
      const results = await Promise.allSettled(
        sessions.map((session) => {
          const sessionIdentifier = normalizeIdentifier(
            session.SessionID ?? session.sessionId ?? session.id
          );

          if (!sessionIdentifier) {
            return Promise.resolve([]);
          }

          return fetchAttendance(
            `/Attendances/Session/${sessionIdentifier}`
          ).then((records) =>
            records.map((record) => ({
              ...record,
              session,
              sessionId: record.sessionId ?? sessionIdentifier,
              SessionID: record.SessionID ?? sessionIdentifier,
              courseId:
                record.courseId ??
                record.CourseID ??
                session.courseId ??
                session.CourseID ??
                resolvedCourseId,
              CourseID:
                record.CourseID ??
                record.courseId ??
                session.CourseID ??
                session.courseId ??
                resolvedCourseId,
            }))
          );
        })
      );

      const aggregated = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          aggregated.push(...result.value);
        } else {
          const error = result.reason;
          if (!isNotFound(error)) {
            console.warn("Failed to fetch attendance for a session", error);
          }
        }
      }

      if (aggregated.length) {
        return aggregated;
      }
    }
  } catch (error) {
    if (!isNotFound(error)) {
      console.warn(
        "Failed to load course sessions from API, attempting fallback",
        error
      );
    }
  }

  try {
    const records = await fetchAttendance(`/Attendances`, {
      params: { courseId: resolvedCourseId },
    });

    if (records.length) {
      return records;
    }
  } catch (error) {
    if (!isNotFound(error)) {
      console.error("Failed to load course attendance from API", error);
      throw error;
    }
  }
  return [];
};

export const getStudentAttendance = async (studentId) => {
  const resolvedId = resolveStudentId(studentId);

  if (!resolvedId) {
    return [];
  }

  try {
    return await fetchAttendance(`/Attendances/Student/${resolvedId}`);
  } catch (error) {
    if (!isNotFound(error)) {
      console.error("Failed to load student attendance from API", error);
      throw error;
    }
  }

  try {
    const records = await fetchAttendance(`/Attendances`, {
      params: { studentId: resolvedId },
    });

    if (records.length) {
      return records;
    }
  } catch (error) {
    if (!isNotFound(error)) {
      console.error("Failed to load student attendance from API", error);
      throw error;
    }
  }
  return [];
};

export const generateQRSession = async (sessionData = {}) => {
  const source =
    sessionData && typeof sessionData === "object" ? sessionData : {};

  const courseId =
    source.CourseID ??
    source.courseID ??
    source.courseId ??
    source.course ??
    null;
  const teacherId =
    source.TeacherID ??
    source.teacherID ??
    source.teacherId ??
    source.teacher ??
    null;

  const normalizedCourseId = toNumericId(courseId);
  const normalizedTeacherId = toNumericId(teacherId);

  const durationSource =
    source.DurationMinutes ??
    source.durationMinutes ??
    source.duration ??
    source.length ??
    15;

  const parsedDuration = Number(durationSource);
  const durationMinutes =
    Number.isFinite(parsedDuration) && parsedDuration > 0
      ? Math.round(parsedDuration)
      : 15;

  const startTime =
    toIsoOrNull(source.StartTime ?? source.startTime) ??
    toIsoOrNull(source.SessionStart);
  const endTime =
    toIsoOrNull(source.EndTime ?? source.endTime) ??
    (startTime
      ? new Date(
          new Date(startTime).getTime() + durationMinutes * 60000
        ).toISOString()
      : null);
  // Ensure expiry equals session end time unless an explicit expiry was provided
  const expiryTime =
    toIsoOrNull(source.ExpiryTime ?? source.expiryTime) ?? endTime ?? null;

  const body = sanitizeRecordPayload({
    CourseID: normalizedCourseId,
    TeacherID: normalizedTeacherId,
    DurationMinutes: durationMinutes,
    SessionDate:
      toIsoOrNull(source.SessionDate ?? source.sessionDate) ??
      startTime ??
      new Date().toISOString(),
    StartTime: startTime,
    EndTime: endTime,
    ExpiryTime: expiryTime,
    Location: source.Location ?? source.location ?? null,
  });

  try {
    const response = await axios.post(`/QRSessions/GenerateForClass`, body);
    const session = buildQrSession(response.data);
    if (session) {
      return session;
    }

    if (response.data && typeof response.data === "object") {
      return { ...response.data };
    }
  } catch (error) {
    console.error("Failed to generate QR session via API", error);
    throw error;
  }
  return null;
};

export const recordAttendance = async (arg1, arg2) => {
  const rawPayload =
    arg1 && typeof arg1 === "object" && !Array.isArray(arg1)
      ? arg1
      : { sessionId: arg1, studentId: arg2 };

  const payload = sanitizeRecordPayload(rawPayload);

  const resolvedStudentId =
    payload.studentId ?? payload.StudentID ?? payload.studentID ?? null;

  if (!resolvedStudentId && resolvedStudentId !== 0) {
    throw new Error("Student ID is required to record attendance.");
  }

  const resolvedSessionId =
    payload.sessionId ??
    payload.SessionID ??
    payload.sessionID ??
    payload.id ??
    payload.Id ??
    null;

  const resolvedCourseId =
    payload.courseId ??
    payload.CourseID ??
    payload.courseID ??
    payload.Course?.CourseID ??
    payload.Course?.courseId ??
    null;

  const resolvedTeacherId =
    payload.teacherId ??
    payload.TeacherID ??
    payload.teacherID ??
    payload.Teacher?.TeacherID ??
    payload.Teacher?.teacherId ??
    null;

  const rawQrCodeData =
    payload.QRCodeData ?? payload.qrCodeData ?? payload.code ?? payload.QRCode;
  let normalizedQrCode = normalizeIdentifier(rawQrCodeData);

  const normalizedCourseId = resolveCourseId(resolvedCourseId);
  const normalizedTeacherId = resolveTeacherId(resolvedTeacherId);

  let sessionIdNumeric = toNumericId(resolvedSessionId);
  const studentIdNumeric = toNumericId(resolvedStudentId);

  const statusValue =
    payload.status ??
    payload.Status ??
    payload.attendanceStatus ??
    ATTENDANCE_STATUS.PRESENT;

  const baseDeviceInfo = payload.DeviceInfo ?? payload.deviceInfo ?? null;
  const baseIpAddress =
    payload.IPAddress ?? payload.ipAddress ?? payload.ip ?? null;
  const baseLocation = payload.Location ?? payload.location ?? null;

  const resolvedSessionStart =
    payload.sessionStartTime ??
    payload.SessionStartTime ??
    payload.sessionStart ??
    payload.SessionStart ??
    payload.startTime ??
    payload.StartTime ??
    null;

  const resolvedSessionEnd =
    payload.sessionEndTime ??
    payload.SessionEndTime ??
    payload.sessionEnd ??
    payload.SessionEnd ??
    payload.endTime ??
    payload.EndTime ??
    null;

  const sessionStartIso = toIsoOrNull(resolvedSessionStart);
  const sessionEndIso = toIsoOrNull(resolvedSessionEnd);

  const resolvedAttendanceDateInput =
    payload.attendanceDate ?? payload.AttendanceDate ?? payload.date ?? null;

  const resolvedSessionDateInput =
    payload.sessionDate ??
    payload.SessionDate ??
    resolvedAttendanceDateInput ??
    null;

  const attendanceDateIso =
    toIsoOrNull(resolvedAttendanceDateInput) ??
    (sessionStartIso ? new Date(sessionStartIso).toISOString() : null);

  const sessionDateIso =
    toIsoOrNull(resolvedSessionDateInput) ??
    attendanceDateIso ??
    (sessionEndIso ? new Date(sessionEndIso).toISOString() : null);

  const sessionBodyBase = {
    SessionID: sessionIdNumeric,
    StudentID: studentIdNumeric,
    Status: mapAttendanceStatus(statusValue),
    DeviceInfo: baseDeviceInfo,
    IPAddress: baseIpAddress,
    Location: baseLocation,
    ScanTime:
      toIsoOrNull(payload.ScanTime ?? payload.scanTime ?? payload.timestamp) ??
      new Date().toISOString(),
    SessionStartTime: sessionStartIso,
    SessionEndTime: sessionEndIso,
    StartTime: sessionStartIso,
    EndTime: sessionEndIso,
    SessionDate: sessionDateIso,
    AttendanceDate: attendanceDateIso,
  };

  const qrRecordBodyBase = {
    QRCodeData: rawQrCodeData,
    StudentID: studentIdNumeric,
    DeviceInfo: baseDeviceInfo,
    IPAddress: baseIpAddress,
    Location: baseLocation,
    SessionStartTime: sessionStartIso,
    SessionEndTime: sessionEndIso,
    StartTime: sessionStartIso,
    EndTime: sessionEndIso,
    SessionDate: sessionDateIso,
    AttendanceDate: attendanceDateIso,
  };

  if (!sessionIdNumeric || Number.isNaN(sessionIdNumeric)) {
    const activeSession = await findActiveSession({
      courseId: normalizedCourseId,
      teacherId: normalizedTeacherId,
      qrCodeData: normalizedQrCode,
    });

    if (activeSession) {
      sessionIdNumeric = toNumericId(
        activeSession.SessionID ??
          activeSession.sessionID ??
          activeSession.sessionId ??
          activeSession.id
      );

      if (sessionIdNumeric && !Number.isNaN(sessionIdNumeric)) {
        sessionBodyBase.SessionID = sessionIdNumeric;
      }

      if (!normalizedQrCode) {
        const sessionCode = getSessionQrCode(activeSession);
        if (sessionCode) {
          normalizedQrCode = sessionCode;
          qrRecordBodyBase.QRCodeData =
            activeSession.QRCodeData ?? activeSession.qrCodeData ?? sessionCode;
        }
      }
    }
  }

  if (
    (!sessionIdNumeric || Number.isNaN(sessionIdNumeric)) &&
    normalizedCourseId &&
    normalizedTeacherId
  ) {
    try {
      const freshSession = await generateQRSession({
        CourseID: normalizedCourseId,
        TeacherID: normalizedTeacherId,
        DurationMinutes:
          payload.DurationMinutes ??
          payload.durationMinutes ??
          payload.duration ??
          15,
      });

      if (freshSession) {
        sessionIdNumeric = toNumericId(
          freshSession.SessionID ??
            freshSession.sessionID ??
            freshSession.sessionId ??
            freshSession.id
        );

        if (sessionIdNumeric && !Number.isNaN(sessionIdNumeric)) {
          sessionBodyBase.SessionID = sessionIdNumeric;
        }

        const sessionCode = getSessionQrCode(freshSession);
        if (sessionCode) {
          normalizedQrCode = sessionCode;
          qrRecordBodyBase.QRCodeData =
            freshSession.QRCodeData ?? freshSession.qrCodeData ?? sessionCode;
        }
      }
    } catch (error) {
      console.warn("Failed to auto-create QR session for attendance", error);
    }
  }

  const sessionBody = sanitizeRecordPayload(sessionBodyBase);
  const qrRecordBody = sanitizeRecordPayload(qrRecordBodyBase);

  try {
    const hasSessionPayload =
      Object.prototype.hasOwnProperty.call(sessionBody, "SessionID") &&
      Object.prototype.hasOwnProperty.call(sessionBody, "StudentID");

    const hasQrPayload =
      Object.prototype.hasOwnProperty.call(qrRecordBody, "QRCodeData") &&
      Object.prototype.hasOwnProperty.call(qrRecordBody, "StudentID");

    let response;

    if (hasSessionPayload) {
      response = await axios.post(`/Attendances`, sessionBody);
    } else if (hasQrPayload) {
      response = await axios.post(`/Attendances/Record`, qrRecordBody);
    } else {
      throw new Error(
        "Unable to determine the QR session for this attendance record."
      );
    }

    const record = buildAttendanceRecord(response.data);
    if (record) {
      return record;
    }

    const responsePayload = response.data || {};
    return {
      id: Math.random().toString(36).substring(7),
      sessionId:
        responsePayload.sessionId ??
        responsePayload.SessionID ??
        sessionBody.SessionID ??
        null,
      studentId: String(resolvedStudentId),
      courseId:
        responsePayload.courseId ??
        responsePayload.CourseID ??
        normalizedCourseId ??
        null,
      teacherId:
        responsePayload.teacherId ??
        responsePayload.TeacherID ??
        normalizedTeacherId ??
        null,
      scanTime:
        responsePayload.scanTime ??
        responsePayload.ScanTime ??
        sessionBody.ScanTime ??
        new Date().toISOString(),
      sessionStartTime:
        responsePayload.sessionStartTime ??
        responsePayload.SessionStartTime ??
        responsePayload.sessionStart ??
        responsePayload.SessionStart ??
        responsePayload.startTime ??
        responsePayload.StartTime ??
        sessionBody.SessionStartTime ??
        null,
      sessionEndTime:
        responsePayload.sessionEndTime ??
        responsePayload.SessionEndTime ??
        responsePayload.sessionEnd ??
        responsePayload.SessionEnd ??
        responsePayload.endTime ??
        responsePayload.EndTime ??
        sessionBody.SessionEndTime ??
        null,
      status: mapAttendanceStatus(
        responsePayload.status ??
          responsePayload.Status ??
          sessionBody.Status ??
          statusValue
      ),
      attendanceDate:
        responsePayload.attendanceDate ??
        responsePayload.AttendanceDate ??
        toIsoDate(
          payload.attendanceDate ?? payload.AttendanceDate ?? payload.date
        ),
    };
  } catch (error) {
    console.error("Failed to record attendance via API", error);
    throw error;
  }
};

export const getQRSessions = async () => {
  try {
    return await fetchSessions(`/QRSessions`);
  } catch (error) {
    if (!isNotFound(error)) {
      console.error("Failed to load QR sessions from API", error);
    }
  }

  return [];
};

export const getQRSessionsByCourse = async (courseId, teacherId) => {
  const resolvedCourseId = resolveCourseId(courseId);
  if (!resolvedCourseId) {
    return [];
  }

  try {
    const sessions = await fetchSessions(
      `/QRSessions/Course/${resolvedCourseId}`
    );
    if (!teacherId) {
      return sessions;
    }

    const resolvedTeacherId = resolveTeacherId(teacherId);
    if (!resolvedTeacherId) {
      return sessions;
    }

    return sessions.filter(
      (session) => getSessionTeacherId(session) === resolvedTeacherId
    );
  } catch (error) {
    if (!isNotFound(error)) {
      console.error("Failed to load QR sessions for course", error);
    }
  }

  return [];
};

export const getActiveQRSessions = async () => {
  try {
    return await fetchSessions(`/QRSessions/Active`);
  } catch (error) {
    if (!isNotFound(error)) {
      console.error("Failed to load active QR sessions", error);
    }
  }

  return [];
};

export const getQRSession = async (sessionId) => {
  const resolvedSessionId = normalizeIdentifier(sessionId);
  if (!resolvedSessionId) {
    return null;
  }

  try {
    const response = await axios.get(`/QRSessions/${resolvedSessionId}`);
    return buildQrSession(response.data);
  } catch (error) {
    if (!isNotFound(error)) {
      console.error(`Failed to load QR session ${resolvedSessionId}`, error);
    }
  }

  return null;
};
