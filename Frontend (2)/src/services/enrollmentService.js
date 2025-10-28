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

export default {
  createEnrollment,
  createEnrollmentsForStudent,
  getEnrollmentsByStudent,
  deleteEnrollment,
};
