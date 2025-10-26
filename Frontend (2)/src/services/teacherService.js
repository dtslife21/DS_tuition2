import axios from "axios";

export const createTeacher = async (teacherData) => {
  const response = await axios.post("/Teachers", teacherData);
  return response.data;
};

export const getAllTeachers = async () => {
  const response = await axios.get("/Teachers");
  return response.data;
};
