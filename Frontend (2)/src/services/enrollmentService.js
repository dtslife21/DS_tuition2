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

export default {
  createEnrollment,
  createEnrollmentsForStudent,
};
