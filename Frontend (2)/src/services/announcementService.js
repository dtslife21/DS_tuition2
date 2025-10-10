import { mockAnnouncements } from "../utils/mockData";

export const getCourseAnnouncements = async (courseId) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return mockAnnouncements.filter((a) => a.courseId === courseId);
};

export const getAllAnnouncements = async () => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return mockAnnouncements;
};
