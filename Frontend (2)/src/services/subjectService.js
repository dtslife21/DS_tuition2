import axios from "axios";
import { getAllCourses } from "./courseService";

const mapSubject = (raw) => {
  if (!raw) return null;
  return {
    id:
      raw.id ??
      raw.SubjectID ??
      raw.SubjectId ??
      raw.subjectID ??
      raw.subjectId ??
      raw.subject_id ??
      null,
    name:
      raw.name ??
      raw.subjectName ??
      raw.SubjectName ??
      raw.title ??
      raw.Title ??
      "",
    // keep both common shapes for code to support edit forms and duplicate checks
    subjectCode:
      raw.subjectCode ?? raw.SubjectCode ?? raw.code ?? raw.Code ?? "",
    courseName:
      raw.courseName ?? raw.CourseName ?? raw.course ?? raw.courseTitle ?? "",
    description: raw.description ?? raw.Description ?? raw.details ?? "",
  };
};

export const getAllSubjects = async () => {
  try {
    const resp = await axios.get("/Subjects");
    const raw = Array.isArray(resp.data)
      ? resp.data
      : resp.data?.subjects || [];
    const subjects = raw.map(mapSubject).filter(Boolean);
    if (subjects.length) return subjects;
  } catch (_) {
    // ignore and attempt course-derived fallback below
  }

  try {
    const courses = await getAllCourses();
    const fromCourses = [];
    for (const c of courses || []) {
      const subjects =
        c.subjects ||
        c.Subjects ||
        c.subjectList ||
        c.subjectNames ||
        c.SubjectNames ||
        [];
      if (c.subject || c.Subject) {
        const sname = c.subject || c.Subject;
        fromCourses.push({
          id: `${c.id}-primary-${sname}`,
          name: sname,
          courseName: c.name || c.CourseName || "",
        });
      }
      if (Array.isArray(subjects) && subjects.length) {
        for (const s of subjects) {
          const name =
            typeof s === "string"
              ? s
              : s.name ?? s.subjectName ?? s.SubjectName ?? s.Title ?? s.title;
          if (name) {
            fromCourses.push({
              id: `${c.id}-${name}`,
              name,
              courseName: c.name || c.CourseName || "",
            });
          }
        }
      }
    }

    const map = new Map();
    for (const s of fromCourses) {
      const key = `${String(s.name || "").toLowerCase()}|${String(
        s.courseName || ""
      ).toLowerCase()}`;
      if (!map.has(key)) map.set(key, mapSubject(s));
    }
    return Array.from(map.values());
  } catch (_) {
    return [];
  }
};

export const createSubject = async (subjectData) => {
  try {
    const resp = await axios.post("/Subjects", subjectData);
    return mapSubject(resp.data);
  } catch (err) {
    console.error("Failed to create subject via API", err);
    throw err;
  }
};

export const deleteSubject = async (subjectId) => {
  try {
    await axios.delete(`/Subjects/${subjectId}`);
    return true;
  } catch (err) {
    console.error("Failed to delete subject via API", err);
    throw err;
  }
};

export const getSubjectById = async (subjectId) => {
  try {
    const resp = await axios.get(`/Subjects/${subjectId}`);
    return mapSubject(resp.data);
  } catch (err) {
    // fallback: search in derived subject list
    const all = await getAllSubjects();
    return all.find((s) => String(s.id) === String(subjectId)) || null;
  }
};

// Update an existing subject
export const updateSubject = async (subjectId, data) => {
  try {
    const payload = {
      subjectId: subjectId,
      SubjectID: subjectId,
      id: subjectId,
      subjectName: data.subjectName ?? data.SubjectName ?? data.name,
      SubjectName: data.subjectName ?? data.SubjectName ?? data.name,
      name: data.name ?? data.subjectName ?? data.SubjectName,
      subjectCode: data.subjectCode ?? data.SubjectCode ?? data.code,
      SubjectCode: data.subjectCode ?? data.SubjectCode ?? data.code,
      code: data.subjectCode ?? data.SubjectCode ?? data.code,
      Code: data.subjectCode ?? data.SubjectCode ?? data.code,
      description: data.description ?? data.Description,
      Description: data.description ?? data.Description,
      courseName: data.courseName ?? data.CourseName,
      CourseName: data.courseName ?? data.CourseName,
    };
    const resp = await axios.put(`/Subjects/${subjectId}`, payload);
    return mapSubject(resp.data || payload);
  } catch (err) {
    console.error("Failed to update subject via API", err);
    throw err;
  }
};

// Fetch latest subject id from backend with flexible endpoint detection
export const getLatestSubjectId = async () => {
  const endpoints = [
    "/Subjects/LatestId",
    "/subjects/LatestId",
    "/Subjects/latest",
    "/api/Subjects/LatestId",
  ];

  for (const ep of endpoints) {
    try {
      const resp = await axios.get(ep);
      const data = resp?.data ?? {};
      const id =
        data.latestSubjectId ?? data.latestId ?? data.SubjectID ?? data.id;
      if (id !== undefined && id !== null && String(id).trim() !== "") {
        return Number(id);
      }
    } catch (_) {
      // try next endpoint
    }
  }

  // fallback: derive from subjects list
  try {
    const subjects = await getAllSubjects();
    const maxId = Math.max(
      0,
      ...subjects
        .map((s) => Number(s.id ?? s.SubjectID ?? s.subjectId ?? 0))
        .filter((n) => !Number.isNaN(n))
    );
    return maxId || null;
  } catch (_) {
    return null;
  }
};

export default {
  getAllSubjects,
  createSubject,
  deleteSubject,
  getSubjectById,
  getLatestSubjectId,
  updateSubject,
};
