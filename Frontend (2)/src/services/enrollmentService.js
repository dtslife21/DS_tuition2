import axios from "axios";

// Create a single enrollment record
export const createEnrollment = async (enrollmentPayload) => {
  try {
    const response = await axios.post("/Enrollments", enrollmentPayload);
    return response.data;
  } catch (error) {
    console.error("Failed to create enrollment via API", error);
    // Don't throw here; let callers decide. Return null to indicate failure.
    return null;
  }
};

// Create multiple enrollments for a student (one per course id).
// courseIds can be array of strings or numbers.
export const createEnrollmentsForStudent = async (
  studentId,
  courseIds = [],
  options = {}
) => {
  if (!studentId) return [];
  const created = [];

  const defaultDate = options.EnrollmentDate || new Date().toISOString();

  for (const rawId of courseIds) {
    const courseId = Number(rawId);
    if (!courseId && courseId !== 0) continue;

    const payload = {
      StudentID: studentId,
      CourseID: courseId,
      EnrollmentDate: defaultDate,
      IsActive: options.IsActive !== undefined ? !!options.IsActive : true,
    };

    const res = await createEnrollment(payload);
    if (res) created.push(res);
  }

  return created;
};

// List enrollments for a given student. Returns an array of
// { EnrollmentID, StudentID, CourseID, EnrollmentDate, ... }
export const getEnrollmentsByStudent = async (studentId) => {
  if (studentId === undefined || studentId === null) return [];
  const idStr = String(studentId).trim();
  if (!idStr) return [];

  try {
    const response = await axios.get(`/Enrollments/Student/${idStr}`);
    const raw = Array.isArray(response.data)
      ? response.data
      : response.data?.enrollments || response.data?.Enrollments || [];
    return raw.map((e) => ({
      EnrollmentID: e.EnrollmentID ?? e.enrollmentID ?? e.id ?? e.Id ?? null,
      StudentID: e.StudentID ?? e.studentID ?? e.studentId ?? studentId,
      CourseID: e.CourseID ?? e.courseID ?? e.courseId ?? null,
      EnrollmentDate:
        e.EnrollmentDate ?? e.enrollmentDate ?? e.date ?? e.Date ?? null,
      raw: e,
    }));
  } catch (error) {
    console.error("Failed to fetch enrollments for student", error);
    return [];
  }
};

// Delete an enrollment by its id
export const deleteEnrollment = async (enrollmentId) => {
  if (enrollmentId === undefined || enrollmentId === null) return false;
  const idStr = String(enrollmentId).trim();
  if (!idStr) return false;

  try {
    await axios.delete(`/Enrollments/${idStr}`);
    return true;
  } catch (error) {
    console.error("Failed to delete enrollment", error);
    return false;
  }
};

export const updateEnrollment = async (enrollmentId, updates = {}) => {
  if (enrollmentId === undefined || enrollmentId === null) return null;
  const idStr = String(enrollmentId).trim();
  if (!idStr) return null;

  try {
    const response = await axios.patch(`/Enrollments/${idStr}`, updates);
    return response.data;
  } catch (patchError) {
    // Some backends may not support PATCH; fall back to PUT with the same payload.
    try {
      const response = await axios.put(`/Enrollments/${idStr}`, updates);
      return response.data;
    } catch (putError) {
      console.error("Failed to update enrollment", putError);
      throw putError;
    }
  }
};

export const setEnrollmentActiveStatus = async (
  enrollmentId,
  isActive,
  context = {}
) => {
  const payload = { IsActive: Boolean(isActive) };
  const numericId = Number(enrollmentId);
  if (!Number.isNaN(numericId)) {
    payload.EnrollmentID = numericId;
  } else if (enrollmentId !== undefined && enrollmentId !== null) {
    payload.EnrollmentID = enrollmentId;
  }

  const studentId =
    context.StudentID ??
    context.studentID ??
    context.studentId ??
    context.UserID ??
    context.userID ??
    context.userId ??
    null;
  if (studentId !== null && studentId !== undefined) {
    payload.StudentID = studentId;
  }

  const courseId =
    context.CourseID ??
    context.courseID ??
    context.courseId ??
    context.CourseId ??
    null;
  if (courseId !== null && courseId !== undefined) {
    payload.CourseID = courseId;
  }

  const subjectId =
    context.SubjectID ??
    context.subjectID ??
    context.subjectId ??
    context.SubjectId ??
    null;
  if (subjectId !== null && subjectId !== undefined) {
    payload.SubjectID = subjectId;
  }

  const enrollmentDate =
    context.EnrollmentDate ?? context.enrollmentDate ?? null;
  if (enrollmentDate) {
    payload.EnrollmentDate = enrollmentDate;
  }

  return updateEnrollment(enrollmentId, payload);
};

export default {
  createEnrollment,
  createEnrollmentsForStudent,
  getEnrollmentsByStudent,
  deleteEnrollment,
  updateEnrollment,
  setEnrollmentActiveStatus,
};
