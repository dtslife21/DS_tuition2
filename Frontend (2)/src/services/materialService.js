import axios from "axios";

const RESOURCE_BASE = "/studymaterials";

const getCurrentTeacherId = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    const id =
      user?.TeacherID ??
      user?.teacherID ??
      user?.teacherId ??
      user?.UserID ??
      user?.userID ??
      user?.userId ??
      user?.id ??
      null;
    return id != null ? String(id) : null;
  } catch (_) {
    return null;
  }
};

const filterVisibleMaterials = (materials = []) =>
  materials.filter((material) => {
    if (!material || typeof material !== "object") {
      return false;
    }

    const visibility =
      material.isVisible ??
      material.IsVisible ??
      material.raw?.IsVisible ??
      material.raw?.isVisible ??
      true;

    return visibility !== false;
  });

const mapMaterial = (material) => {
  if (!material || typeof material !== "object") {
    return null;
  }

  const course =
    material.Course ||
    material.course ||
    material.CourseDetails ||
    material.courseDetails ||
    {};

  const teacher =
    material.Teacher ||
    material.teacher ||
    material.TeacherDetails ||
    material.teacherDetails ||
    {};

  const resolvedId =
    material.MaterialID ??
    material.materialID ??
    material.MaterialId ??
    material.materialId ??
    material.id ??
    null;

  const courseId =
    material.CourseID ??
    material.courseID ??
    material.courseId ??
    course.CourseID ??
    course.courseID ??
    course.courseId ??
    course.id ??
    null;

  const teacherId =
    material.TeacherID ??
    material.teacherID ??
    material.teacherId ??
    teacher.TeacherID ??
    teacher.teacherID ??
    teacher.teacherId ??
    teacher.id ??
    null;

  const title =
    material.Title ??
    material.title ??
    material.name ??
    material.documentTitle ??
    "";
  const description =
    material.Description ??
    material.description ??
    material.Details ??
    material.details ??
    "";
  const filePath =
    material.FilePath ??
    material.filePath ??
    material.FileUrl ??
    material.fileUrl ??
    material.Url ??
    material.URL ??
    material.path ??
    "";
  const fileType =
    material.FileType ??
    material.fileType ??
    material.Type ??
    material.type ??
    (filePath ? filePath.split(".").pop() : "");
  const uploadDate =
    material.UploadDate ??
    material.uploadDate ??
    material.CreatedAt ??
    material.createdAt ??
    material.timestamp ??
    new Date().toISOString();
  const isVisible =
    material.IsVisible ??
    material.isVisible ??
    material.Visible ??
    material.visible ??
    true;

  const materialRecord = {
    id: resolvedId ?? `${courseId ?? "course"}-${title || "material"}`,
    MaterialID: resolvedId ?? null,
    materialId: resolvedId ?? null,
    courseId,
    CourseID: courseId,
    teacherId,
    TeacherID: teacherId,
    title,
    Title: title,
    description,
    Description: description,
    filePath,
    FilePath: filePath,
    fileType,
    FileType: fileType,
    uploadDate: new Date(uploadDate).toISOString(),
    UploadDate: new Date(uploadDate).toISOString(),
    isVisible,
    IsVisible: isVisible,
    raw: material,
  };

  return materialRecord;
};

const extractMaterials = (payload) => {
  const list = (() => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === "object") {
      if (Array.isArray(payload.data)) {
        return payload.data;
      }
      if (Array.isArray(payload.materials)) {
        return payload.materials;
      }
      if (Array.isArray(payload.Materials)) {
        return payload.Materials;
      }
      if (Array.isArray(payload.items)) {
        return payload.items;
      }
      if (Array.isArray(payload.results)) {
        return payload.results;
      }
    }

    return [];
  })();

  return list.map(mapMaterial).filter(Boolean);
};

const fetchMaterials = async (url, config) => {
  const response = await axios.get(url, config);
  return extractMaterials(response.data);
};

const resolveIdentifier = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  return String(value).trim();
};

const isNotFound = (error) => error?.response?.status === 404;

const extractTeacherId = (material) => {
  const candidate =
    material?.TeacherID ??
    material?.teacherID ??
    material?.teacherId ??
    material?.raw?.TeacherID ??
    material?.raw?.teacherID ??
    material?.raw?.teacherId ??
    material?.raw?.Teacher?.TeacherID ??
    material?.raw?.Teacher?.teacherID ??
    material?.raw?.Teacher?.teacherId ??
    null;

  return candidate != null ? String(candidate) : null;
};

const extractCourseId = (material) => {
  const candidate =
    material?.CourseID ??
    material?.courseID ??
    material?.courseId ??
    material?.raw?.CourseID ??
    material?.raw?.courseID ??
    material?.raw?.courseId ??
    material?.raw?.Course?.CourseID ??
    material?.raw?.Course?.courseID ??
    material?.raw?.Course?.courseId ??
    material?.raw?.Course?.CourseId ??
    null;

  return candidate != null ? String(candidate) : null;
};

const filterByTeacher = (materials, teacherId) => {
  if (!teacherId) {
    return materials;
  }

  const teacherIdStr = String(teacherId);
  return materials.filter((material) => {
    const candidate = extractTeacherId(material);
    if (candidate === null) {
      return false;
    }
    return candidate === teacherIdStr;
  });
};

const collectStudentCollections = (material) => {
  const raw = material?.raw ?? {};
  const course = raw.Course ?? raw.course ?? {};
  const sources = [
    raw.Students,
    raw.students,
    raw.AssignedStudents,
    raw.assignedStudents,
    raw.EnrolledStudents,
    raw.enrolledStudents,
    raw.StudentMaterials,
    raw.studentMaterials,
    raw.StudentAssignments,
    raw.studentAssignments,
    course.Students,
    course.students,
    course.AssignedStudents,
    course.assignedStudents,
    course.Enrollments,
    course.enrollments,
    course.CourseStudents,
    course.courseStudents,
    course.StudentCourses,
    course.studentCourses,
  ];

  return sources.filter((value) => Array.isArray(value) && value.length);
};

const materialMatchesStudent = (material, studentId) => {
  const studentIdStr = String(studentId);
  const collections = collectStudentCollections(material);

  if (!collections.length) {
    return true;
  }

  for (const collection of collections) {
    for (const entry of collection) {
      const candidate =
        entry?.StudentID ??
        entry?.studentID ??
        entry?.StudentId ??
        entry?.studentId ??
        entry?.UserID ??
        entry?.userID ??
        entry?.userId ??
        entry?.Id ??
        entry?.id ??
        null;

      if (candidate != null && String(candidate) === studentIdStr) {
        return true;
      }
    }
  }

  return false;
};

const filterByStudent = (materials, studentId) => {
  if (!studentId) {
    return materials;
  }

  const filtered = materials.filter((material) =>
    materialMatchesStudent(material, studentId)
  );

  if (filtered.length) {
    return filtered;
  }

  return materials;
};

const getAllVisibleMaterialsFromApi = async () => {
  const materials = await fetchMaterials(RESOURCE_BASE);
  return filterVisibleMaterials(materials);
};

export const getCourseMaterials = async (courseId) => {
  const resolvedId = resolveIdentifier(courseId);

  if (!resolvedId) {
    return [];
  }

  const candidateEndpoints = [`${RESOURCE_BASE}/course/${resolvedId}`];

  for (const endpoint of candidateEndpoints) {
    try {
      const materials = await fetchMaterials(endpoint);
      const visible = filterVisibleMaterials(materials);
      // Show all visible materials for the course regardless of uploader/teacher
      return visible.filter(
        (material) => extractCourseId(material) === resolvedId
      );
    } catch (error) {
      if (isNotFound(error)) {
        return [];
      }
      console.warn(`Course materials endpoint failed (${endpoint})`, error);
    }
  }

  try {
    const materials = await getAllVisibleMaterialsFromApi();
    const courseMaterials = materials.filter(
      (material) => extractCourseId(material) === resolvedId
    );
    // Return all visible materials for the course
    return courseMaterials;
  } catch (error) {
    if (isNotFound(error)) {
      return [];
    }
    console.error("Failed to load course materials from API", error);
    throw error;
  }
};

export const getCourseMaterialsAll = async (courseId) => {
  const resolvedId = resolveIdentifier(courseId);

  if (!resolvedId) return [];
  // Try explicit "all" endpoint first (server should implement /course/{id}/all)
  const candidateEndpoints = [
    `${RESOURCE_BASE}/course/${resolvedId}/all`,
    `${RESOURCE_BASE}/course/${resolvedId}`,
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      const materials = await fetchMaterials(endpoint);
      // return raw materials (including invisible when supported)
      return materials.filter((m) => extractCourseId(m) === resolvedId);
    } catch (error) {
      if (isNotFound(error)) return [];
      console.warn(
        `Course materials (all) endpoint failed (${endpoint})`,
        error
      );
    }
  }

  try {
    const materials = await getAllMaterials();
    return materials.filter((m) => extractCourseId(m) === resolvedId);
  } catch (error) {
    if (isNotFound(error)) return [];
    console.error("Failed to load course materials (all) from API", error);
    throw error;
  }
};

export const getAllMaterials = async () => {
  try {
    // Prefer explicit "all" endpoint if available on server
    try {
      const response = await axios.get(`${RESOURCE_BASE}`); //all
      const list = extractMaterials(response.data);
      return list;
    } catch (err) {
      if (!isNotFound(err))
        console.warn(
          "/studymaterials/all not available, falling back to visible-only",
          err
        );
    }

    return await getAllVisibleMaterialsFromApi();
  } catch (error) {
    console.error("Failed to load study materials from API", error);
    throw error;
  }
};

export const getRecentMaterials = async (teacherId) => {
  const resolvedId = resolveIdentifier(teacherId);

  if (!resolvedId) {
    return [];
  }

  try {
    const materials = await getAllMaterials();
    const teacherMaterials = filterByTeacher(materials, resolvedId);
    return teacherMaterials
      .slice()
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
      .slice(0, 5);
  } catch (error) {
    if (isNotFound(error)) {
      return [];
    }
    console.error("Failed to load teacher materials from API", error);
    throw error;
  }
};

export const getStudentMaterials = async (studentId) => {
  const resolvedId = resolveIdentifier(studentId);

  if (!resolvedId) {
    return [];
  }

  // Prefer backend endpoint that returns materials for student enrollments
  try {
    const materials = await fetchMaterials(
      `${RESOURCE_BASE}/student/${resolvedId}`
    );
    return filterVisibleMaterials(materials);
  } catch (error) {
    if (isNotFound(error)) {
      return [];
    }
    // continue to fallback logic below
  }

  try {
    const materials = await getAllMaterials();
    return filterByStudent(materials, resolvedId);
  } catch (error) {
    if (isNotFound(error)) {
      return [];
    }
    console.error("Failed to load student materials from API", error);
    throw error;
  }
};

const mapMaterialPayload = (materialData) => {
  const payload = {
    MaterialID:
      materialData.MaterialID ??
      materialData.materialID ??
      materialData.materialId ??
      materialData.id ??
      undefined,
    CourseID:
      materialData.CourseID ??
      materialData.courseID ??
      materialData.courseId ??
      materialData.Course?.CourseID ??
      materialData.course?.id ??
      undefined,
    TeacherID:
      materialData.TeacherID ??
      materialData.teacherID ??
      materialData.teacherId ??
      materialData.Teacher?.TeacherID ??
      materialData.teacher?.id ??
      undefined,
    Title:
      materialData.Title ??
      materialData.title ??
      materialData.name ??
      undefined,
    Description:
      materialData.Description ??
      materialData.description ??
      materialData.details ??
      undefined,
    FilePath:
      materialData.FilePath ??
      materialData.filePath ??
      materialData.FileUrl ??
      materialData.fileUrl ??
      undefined,
    FileType:
      materialData.FileType ??
      materialData.fileType ??
      materialData.type ??
      undefined,
    UploadDate:
      materialData.UploadDate ??
      materialData.uploadDate ??
      materialData.createdAt ??
      materialData.CreatedAt ??
      undefined,
    IsVisible:
      materialData.IsVisible ??
      materialData.isVisible ??
      materialData.visible ??
      undefined,
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
};

export const uploadMaterial = async (materialData) => {
  try {
    const payload = mapMaterialPayload(materialData);
    if (!payload.UploadDate) {
      payload.UploadDate = new Date().toISOString();
    }
    if (payload.IsVisible === undefined) {
      payload.IsVisible = true;
    }

    const response = await axios.post(RESOURCE_BASE, payload);
    return mapMaterial(response.data) ?? response.data;
  } catch (error) {
    console.error("Failed to upload material via API", error);
    throw error;
  }
};

export const getMaterialById = async (materialId) => {
  const resolvedId = resolveIdentifier(materialId);

  if (!resolvedId) {
    return null;
  }

  try {
    const response = await axios.get(`${RESOURCE_BASE}/${resolvedId}`);
    return mapMaterial(response.data);
  } catch (error) {
    if (isNotFound(error)) {
      // Try the non-filtered endpoint if the server exposes it (e.g. /studymaterials/{id}/all)
      try {
        const resp2 = await axios.get(`${RESOURCE_BASE}/${resolvedId}/all`);
        return mapMaterial(resp2.data);
      } catch (err2) {
        if (isNotFound(err2)) return null;
        console.warn(`Fallback fetch for material ${resolvedId} failed`, err2);
        return null;
      }
    }
    console.error("Failed to load study material from API", error);
    throw error;
  }
};

export const updateMaterial = async (materialId, materialData) => {
  const resolvedId = resolveIdentifier(
    materialId ??
      materialData?.MaterialID ??
      materialData?.materialID ??
      materialData?.materialId ??
      materialData?.id
  );

  if (!resolvedId) {
    throw new Error("Material identifier is required for update");
  }

  if (!materialData || typeof materialData !== "object") {
    throw new Error("Material data is required for update");
  }

  const payload = mapMaterialPayload({
    ...materialData,
    MaterialID:
      materialData?.MaterialID ??
      materialData?.materialID ??
      materialData?.materialId ??
      materialData?.id ??
      resolvedId,
  });

  if (!payload.MaterialID) {
    const numericId = Number(resolvedId);
    payload.MaterialID = Number.isNaN(numericId) ? resolvedId : numericId;
  }

  try {
    await axios.put(`${RESOURCE_BASE}/${resolvedId}`, payload);
    const updated = await getMaterialById(resolvedId);
    return (
      updated ??
      mapMaterial({
        ...materialData,
        MaterialID: payload.MaterialID,
        materialId: payload.MaterialID,
        id: payload.MaterialID,
      })
    );
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    console.error("Failed to update study material via API", error);
    throw error;
  }
};

export const deleteMaterial = async (materialId) => {
  const resolvedId = resolveIdentifier(materialId);

  if (!resolvedId) {
    throw new Error("Material identifier is required for deletion");
  }

  try {
    const response = await axios.delete(`${RESOURCE_BASE}/${resolvedId}`);
    const data = response?.data ?? null;
    if (data) {
      return mapMaterial(data);
    }
    return mapMaterial({
      MaterialID: resolvedId,
      materialId: resolvedId,
      id: resolvedId,
      IsVisible: false,
      isVisible: false,
    });
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    console.error("Failed to delete study material via API", error);
    throw error;
  }
};
