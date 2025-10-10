import { mockCourses, mockStudents } from '../utils/mockData'

// Mock service functions
export const getTeacherCourses = async (teacherId) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return mockCourses.filter(course => course.teacherId === teacherId)
}

export const getTeacherStudents = async (teacherId) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return mockStudents
}

export const getCourseDetails = async (courseId) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return mockCourses.find(course => course.id === courseId)
}

export const getAllCourses = async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return mockCourses
}

export const createCourse = async (courseData) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  const newCourse = {
    id: Math.max(...mockCourses.map(c => c.id)) + 1,
    ...courseData
  }
  mockCourses.push(newCourse)
  return newCourse
}

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