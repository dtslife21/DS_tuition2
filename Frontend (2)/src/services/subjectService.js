import axios from "axios";
import { getAllCourses } from "./courseService";

// In-memory mock subjects (fallback when API not available).
const mockSubjects = [];

const normalizeSubject = (raw) => {
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
    const normalized = raw.map(normalizeSubject).filter(Boolean);
    if (normalized.length) return normalized;
  } catch (err) {
    // ignore and fallback
  }

  // Derive from courses + include mockSubjects
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
      // if course has a primary subject
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
          if (name)
            fromCourses.push({
              id: `${c.id}-${name}`,
              name,
              courseName: c.name || c.CourseName || "",
            });
        }
      }
    }

    // Merge dedupe by name+courseName
    const combined = [...mockSubjects, ...fromCourses];
    const map = new Map();
    for (const s of combined) {
      const key = `${String(s.name || "").toLowerCase()}|${String(
        s.courseName || ""
      ).toLowerCase()}`;
      if (!map.has(key)) map.set(key, normalizeSubject(s));
    }
    return Array.from(map.values());
  } catch (err) {
    // last resort, return mockSubjects normalized
    return mockSubjects.map(normalizeSubject);
  }
};

export const createSubject = async (subjectData) => {
  try {
    const resp = await axios.post("/Subjects", subjectData);
    return normalizeSubject(resp.data);
  } catch (err) {
    // fallback: push to mockSubjects
    const nextId =
      (mockSubjects.reduce((m, s) => Math.max(m, Number(s.id) || 0), 0) || 0) +
      1;
    const newSub = { id: nextId, ...subjectData };
    mockSubjects.push(newSub);
    return normalizeSubject(newSub);
  }
};

export const deleteSubject = async (subjectId) => {
  try {
    await axios.delete(`/Subjects/${subjectId}`);
    return true;
  } catch (err) {
    // fallback: remove from mockSubjects
    const idx = mockSubjects.findIndex(
      (s) => String(s.id) === String(subjectId)
    );
    if (idx !== -1) {
      mockSubjects.splice(idx, 1);
      return true;
    }
    return false;
  }
};

export const getSubjectById = async (subjectId) => {
  try {
    const resp = await axios.get(`/Subjects/${subjectId}`);
    return normalizeSubject(resp.data);
  } catch (err) {
    // fallback: search in mockSubjects or derived list
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
    return normalizeSubject(resp.data || payload);
  } catch (err) {
    // fallback: update in mockSubjects
    const idx = mockSubjects.findIndex(
      (s) => String(s.id) === String(subjectId)
    );
    if (idx !== -1) {
      mockSubjects[idx] = { ...mockSubjects[idx], ...data };
      return normalizeSubject(mockSubjects[idx]);
    }
    // if not found, attempt to merge into derived list by id
    const current = await getSubjectById(subjectId);
    if (current) {
      const merged = { ...current, ...data, id: current.id };
      return normalizeSubject(merged);
    }
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
