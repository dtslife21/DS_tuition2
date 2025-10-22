import axios from "axios";
import { mockStudents } from "../utils/mockData";

const normalizeStudent = (student) => {
  if (!student || typeof student !== "object") {
    return student;
  }

  const user =
    student.UserDetails ||
    student.userDetails ||
    student.User ||
    student.user ||
    {};

  const resolvedStudentId =
    student.StudentID ??
    student.studentID ??
    student.studentId ??
    student.id ??
    user.UserID ??
    user.userId ??
    user.userID ??
    null;

  const normalized = {
    StudentID: student.StudentID ?? resolvedStudentId,
    UserID:
      student.UserID ??
      student.userID ??
      student.userId ??
      user.UserID ??
      user.userID ??
      resolvedStudentId,
    RollNumber: student.RollNumber ?? student.rollNumber ?? "",
    EnrollmentDate:
      student.EnrollmentDate ??
      student.enrollmentDate ??
      student.enrollment_date ??
      null,
    CurrentGrade:
      student.CurrentGrade ??
      student.currentGrade ??
      student.current_grade ??
      "",
    ParentName: student.ParentName ?? student.parentName ?? "",
    ParentContact:
      student.ParentContact ??
      student.parentContact ??
      student.parent_contact ??
      "",
    FirstName: student.FirstName ?? user.FirstName ?? user.firstName ?? "",
    LastName: student.LastName ?? user.LastName ?? user.lastName ?? "",
    Email: student.Email ?? user.Email ?? user.email ?? "",
    Username: student.Username ?? user.Username ?? user.username ?? "",
    IsActive: student.IsActive ?? user.IsActive ?? user.isActive ?? true,
    UserDetails: {
      UserID:
        user.UserID ??
        user.userID ??
        user.userId ??
        student.UserID ??
        student.userID ??
        resolvedStudentId,
      Username: user.Username ?? student.Username ?? "",
      Email: user.Email ?? student.Email ?? "",
      FirstName: user.FirstName ?? student.FirstName ?? "",
      LastName: user.LastName ?? student.LastName ?? "",
      IsActive: user.IsActive ?? student.IsActive ?? true,
    },
  };

  const resolvedId =
    normalized.StudentID ?? normalized.UserID ?? resolvedStudentId ?? null;

  normalized.id = resolvedId;
  normalized.studentId = normalized.StudentID ?? resolvedId;
  normalized.userId = normalized.UserID ?? resolvedId;
  normalized.firstName = normalized.FirstName;
  normalized.lastName = normalized.LastName;
  normalized.email = normalized.Email;
  normalized.username = normalized.Username;
  normalized.rollNumber = normalized.RollNumber;
  normalized.currentGrade = normalized.CurrentGrade;
  normalized.parentName = normalized.ParentName;
  normalized.parentContact = normalized.ParentContact;

  return normalized;
};

const mapStudentCreatePayload = (studentData) => {
  const payload = {
    UserID:
      studentData.UserID ??
      studentData.userID ??
      studentData.userId ??
      studentData.StudentID ??
      studentData.studentID ??
      studentData.studentId ??
      undefined,
    RollNumber: studentData.RollNumber ?? studentData.rollNumber ?? "",
    EnrollmentDate:
      studentData.EnrollmentDate ??
      studentData.enrollmentDate ??
      studentData.enrollment_date ??
      null,
    CurrentGrade:
      studentData.CurrentGrade ??
      studentData.currentGrade ??
      studentData.current_grade ??
      "",
    ParentName: studentData.ParentName ?? studentData.parentName ?? "",
    ParentContact:
      studentData.ParentContact ??
      studentData.parentContact ??
      studentData.parent_contact ??
      "",
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
};

const mapStudentUpdatePayload = (studentData) => {
  const payload = {
    StudentID:
      studentData.StudentID ??
      studentData.studentID ??
      studentData.studentId ??
      studentData.UserID ??
      studentData.userID ??
      studentData.userId ??
      undefined,
    RollNumber: studentData.RollNumber ?? studentData.rollNumber ?? "",
    CurrentGrade:
      studentData.CurrentGrade ??
      studentData.currentGrade ??
      studentData.current_grade ??
      "",
    ParentName: studentData.ParentName ?? studentData.parentName ?? "",
    ParentContact:
      studentData.ParentContact ??
      studentData.parentContact ??
      studentData.parent_contact ??
      "",
  };

  if (
    studentData.EnrollmentDate !== undefined ||
    studentData.enrollmentDate !== undefined ||
    studentData.enrollment_date !== undefined
  ) {
    payload.EnrollmentDate =
      studentData.EnrollmentDate ??
      studentData.enrollmentDate ??
      studentData.enrollment_date ??
      null;
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
};

const mapMockStudent = (student) => {
  const normalized = {
    StudentID: student.StudentID ?? student.id,
    UserID: student.UserID ?? student.id,
    RollNumber: student.RollNumber ?? student.rollNumber ?? "",
    EnrollmentDate:
      student.EnrollmentDate ??
      student.enrollmentDate ??
      student.enrollment_date ??
      null,
    CurrentGrade:
      student.CurrentGrade ??
      student.currentGrade ??
      student.current_grade ??
      "",
    ParentName: student.ParentName ?? student.parentName ?? "",
    ParentContact: student.ParentContact ?? student.parentContact ?? "",
    FirstName: student.FirstName ?? student.firstName ?? "",
    LastName: student.LastName ?? student.lastName ?? "",
    Email: student.Email ?? student.email ?? "",
    Username: student.Username ?? student.username ?? "",
    IsActive: student.IsActive ?? true,
  };

  normalized.id = normalized.StudentID ?? normalized.UserID ?? student.id;
  normalized.studentId = normalized.StudentID ?? normalized.id;
  normalized.userId = normalized.UserID ?? normalized.id;
  normalized.rollNumber = normalized.RollNumber;
  normalized.currentGrade = normalized.CurrentGrade;
  normalized.parentName = normalized.ParentName;
  normalized.parentContact = normalized.ParentContact;
  normalized.firstName = normalized.FirstName;
  normalized.lastName = normalized.LastName;
  normalized.email = normalized.Email;
  normalized.username = normalized.Username;

  return normalized;
};

export const getAllStudents = async () => {
  try {
    const response = await axios.get("/Students");
    const students = Array.isArray(response.data)
      ? response.data.map(normalizeStudent).filter(Boolean)
      : [];

    if (students.length) {
      return students;
    }
  } catch (error) {
    console.error("Failed to load students from API, using mocks", error);
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockStudents.map(mapMockStudent);
};

export const getStudentById = async (studentId) => {
  try {
    const response = await axios.get(`/Students/${studentId}`);
    return normalizeStudent(response.data);
  } catch (error) {
    console.error("Failed to load student from API, using mock", error);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const fallback = mockStudents.find(
      (student) => String(student.id) === String(studentId)
    );
    return fallback ? mapMockStudent(fallback) : null;
  }
};

export const createStudent = async (studentData) => {
  try {
    const payload = mapStudentCreatePayload(studentData);
    const response = await axios.post("/Students", payload);
    return normalizeStudent(response.data);
  } catch (error) {
    console.error("Failed to create student via API, using mock", error);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const nextId =
      Math.max(0, ...mockStudents.map((student) => Number(student.id) || 0)) +
      1;
    const mockStudent = {
      id: nextId,
      ...studentData,
    };
    mockStudents.push(mockStudent);
    return mapMockStudent(mockStudent);
  }
};

export const updateStudent = async (studentId, studentData) => {
  try {
    const payload = mapStudentUpdatePayload({
      ...studentData,
      StudentID: studentId,
    });
    const response = await axios.put(`/Students/${studentId}`, payload);
    return normalizeStudent(
      response.data ?? { ...studentData, StudentID: studentId }
    );
  } catch (error) {
    console.error("Failed to update student via API, using mock", error);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const index = mockStudents.findIndex(
      (student) => String(student.id) === String(studentId)
    );
    if (index !== -1) {
      mockStudents[index] = { ...mockStudents[index], ...studentData };
      return mapMockStudent(mockStudents[index]);
    }
    return null;
  }
};

export const deleteStudent = async (studentId) => {
  try {
    await axios.delete(`/Students/${studentId}`);
    return true;
  } catch (error) {
    console.error("Failed to delete student via API, updating mock", error);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const index = mockStudents.findIndex(
      (student) => String(student.id) === String(studentId)
    );
    if (index !== -1) {
      mockStudents.splice(index, 1);
      return true;
    }
    return false;
  }
};

export default normalizeStudent;
