import { mockAttendance } from "../utils/mockData";

export const getCourseAttendance = async (courseId) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockAttendance.filter(
    (att) => String(att.courseId) === String(courseId)
  );
};

export const generateQRSession = async (sessionData) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
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
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    id: Math.random().toString(36).substring(7),
    sessionId,
    studentId,
    scanTime: new Date().toISOString(),
    status: "Present",
  };
};
// Real service functions (to be implemented)
/*
export const getCourseAttendance = async (courseId) => {
  const response = await axios.get(`/api/attendance/course/${courseId}`)
  return response.data
}
*/
