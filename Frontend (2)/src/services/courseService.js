import { mockCourses, mockStudents } from "../utils/mockData";

// Mock service functions
export const getTeacherCourses = async (teacherId) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockCourses.filter((course) => course.teacherId === teacherId);
};

export const getTeacherStudents = async (teacherId) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockStudents;
};

export const getCourseDetails = async (courseId) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  // ensure comparison works when courseId is a string (from route params)
  return mockCourses.find((course) => String(course.id) === String(courseId));
};

export const getAllCourses = async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockCourses;
};

export const createCourse = async (courseData) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newCourse = {
    id: Math.max(...mockCourses.map((c) => c.id)) + 1,
    ...courseData,
  };
  mockCourses.push(newCourse);
  return newCourse;
};

// Return students enrolled in a course. For mock data we infer by attendance records
export const getCourseStudents = async (courseId) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  // if mockAttendance exists, gather studentIds for this course
  try {
    const { mockAttendance, mockStudents } = await import("../utils/mockData");
    const studentIds = mockAttendance
      .filter((a) => String(a.courseId) === String(courseId))
      .map((a) => a.studentId);

    // If attendance has entries, return those students; otherwise return all mockStudents as fallback
    if (studentIds.length > 0) {
      return mockStudents.filter((s) => studentIds.includes(s.id));
    }

    return mockStudents;
  } catch (e) {
    // fallback
    return [];
  }
};

// Real service functions (to be implemented)
/*
export const getTeacherCourses = async (teacherId) => {
  const response = await axios.get(`/api/courses/teacher/${teacherId}`)
  return response.data
}

export const getCourseDetails = async (courseId) => {
  const response = await axios.get(`/api/courses/${courseId}`)
  return response.data
}
*/
