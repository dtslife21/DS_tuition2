import axios from "axios";
import { mockCourses, mockStudents } from "../utils/mockData";
import normalizeStudent, { getAllStudents } from "./studentService";
import { getStudentAttendance } from "./attendanceService";

const normalizeSubjectEntry = (entry) => {
  if (!entry) return null;

  if (typeof entry === "string") {
    const trimmed = entry.trim();
    return trimmed.length ? trimmed : null;
  }

  if (typeof entry === "object") {
    const name =
      entry.name ??
      entry.Name ??
      entry.subjectName ??
      entry.SubjectName ??
      entry.title ??
      entry.Title ??
      entry.code ??
      entry.Code ??
      null;

    if (typeof name === "string") {
      const trimmed = name.trim();
      return trimmed.length ? trimmed : null;
    }
  }

  return null;
};

const collectSubjects = (course) => {
  if (!course || typeof course !== "object") {
    return [];
  }

  const sources = [
    course.subjects,
    course.Subjects,
    course.courseSubjects,
    course.CourseSubjects,
    course.subjectList,
    course.SubjectList,
    course.subjectNames,
    course.SubjectNames,
  ];

  const collected = [];

  for (const source of sources) {
    if (!source) continue;

    if (Array.isArray(source)) {
      collected.push(...source);
      continue;
    }

    if (typeof source === "string") {
      collected.push(
        ...source
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      );
      continue;
    }

    if (typeof source === "object") {
      collected.push(...Object.values(source));
    }
  }

  const normalized = collected
    .map((entry) => normalizeSubjectEntry(entry))
    .filter(Boolean);

  if (!normalized.length) {
    return [];
  }

  const unique = Array.from(new Set(normalized));
  return unique;
};

const normalizeCourse = (course) => {
  if (!course || typeof course !== "object") {
    return course;
  }

  const teacher = course.teacher || course.Teacher || {};
  const subjectObj = course.subject || course.Subject || {};

  const subjectName =
    typeof course.subject === "string"
      ? course.subject
      : typeof course.Subject === "string"
      ? course.Subject
      : subjectObj.name ||
        subjectObj.Name ||
        course.subjectName ||
        course.SubjectName ||
        subjectObj.title ||
        subjectObj.Title ||
        "";

  const teacherId =
    course.teacherId ??
    course.teacherID ??
    course.TeacherId ??
    course.TeacherID ??
    teacher.id ??
    teacher.Id ??
    teacher.teacherId ??
    teacher.TeacherId ??
    null;

  const subjects = collectSubjects(course);

  return {
    id:
      course.id ??
      course.courseId ??
      course.courseID ??
      course.CourseId ??
      course.CourseID ??
      null,
    name: course.name ?? course.courseName ?? course.CourseName ?? "",
    code: course.code ?? course.courseCode ?? course.CourseCode ?? "",
    subject: subjectName,
    subjectId:
      course.subjectId ??
      course.subjectID ??
      course.SubjectId ??
      course.SubjectID ??
      subjectObj.id ??
      subjectObj.Id ??
      null,
    teacherId,
    academicYear:
      course.academicYear ?? course.AcademicYear ?? course.academic_year ?? "",
    description:
      course.description ??
      course.Description ??
      course.courseDescription ??
      "",
    subjects: subjects.length
      ? subjects
      : subjectName
      ? [subjectName].filter(Boolean)
      : [],
  };
};

const resolveCourseIdentifiers = (course, fallbackId = null) => {
  const source = course || {};
  const courseId =
    source.CourseID ??
    source.courseID ??
    source.CourseId ??
    source.courseId ??
    source.id ??
    fallbackId ??
    null;

  const courseName =
    source.CourseName ??
    source.courseName ??
    source.name ??
    source.CourseTitle ??
    source.courseTitle ??
    "";

  const courseCode =
    source.CourseCode ?? source.courseCode ?? source.code ?? source.Code ?? "";

  return {
    CourseID: courseId,
    CourseName: courseName,
    CourseCode: courseCode,
  };
};

const transformEnrollmentToStudent = (enrollment, course) => {
  if (!enrollment || typeof enrollment !== "object") {
    return null;
  }

  const studentPayload =
    enrollment.Student ??
    enrollment.student ??
    enrollment.StudentDetails ??
    enrollment.studentDetails ??
    null;

  if (!studentPayload || typeof studentPayload !== "object") {
    return null;
  }

  const mergedStudent = {
    ...studentPayload,
    EnrollmentID:
      enrollment.EnrollmentID ??
      enrollment.enrollmentID ??
      enrollment.id ??
      studentPayload.EnrollmentID,
    EnrollmentDate:
      enrollment.EnrollmentDate ??
      enrollment.enrollmentDate ??
      studentPayload.EnrollmentDate,
  };

  if (!mergedStudent.User && studentPayload.User) {
    mergedStudent.User = studentPayload.User;
  }

  const normalized = normalizeStudent(mergedStudent);
  if (!normalized) {
    return null;
  }

  const enrollmentId =
    enrollment.EnrollmentID ??
    enrollment.enrollmentID ??
    enrollment.id ??
    normalized.EnrollmentID ??
    null;

  if (enrollmentId !== null && enrollmentId !== undefined) {
    normalized.EnrollmentID = enrollmentId;
    normalized.enrollmentId = enrollmentId;
  }

  const enrollmentDate =
    enrollment.EnrollmentDate ??
    enrollment.enrollmentDate ??
    normalized.EnrollmentDate ??
    null;
  normalized.EnrollmentDate = enrollmentDate;

  const meta = resolveCourseIdentifiers(course, normalized.CourseID);
  if (meta.CourseID !== null && meta.CourseID !== undefined) {
    normalized.CourseID = meta.CourseID;
    normalized.courseId = meta.CourseID;
  }
  if (meta.CourseName) {
    normalized.CourseName = meta.CourseName;
    normalized.courseName = meta.CourseName;
  }
  if (meta.CourseCode) {
    normalized.CourseCode = meta.CourseCode;
    normalized.courseCode = meta.CourseCode;
  }

  return normalized;
};

const flattenCoursesStudentResponse = (courses) => {
  if (!Array.isArray(courses)) {
    return [];
  }

  const collected = [];
  const seen = new Set();

  for (const course of courses) {
    const entries =
      course?.Students ??
      course?.students ??
      course?.Enrollments ??
      course?.enrollments ??
      [];

    const meta = resolveCourseIdentifiers(course);

    for (const entry of entries) {
      let normalized = null;

      if (
        entry &&
        typeof entry === "object" &&
        (entry.Student || entry.student)
      ) {
        normalized = transformEnrollmentToStudent(entry, meta);
      } else {
        normalized = normalizeStudent(entry);
        if (normalized) {
          if (!normalized.CourseID && meta.CourseID !== null) {
            normalized.CourseID = meta.CourseID;
            normalized.courseId = meta.CourseID;
          }
          if (!normalized.CourseName && meta.CourseName) {
            normalized.CourseName = meta.CourseName;
            normalized.courseName = meta.CourseName;
          }
          if (!normalized.CourseCode && meta.CourseCode) {
            normalized.CourseCode = meta.CourseCode;
            normalized.courseCode = meta.CourseCode;
          }
        }
      }

      if (!normalized) {
        continue;
      }

      const keySource =
        normalized.StudentID ??
        normalized.studentId ??
        normalized.UserID ??
        normalized.userId ??
        normalized.id ??
        null;

      const key = keySource !== null ? String(keySource) : null;
      if (key && seen.has(key)) {
        continue;
      }
      if (key) {
        seen.add(key);
      }

      collected.push(normalized);
    }
  }

  return collected;
};

const dedupeStudents = (students) => {
  if (!Array.isArray(students)) {
    return [];
  }

  const result = [];
  const seen = new Set();

  for (const student of students) {
    if (!student) {
      continue;
    }

    const keySource =
      student.StudentID ??
      student.studentId ??
      student.UserID ??
      student.userId ??
      student.id ??
      null;

    const key = keySource !== null ? String(keySource) : null;
    if (key && seen.has(key)) {
      continue;
    }
    if (key) {
      seen.add(key);
    }

    result.push(student);
  }

  return result;
};

const fetchCourseStudentsLegacy = async (courseId) => {
  if (courseId === undefined || courseId === null) {
    return [];
  }

  const courseIdStr = String(courseId).trim();
  if (!courseIdStr) {
    return [];
  }

  try {
    const response = await axios.get(`/Courses/${courseIdStr}/students`);
    const raw = Array.isArray(response.data)
      ? response.data
      : response.data?.students ||
        response.data?.Students ||
        response.data?.data ||
        [];

    const normalized = raw
      .map((entry) => {
        if (
          entry &&
          typeof entry === "object" &&
          (entry.Student || entry.student)
        ) {
          return transformEnrollmentToStudent(entry, {
            CourseID: courseIdStr,
          });
        }

        const resolved = normalizeStudent(entry);
        if (resolved) {
          if (!resolved.CourseID) {
            resolved.CourseID = courseIdStr;
            resolved.courseId = courseIdStr;
          }
          if (!resolved.CourseName) {
            resolved.CourseName = entry?.CourseName ?? entry?.courseName ?? "";
            resolved.courseName = resolved.CourseName;
          }
          if (!resolved.CourseCode) {
            resolved.CourseCode = entry?.CourseCode ?? entry?.courseCode ?? "";
            resolved.courseCode = resolved.CourseCode;
          }
        }
        return resolved;
      })
      .filter(Boolean);

    return dedupeStudents(normalized);
  } catch (error) {
    return [];
  }
};

const mapCourseToApiPayload = (courseData) => {
  const payload = {
    CourseID:
      courseData.courseID ??
      courseData.courseId ??
      courseData.CourseId ??
      courseData.CourseID ??
      courseData.id ??
      undefined,
    CourseName:
      courseData.name ?? courseData.courseName ?? courseData.CourseName ?? "",
    CourseCode:
      courseData.code ?? courseData.courseCode ?? courseData.CourseCode ?? "",
    Description:
      courseData.description ??
      courseData.Description ??
      courseData.courseDescription ??
      "",
    AcademicYear:
      courseData.academicYear ??
      courseData.AcademicYear ??
      courseData.academic_year ??
      "",
    TeacherID:
      courseData.teacherId ??
      courseData.teacherID ??
      courseData.TeacherId ??
      courseData.TeacherID ??
      courseData.teacher?.id ??
      courseData.teacher?.Id ??
      courseData.teacher?.teacherId ??
      courseData.teacher?.TeacherId ??
      null,
    SubjectID:
      courseData.subjectId ??
      courseData.subjectID ??
      courseData.SubjectId ??
      courseData.SubjectID ??
      courseData.subject?.id ??
      courseData.subject?.Id ??
      null,
    SubjectName:
      courseData.subjectName ??
      courseData.subject?.name ??
      courseData.subject?.Name ??
      (typeof courseData.subject === "string" ? courseData.subject : undefined),
  };

  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );
};

// API-backed course service functions with mock fallbacks
export const getTeacherCourses = async (teacherId) => {
  const hasTeacherId = teacherId !== undefined && teacherId !== null;

  if (hasTeacherId) {
    try {
      const response = await axios.get(`/Courses/teacher/${teacherId}`);
      const raw = Array.isArray(response.data)
        ? response.data
        : response.data?.courses ||
          response.data?.Courses ||
          (response.data ? [response.data] : []);
      const normalized = raw.map(normalizeCourse).filter(Boolean);

      if (normalized.length) {
        return normalized;
      }
    } catch (error) {
      console.warn(
        "Teacher course endpoint unavailable, falling back to full course list",
        error
      );
    }
  }

  try {
    const response = await axios.get("/Courses");
    const courses = Array.isArray(response.data)
      ? response.data.map(normalizeCourse).filter(Boolean)
      : [];

    if (!hasTeacherId) {
      return courses;
    }

    return courses.filter(
      (course) => String(course.teacherId) === String(teacherId)
    );
  } catch (error) {
    console.error(
      "Failed to load teacher courses from API, using mocks",
      error
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockCourses.filter((course) => course.teacherId === teacherId);
  }
};

export const getTeacherCourseStudents = async (teacherId, courseId) => {
  if (
    teacherId === undefined ||
    teacherId === null ||
    courseId === undefined ||
    courseId === null
  ) {
    return { course: null, students: [] };
  }

  const teacherStr = String(teacherId).trim();
  const courseStr = String(courseId).trim();

  if (!teacherStr || !courseStr) {
    return { course: null, students: [] };
  }

  try {
    const response = await axios.get(
      `/Teachers/${teacherStr}/Courses/${courseStr}/Students`
    );
    const payload =
      response.data && typeof response.data === "object" ? response.data : {};

    const identifiers = resolveCourseIdentifiers(payload, courseStr);
    const students = flattenCoursesStudentResponse([
      {
        ...payload,
        CourseID: identifiers.CourseID ?? payload.CourseID ?? courseStr,
        CourseName: identifiers.CourseName ?? payload.CourseName,
        CourseCode: identifiers.CourseCode ?? payload.CourseCode,
      },
    ]);

    const normalizedCourse = normalizeCourse({
      ...payload,
      CourseID: identifiers.CourseID ?? payload.CourseID ?? courseStr,
      CourseName: identifiers.CourseName ?? payload.CourseName,
      CourseCode: identifiers.CourseCode ?? payload.CourseCode,
    });

    const courseInfo = normalizedCourse
      ? {
          ...normalizedCourse,
          CourseID:
            identifiers.CourseID ?? normalizedCourse.CourseID ?? courseStr,
          CourseName:
            identifiers.CourseName ??
            normalizedCourse.CourseName ??
            normalizedCourse.name ??
            "",
          CourseCode:
            identifiers.CourseCode ??
            normalizedCourse.CourseCode ??
            normalizedCourse.code ??
            "",
        }
      : {
          id: identifiers.CourseID ?? courseStr,
          CourseID: identifiers.CourseID ?? courseStr,
          name: identifiers.CourseName ?? "",
          CourseName: identifiers.CourseName ?? "",
          code: identifiers.CourseCode ?? "",
          CourseCode: identifiers.CourseCode ?? "",
        };

    return {
      course: courseInfo,
      students,
    };
  } catch (error) {
    console.error(
      "Failed to load teacher course students via teacher route",
      error
    );
    throw error;
  }
};

export const getTeacherCoursesWithStudents = async (teacherId) => {
  if (teacherId === undefined || teacherId === null) {
    return [];
  }

  const teacherStr = String(teacherId).trim();
  if (!teacherStr) {
    return [];
  }

  try {
    const response = await axios.get(
      `/Teachers/${teacherStr}/Courses/Students`
    );
    const rawCourses = Array.isArray(response.data)
      ? response.data
      : response.data?.courses ||
        response.data?.Courses ||
        response.data?.data ||
        [];

    return rawCourses.map((coursePayload) => {
      const identifiers = resolveCourseIdentifiers(coursePayload);
      const students = flattenCoursesStudentResponse([
        {
          ...coursePayload,
          CourseID: identifiers.CourseID ?? coursePayload.CourseID,
          CourseName: identifiers.CourseName ?? coursePayload.CourseName,
          CourseCode: identifiers.CourseCode ?? coursePayload.CourseCode,
        },
      ]);

      const normalizedCourse = normalizeCourse({
        ...coursePayload,
        CourseID: identifiers.CourseID ?? coursePayload.CourseID,
        CourseName: identifiers.CourseName ?? coursePayload.CourseName,
        CourseCode: identifiers.CourseCode ?? coursePayload.CourseCode,
      });

      const courseInfo = normalizedCourse
        ? {
            ...normalizedCourse,
            CourseID: identifiers.CourseID ?? normalizedCourse.CourseID ?? null,
            CourseName:
              identifiers.CourseName ??
              normalizedCourse.CourseName ??
              normalizedCourse.name ??
              "",
            CourseCode:
              identifiers.CourseCode ??
              normalizedCourse.CourseCode ??
              normalizedCourse.code ??
              "",
          }
        : {
            id: identifiers.CourseID ?? null,
            CourseID: identifiers.CourseID ?? null,
            name: identifiers.CourseName ?? "",
            CourseName: identifiers.CourseName ?? "",
            code: identifiers.CourseCode ?? "",
            CourseCode: identifiers.CourseCode ?? "",
          };

      return {
        course: courseInfo,
        students,
      };
    });
  } catch (error) {
    console.error(
      "Failed to load teacher courses with students via teacher route",
      error
    );
    throw error;
  }
};

export const getTeacherStudents = async (teacherOrCourseId, options = {}) => {
  const scope = options.scope ?? "auto";
  const explicitTeacherId =
    options.teacherId !== undefined ? options.teacherId : null;
  const explicitCourseId =
    options.courseId !== undefined ? options.courseId : null;

  const hasIdentifier =
    teacherOrCourseId !== undefined && teacherOrCourseId !== null;
  const identifierStr = hasIdentifier ? String(teacherOrCourseId).trim() : null;

  const teacherCandidate =
    explicitTeacherId !== null && explicitTeacherId !== undefined
      ? explicitTeacherId
      : scope !== "course"
      ? teacherOrCourseId
      : null;

  const courseCandidate =
    explicitCourseId !== null && explicitCourseId !== undefined
      ? explicitCourseId
      : scope === "course"
      ? teacherOrCourseId
      : null;

  const teacherIdStr =
    teacherCandidate !== null && teacherCandidate !== undefined
      ? String(teacherCandidate).trim()
      : null;
  const courseIdStr =
    courseCandidate !== null && courseCandidate !== undefined
      ? String(courseCandidate).trim()
      : null;

  if (scope === "course" && courseIdStr) {
    const legacy = await fetchCourseStudentsLegacy(courseIdStr);
    if (legacy.length) {
      return legacy;
    }
  }

  if (teacherIdStr && courseIdStr) {
    try {
      const { students } = await getTeacherCourseStudents(
        teacherIdStr,
        courseIdStr
      );
      if (students.length) {
        return students;
      }
    } catch (error) {
      // continue to other strategies
    }
  }

  if (teacherIdStr) {
    try {
      const grouped = await getTeacherCoursesWithStudents(teacherIdStr);
      const flattened = dedupeStudents(
        grouped.flatMap(({ course, students }) => {
          if (!Array.isArray(students)) {
            return [];
          }
          const meta = resolveCourseIdentifiers(course);
          return students.map((student) => {
            if (!student) {
              return null;
            }
            const enriched = { ...student };
            if (meta.CourseID !== null && meta.CourseID !== undefined) {
              enriched.CourseID = meta.CourseID;
              enriched.courseId = meta.CourseID;
            }
            if (meta.CourseName) {
              enriched.CourseName = meta.CourseName;
              enriched.courseName = meta.CourseName;
            }
            if (meta.CourseCode) {
              enriched.CourseCode = meta.CourseCode;
              enriched.courseCode = meta.CourseCode;
            }
            return enriched;
          });
        })
      ).filter(Boolean);

      if (flattened.length) {
        return flattened;
      }
    } catch (error) {
      // continue to legacy approaches
    }
  }

  if (courseIdStr || (scope !== "course" && identifierStr && !teacherIdStr)) {
    const fallbackCourseId = courseIdStr || identifierStr;
    const legacy = await fetchCourseStudentsLegacy(fallbackCourseId);
    if (legacy.length) {
      return legacy;
    }
  }

  if (teacherIdStr) {
    try {
      const courses = await getTeacherCourses(teacherIdStr);
      if (Array.isArray(courses) && courses.length) {
        const aggregated = [];
        for (const course of courses) {
          const cid =
            course?.id ??
            course?.CourseID ??
            course?.courseID ??
            course?.CourseId ??
            course?.courseId;
          if (!cid) {
            continue;
          }
          const students = await fetchCourseStudentsLegacy(cid);
          if (students.length) {
            aggregated.push(...students);
          }
        }
        if (aggregated.length) {
          return dedupeStudents(aggregated);
        }
      }
    } catch (_) {
      // ignore and continue to last-resort fallback
    }
  }

  try {
    const students = await getAllStudents();
    if (!teacherIdStr && !courseIdStr) {
      return students;
    }

    if (teacherIdStr) {
      try {
        const courses = await getTeacherCourses(teacherIdStr);
        if (Array.isArray(courses) && courses.length) {
          const courseIdSet = new Set(
            courses
              .map(
                (course) =>
                  course?.id ??
                  course?.CourseID ??
                  course?.courseID ??
                  course?.CourseId ??
                  course?.courseId
              )
              .filter((value) => value !== undefined && value !== null)
              .map((value) => String(value))
          );

          const filtered = students.filter((student) => {
            const associatedCourses =
              student.Courses ??
              student.courses ??
              student.CourseAssignments ??
              student.courseAssignments ??
              [];

            if (
              !Array.isArray(associatedCourses) ||
              !associatedCourses.length
            ) {
              return false;
            }

            return associatedCourses.some((course) =>
              courseIdSet.has(
                String(
                  course?.CourseID ??
                    course?.courseID ??
                    course?.courseId ??
                    course?.id
                )
              )
            );
          });

          return filtered;
        }
      } catch (_) {
        return [];
      }

      return [];
    }

    return [];
  } catch (error) {
    console.error("Failed to load students, using mocks", error);
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!teacherIdStr && !courseIdStr) {
      return mockStudents;
    }

    return [];
  }
};

export const getCourseDetails = async (courseId) => {
  try {
    const response = await axios.get(`/Courses/${courseId}`);
    return normalizeCourse(response.data);
  } catch (error) {
    console.error("Failed to load course details from API, using mock", error);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const cid = Number(courseId);
    return mockCourses.find((course) => course.id === cid);
  }
};

export const getAllCourses = async () => {
  try {
    const response = await axios.get("/Courses");
    const courses = Array.isArray(response.data)
      ? response.data.map(normalizeCourse)
      : [];

    if (!courses.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockCourses;
    }

    return courses;
  } catch (error) {
    console.error("Failed to load courses from API, using mocks", error);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockCourses;
  }
};

// Fetch courses for a specific student. Tries dedicated endpoints first, then
// falls back to deriving enrollment from attendance records and full course list.
export const getStudentCourses = async (studentId) => {
  const hasId = studentId !== undefined && studentId !== null;
  const idStr = hasId ? String(studentId).trim() : null;

  if (!hasId || !idStr) {
    return [];
  }

  // 0) Prefer backend enrollments endpoint that returns courses for a student
  try {
    const response = await axios.get(`/Enrollments/Student/${idStr}`);
    const raw = Array.isArray(response.data) ? response.data : [];
    const courses = raw
      .map((enrollment) => enrollment.Course || enrollment.course)
      .filter(Boolean)
      .map(normalizeCourse)
      .filter(Boolean);
    if (courses.length) {
      return courses;
    }
  } catch (_) {
    // continue to fallback candidates
  }

  // 1) Try dedicated endpoints
  const candidateEndpoints = [
    `/Courses/student/${idStr}`,
    `/Courses/Student/${idStr}`,
    `/Courses/by-student/${idStr}`,
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await axios.get(endpoint);
      const raw = Array.isArray(response.data)
        ? response.data
        : response.data?.courses || response.data?.Courses || [];
      const normalized = raw.map(normalizeCourse).filter(Boolean);
      if (normalized.length) {
        return normalized;
      }
    } catch (_) {
      // try next endpoint
    }
  }

  // 2) Derive from attendance records combined with full course list
  try {
    const [attendance, allCourses] = await Promise.all([
      getStudentAttendance(idStr),
      getAllCourses(),
    ]);

    const courseIdSet = new Set(
      attendance
        .map((a) => a.courseId ?? a.CourseID)
        .filter((v) => v !== undefined && v !== null)
        .map((v) => String(v))
    );

    const scoped = allCourses.filter((c) => courseIdSet.has(String(c.id)));
    if (scoped.length) {
      return scoped;
    }
  } catch (_) {
    // ignore and continue to last resort
  }

  // 3) Last resort: mocks cannot infer enrollment reliably, return empty to avoid leaking unrelated courses
  return [];
};

export const createCourse = async (courseData) => {
  try {
    const payload = mapCourseToApiPayload(courseData);
    const response = await axios.post("/Courses", payload);
    return normalizeCourse(response.data);
  } catch (error) {
    console.error(
      "Failed to create course via API, using mock fallback",
      error
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    const nextId =
      Math.max(0, ...mockCourses.map((course) => Number(course.id) || 0)) + 1;
    const newCourse = {
      id: nextId,
      ...courseData,
    };
    mockCourses.push(newCourse);
    return newCourse;
  }
};

// Real service functions (reference)
/*
export const getTeacherCourses = async (teacherId) => {
  const response = await axios.get(`/Courses/teacher/${teacherId}`);
  return response.data;
};

export const getCourseDetails = async (courseId) => {
  const response = await axios.get(`/Courses/${courseId}`);
  return response.data;
};
*/
