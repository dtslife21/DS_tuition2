import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCourseDetails,
  updateCourse,
  getTeacherCourseStudents,
  getTeacherStudents,
  deactivateCourse,
} from "../../services/courseService";
import { reactivateCourse } from "../../services/courseService";
import { getCourseStudents } from "../../services/courseService";
import { getCourseMaterials } from "../../services/materialService";
import { getCourseAttendance } from "../../services/attendanceService";
import { getUserById } from "../../services/userService";
import MaterialList from "../materials/MaterialList";
import AttendanceList from "../attendance/AttendanceList";
import Modal from "../common/Modal";
import StudentPickerModal from "../common/StudentPickerModal";
import CourseForm from "./CourseForm";
import MaterialForm from "../materials/MaterialForm";
import QRGenerator from "../attendance/QRGenerator";
import Loader from "../common/Loader";
import Button from "../common/Button";
import UserForm from "../users/UserForm";
import Avatar from "../common/Avatar";
import {
  createSubject,
  updateSubject,
  getAllSubjects,
  getStudentsBySubject,
} from "../../services/subjectService";
import {
  createEnrollment,
  createEnrollmentsForStudent,
  setEnrollmentActiveStatus,
} from "../../services/enrollmentService";
import { createStudent } from "../../services/studentService";
import { createUser } from "../../services/userService";
import Toast from "../common/Toast";

const CourseView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [teacher, setTeacher] = useState(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState(null);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [addingStudents, setAddingStudents] = useState(false);
  const [studentActionError, setStudentActionError] = useState("");
  const [studentsRefreshCounter, setStudentsRefreshCounter] = useState(0);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [pendingRegisterCore, setPendingRegisterCore] = useState(null);
  const [registerSelectedSubjectIds, setRegisterSelectedSubjectIds] = useState(
    []
  );
  const [registerSubjectError, setRegisterSubjectError] = useState("");
  const [showStudentMenu, setShowStudentMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [studentTab, setStudentTab] = useState("active");
  const [enrollmentLoadingMap, setEnrollmentLoadingMap] = useState({});
  const [subjectStudentGroups, setSubjectStudentGroups] = useState([]);
  const [selectedSubjectTab, setSelectedSubjectTab] = useState("all");

  // Ref for student menu wrapper to detect outside clicks
  const studentMenuRef = useRef(null);

  const normalizeIdString = useCallback((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const str = String(value).trim();
    if (!str) {
      return null;
    }

    if (/^-?\d+$/.test(str)) {
      const asNumber = Number(str);
      if (!Number.isNaN(asNumber)) {
        return String(asNumber);
      }
    }

    return str;
  }, []);

  const normalizedCourseId = useMemo(() => {
    const candidates = [
      course?.id,
      course?.CourseID,
      course?.courseID,
      course?.CourseId,
      course?.courseId,
      course?.course?.id,
      course?.Course?.id,
      id,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeIdString(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }, [
    course?.Course?.id,
    course?.CourseID,
    course?.CourseId,
    course?.course?.id,
    course?.courseID,
    course?.courseId,
    course?.id,
    id,
    normalizeIdString,
  ]);

  useEffect(() => {
    if (!showRegisterModal) {
      setRegisterStep(1);
      setPendingRegisterCore(null);
      setRegisterSelectedSubjectIds([]);
      setRegisterSubjectError("");
    }
  }, [showRegisterModal]);

  const normalizedCourseSubjectIdSet = useMemo(() => {
    const set = new Set();

    const pushCandidate = (candidate) => {
      if (candidate === null || candidate === undefined) {
        return;
      }

      if (Array.isArray(candidate)) {
        candidate.forEach(pushCandidate);
        return;
      }

      if (typeof candidate === "object") {
        const fields = [
          candidate.SubjectID,
          candidate.subjectID,
          candidate.SubjectId,
          candidate.subjectId,
          candidate.SubjectIDs,
          candidate.subjectIDs,
          candidate.SubjectIds,
          candidate.subjectIds,
          candidate.id,
          candidate.Id,
        ];

        fields.forEach((value) => {
          if (value === undefined || value === null) {
            return;
          }
          if (Array.isArray(value) || typeof value === "object") {
            pushCandidate(value);
            return;
          }
          const normalized = normalizeIdString(value);
          if (normalized) {
            set.add(normalized);
          }
        });
        return;
      }

      const normalized = normalizeIdString(candidate);
      if (normalized) {
        set.add(normalized);
      }
    };

    if (course && typeof course === "object") {
      const sources = [
        course.subjectIds,
        course.SubjectIDs,
        course.SubjectIds,
        course.subjectIDs,
        course.subjectId,
        course.SubjectID,
        course.SubjectId,
        course.subjectID,
        course.subjectDetails,
        course.SubjectDetails,
        course.subjects,
        course.Subjects,
        course.subjectList,
        course.SubjectList,
      ];

      sources.forEach(pushCandidate);
    }

    return set;
  }, [course, normalizeIdString]);

  const normalizedCourseSubjectNameSet = useMemo(() => {
    const set = new Set();

    const pushName = (candidate) => {
      if (!candidate) {
        return;
      }

      if (Array.isArray(candidate)) {
        candidate.forEach(pushName);
        return;
      }

      if (typeof candidate === "object") {
        const fields = [
          candidate.subjectName,
          candidate.SubjectName,
          candidate.name,
          candidate.Name,
          candidate.title,
          candidate.Title,
          candidate.SubjectTitle,
          candidate.subjectTitle,
        ];

        fields.forEach((value) => {
          if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (normalized) {
              set.add(normalized);
            }
            return;
          }
          if (Array.isArray(value) || typeof value === "object") {
            pushName(value);
          }
        });
        return;
      }

      if (typeof candidate === "string") {
        const normalized = candidate.trim().toLowerCase();
        if (normalized) {
          set.add(normalized);
        }
      }
    };

    if (course && typeof course === "object") {
      const sources = [
        course.subjects,
        course.Subjects,
        course.subjectList,
        course.SubjectList,
        course.subjectNames,
        course.SubjectNames,
        course.subjectDetails,
        course.SubjectDetails,
        course.subject,
        course.Subject,
      ];

      sources.forEach(pushName);
    }

    return set;
  }, [course]);

  const belongsToCurrentCourse = useCallback(
    (entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      let matchesCourse = !normalizedCourseId;

      if (normalizedCourseId) {
        const candidates = [
          entry.CourseID,
          entry.courseID,
          entry.CourseId,
          entry.courseId,
          entry?.Course?.CourseID,
          entry?.Course?.courseID,
          entry?.Course?.CourseId,
          entry?.Course?.courseId,
          entry?.course?.CourseID,
          entry?.course?.courseID,
          entry?.course?.CourseId,
          entry?.course?.courseId,
        ];

        for (const candidate of candidates) {
          const normalized = normalizeIdString(candidate);
          if (normalized && normalized === normalizedCourseId) {
            matchesCourse = true;
            break;
          }
        }

        if (!matchesCourse) {
          return false;
        }
      }

      const subjectIdSetSize = normalizedCourseSubjectIdSet.size;
      const subjectNameSetSize = normalizedCourseSubjectNameSet.size;

      if (subjectIdSetSize === 0 && subjectNameSetSize === 0) {
        return true;
      }

      let hasSubjectInfo = false;

      const subjectIdCandidates = [
        entry.SubjectID,
        entry.subjectID,
        entry.SubjectId,
        entry.subjectId,
        entry.CourseSubjectID,
        entry.courseSubjectID,
        entry.CourseSubjectId,
        entry.courseSubjectId,
        entry?.Subject?.SubjectID,
        entry?.Subject?.subjectID,
        entry?.Subject?.SubjectId,
        entry?.Subject?.subjectId,
        entry?.Subject?.id,
        entry?.Subject?.Id,
        entry?.subject?.SubjectID,
        entry?.subject?.subjectID,
        entry?.subject?.SubjectId,
        entry?.subject?.subjectId,
        entry?.subject?.id,
        entry?.subject?.Id,
      ];

      for (const candidate of subjectIdCandidates) {
        if (candidate === null || candidate === undefined) {
          continue;
        }
        hasSubjectInfo = true;
        const normalized = normalizeIdString(candidate);
        if (normalized && normalizedCourseSubjectIdSet.has(normalized)) {
          return true;
        }
      }

      const subjectNameCandidates = [
        entry.SubjectName,
        entry.subjectName,
        entry.CourseSubjectName,
        entry.courseSubjectName,
        entry?.Subject?.SubjectName,
        entry?.Subject?.subjectName,
        entry?.Subject?.name,
        entry?.Subject?.Name,
        entry?.Subject?.Title,
        entry?.Subject?.title,
        entry?.subject?.SubjectName,
        entry?.subject?.subjectName,
        entry?.subject?.name,
        entry?.subject?.Name,
        entry?.subject?.Title,
        entry?.subject?.title,
      ];

      for (const candidate of subjectNameCandidates) {
        if (typeof candidate !== "string") {
          continue;
        }
        const normalized = candidate.trim().toLowerCase();
        if (!normalized) {
          continue;
        }
        hasSubjectInfo = true;
        if (normalizedCourseSubjectNameSet.has(normalized)) {
          return true;
        }
      }

      if (!hasSubjectInfo) {
        return true;
      }

      return false;
    },
    [
      normalizeIdString,
      normalizedCourseId,
      normalizedCourseSubjectIdSet,
      normalizedCourseSubjectNameSet,
    ]
  );

  const normalizedStatus = course
    ? typeof course.status === "string"
      ? course.status.trim().toLowerCase()
      : typeof course.Status === "string"
      ? course.Status.trim().toLowerCase()
      : null
    : null;

  const isCourseActive = course
    ? course.isActive ??
      course.IsActive ??
      (normalizedStatus === null ? true : normalizedStatus !== "inactive")
    : true;

  const statusBadgeLabel = isCourseActive ? "Active" : "Inactive";

  const statusBadgeClassName = isCourseActive
    ? "px-3 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800"
    : "px-3 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-700 ring-1 ring-gray-300/60 dark:bg-gray-800/60 dark:text-gray-300 dark:ring-gray-700";

  // Close student menu when clicking outside of it
  useEffect(() => {
    if (!showStudentMenu) return;

    const handleDocumentClick = (event) => {
      const node = studentMenuRef.current;
      if (!node) return;
      // If the click is outside the menu wrapper, close the menu
      if (!node.contains(event.target)) {
        setShowStudentMenu(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [showStudentMenu]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseData, materialsData, attendanceData] = await Promise.all([
          getCourseDetails(id),
          getCourseMaterials(id),
          getCourseAttendance(id),
        ]);
        setCourse(courseData);
        setMaterials(materialsData);
        setAttendance(attendanceData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    let isActive = true;

    const resolveTeacherId = (u) => {
      if (!u || typeof u !== "object") return null;
      return (
        u.TeacherID ??
        u.teacherID ??
        u.teacherId ??
        u.UserID ??
        u.userID ??
        u.userId ??
        u.id ??
        null
      );
    };

    const fetchStudents = async () => {
      // Do not fetch or show students when the current user is a student
      if (user?.userType === "student") {
        setStudents([]);
        setStudentsLoading(false);
        setStudentsError(null);
        return;
      }

      if (!user) {
        setStudents([]);
        setStudentsLoading(false);
        setStudentsError(null);
        return;
      }

      setStudentsLoading(true);
      setStudentsError(null);
      try {
        // If the current user is a teacher, prefer teacher endpoints
        if (user?.userType === "teacher") {
          const teacherId = resolveTeacherId(user);
          if (teacherId) {
            try {
              const { students: scopedStudents } =
                await getTeacherCourseStudents(teacherId, id);
              if (!isActive) return;
              setStudents(
                (scopedStudents || []).filter(belongsToCurrentCourse)
              );
              return;
            } catch (err) {
              // fallback to course-scoped students
              console.warn(
                "Teacher route unavailable, falling back to course-scoped students",
                err
              );
            }
          }
        }

        // Admins (and other roles) - fetch students for the course via course-scoped helper
        // Attempt to use the course's assigned teacher (if available) for a more reliable lookup
        const courseTeacherId =
          course?.teacherId ??
          course?.TeacherID ??
          course?.teacherID ??
          course?.TeacherId ??
          null;

        if (courseTeacherId) {
          try {
            const { students: teacherScopedStudents } =
              await getTeacherCourseStudents(courseTeacherId, id);
            if (!isActive) return;
            if (
              Array.isArray(teacherScopedStudents) &&
              teacherScopedStudents.length
            ) {
              setStudents(teacherScopedStudents.filter(belongsToCurrentCourse));
              return;
            }
          } catch (err) {
            console.warn(
              "Teacher-specific course students endpoint unavailable, continuing with course scope",
              err
            );
          }
        }

        try {
          const courseStudents = await getTeacherStudents(id, {
            scope: "course",
          });
          if (!isActive) return;
          const filteredStudents = Array.isArray(courseStudents)
            ? courseStudents.filter((student) => {
                const studentCourseId =
                  student?.CourseID ??
                  student?.courseID ??
                  student?.courseId ??
                  student?.CourseId ??
                  null;
                if (studentCourseId === null || studentCourseId === undefined) {
                  return true;
                }
                return belongsToCurrentCourse({ CourseID: studentCourseId });
              })
            : [];
          setStudents(filteredStudents.filter(belongsToCurrentCourse));

          // Also try the course-specific students endpoint which may include
          // inactive enrollments depending on the backend. Merge results so
          // inactive enrollments are available in the tabs on reload.
          try {
            const courseScoped = await getCourseStudents(id);
            if (!isActive) return;
            if (Array.isArray(courseScoped) && courseScoped.length) {
              // merge and dedupe by enrollment id (preferred) then student id
              const map = new Map();
              const pushEntry = (e, allowOverwrite = false) => {
                const enrollId =
                  e?.EnrollmentID ?? e?.enrollmentID ?? e?.enrollmentId ?? null;
                const studentId =
                  e?.StudentID ??
                  e?.studentID ??
                  e?.studentId ??
                  e?.UserID ??
                  e?.userID ??
                  e?.userId ??
                  null;
                const key = enrollId
                  ? `e:${String(enrollId)}`
                  : `s:${String(studentId)}`;
                if (!map.has(key)) {
                  map.set(key, e);
                  return;
                }

                if (allowOverwrite) {
                  const existing = map.get(key);
                  map.set(key, {
                    ...existing,
                    ...e,
                  });
                }
              };

              // first add the already-fetched list so that courseScoped can overwrite
              (filteredStudents || []).forEach((entry) => pushEntry(entry));
              courseScoped.forEach((entry) => pushEntry(entry, true));

              const merged = Array.from(map.values()).filter(
                belongsToCurrentCourse
              );
              setStudents(merged);
            }
          } catch (mergeErr) {
            // ignore merge errors; we already have filteredStudents
          }
        } catch (err) {
          console.error("Failed to load course students:", err);
          if (!isActive) return;
          setStudents([]);
          setStudentsError("Unable to load enrolled students.");
        }
      } catch (err) {
        if (!isActive) return;
        console.error("Unexpected error loading students:", err);
        setStudents([]);
        setStudentsError("Unable to load enrolled students.");
      } finally {
        if (isActive) setStudentsLoading(false);
      }
    };

    // Wait until course details have been loaded (ensures course teacher id availability)
    if (loading) {
      setStudentsLoading(true);
      return;
    }

    fetchStudents();

    return () => {
      isActive = false;
    };
  }, [
    id,
    user,
    loading,
    course?.teacherId,
    studentsRefreshCounter,
    belongsToCurrentCourse,
  ]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!course) {
      setSubjectStudentGroups([]);
      return;
    }

    const rawSubjectCandidates = [];

    const appendCandidate = (candidate) => {
      if (candidate === null || candidate === undefined) {
        return;
      }

      if (Array.isArray(candidate)) {
        candidate.forEach((item) => appendCandidate(item));
        return;
      }

      rawSubjectCandidates.push(candidate);
    };

    appendCandidate(course.subjectIds);
    appendCandidate(course.SubjectIDs);
    appendCandidate(course.SubjectIds);
    appendCandidate(course.subjectIDs);
    appendCandidate(course.subjectId);
    appendCandidate(course.subjectID);
    appendCandidate(course.SubjectId);
    appendCandidate(course.SubjectID);
    appendCandidate(course.subjectDetails);
    appendCandidate(course.SubjectDetails);
    appendCandidate(course.subjects);
    appendCandidate(course.Subjects);
    appendCandidate(course.subjectList);
    appendCandidate(course.SubjectList);

    const subjectCandidates = rawSubjectCandidates;

    const normalizeSubjectValue = (value) => {
      if (value === null || value === undefined) return null;

      if (typeof value === "number" && !Number.isNaN(value)) {
        return value;
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (/^-?\d+$/.test(trimmed)) {
          const parsed = Number(trimmed);
          if (!Number.isNaN(parsed)) return parsed;
        }
        return null;
      }

      return null;
    };

    const normalizeSubjectCandidate = (candidate) => {
      if (candidate === null || candidate === undefined) return null;

      if (typeof candidate === "object") {
        const possibleFields = [
          candidate.subjectId,
          candidate.SubjectID,
          candidate.SubjectId,
          candidate.subjectID,
          candidate.id,
          candidate.Id,
        ];

        for (const field of possibleFields) {
          const normalized = normalizeSubjectValue(field);
          if (normalized !== null && normalized !== undefined) {
            return normalized;
          }
        }

        return null;
      }

      const normalized = normalizeSubjectValue(candidate);
      if (normalized !== null && normalized !== undefined) {
        return normalized;
      }

      return null;
    };

    const normalizedSubjectIds = Array.from(
      new Set(
        subjectCandidates
          .map((candidate) => normalizeSubjectCandidate(candidate))
          .filter((value) => value !== null && value !== undefined)
      )
    );

    if (!normalizedSubjectIds.length) {
      setSubjectStudentGroups([]);
      return;
    }

    let isActive = true;

    const fetchBySubject = async () => {
      setStudentsLoading(true);
      setStudentsError(null);
      try {
        const courseSubjectNames = Array.isArray(course.subjects)
          ? course.subjects
          : [];

        const results = await Promise.allSettled(
          normalizedSubjectIds.map((subjectId) =>
            getStudentsBySubject(subjectId)
          )
        );

        const groups = normalizedSubjectIds.map((subjectId, index) => {
          const fallbackName =
            courseSubjectNames[index] ?? `Subject #${subjectId}`;
          const result = results[index];

          if (result.status === "fulfilled") {
            const rawEntries = Array.isArray(result.value)
              ? result.value
              : Array.isArray(result.value?.students)
              ? result.value.students
              : [];

            const normalizedEntries = rawEntries
              .map((entry) => {
                const subjectNameValue =
                  entry?.SubjectName ?? entry?.subjectName ?? fallbackName;
                const subjectCodeValue =
                  entry?.SubjectCode ?? entry?.subjectCode ?? "";
                const resolvedSubjectId =
                  entry?.SubjectID ??
                  entry?.subjectID ??
                  entry?.subjectId ??
                  subjectId;

                return {
                  ...entry,
                  SubjectID: resolvedSubjectId,
                  subjectId: resolvedSubjectId,
                  SubjectName: subjectNameValue,
                  subjectName: subjectNameValue,
                  SubjectCode: subjectCodeValue,
                  subjectCode: subjectCodeValue,
                };
              })
              .filter(belongsToCurrentCourse);

            const subjectNameValue =
              normalizedEntries[0]?.SubjectName ?? fallbackName;
            const subjectCodeValue =
              normalizedEntries[0]?.SubjectCode ??
              normalizedEntries[0]?.subjectCode ??
              "";

            return {
              subjectId,
              subjectName: subjectNameValue,
              subjectCode: subjectCodeValue,
              students: normalizedEntries,
              error: null,
            };
          }

          return {
            subjectId,
            subjectName: fallbackName,
            subjectCode: "",
            students: [],
            error: result.reason,
          };
        });

        if (!isActive) return;

        setSubjectStudentGroups(groups);

        const flattened = groups
          .flatMap((group) => group.students || [])
          .filter(belongsToCurrentCourse);
        if (flattened.length) {
          setStudents(flattened);
        }

        const failedCount = groups.filter((group) =>
          Boolean(group.error)
        ).length;
        if (failedCount) {
          console.warn(
            `${failedCount} subject group(s) failed to load via StudentsBySubject endpoint.`
          );
        }
      } catch (err) {
        if (!isActive) return;
        console.error("Failed to load subject enrollments:", err);
        setSubjectStudentGroups([]);
      } finally {
        if (isActive) {
          setStudentsLoading(false);
        }
      }
    };

    fetchBySubject();

    return () => {
      isActive = false;
    };
  }, [
    loading,
    course,
    course?.subjectIds,
    course?.SubjectIDs,
    course?.subjects,
    studentsRefreshCounter,
    belongsToCurrentCourse,
  ]);

  useEffect(() => {
    const teacherId = course?.teacherId;

    if (
      teacherId === undefined ||
      teacherId === null ||
      String(teacherId).trim() === ""
    ) {
      setTeacher(null);
      setTeacherError(null);
      return;
    }

    let isActive = true;

    const fetchTeacher = async () => {
      setTeacherLoading(true);
      setTeacherError(null);
      try {
        const data = await getUserById(teacherId);
        if (!isActive) return;
        setTeacher(data);
      } catch (error) {
        if (!isActive) return;
        console.error("Error fetching teacher details:", error);
        setTeacher(null);
        setTeacherError("Unable to load teacher information.");
      } finally {
        if (isActive) {
          setTeacherLoading(false);
        }
      }
    };

    fetchTeacher();

    return () => {
      isActive = false;
    };
  }, [course?.teacherId]);

  const resolveStudentId = (candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return "";
    }

    const values = [
      candidate.StudentID,
      candidate.studentID,
      candidate.studentId,
      candidate.UserID,
      candidate.userID,
      candidate.userId,
      candidate.id,
    ];

    for (const value of values) {
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str) return str;
    }

    return "";
  };

  const getStudentDetailsPath = (student) => {
    const identifier = resolveStudentId(student);
    if (!identifier) return null;
    return user?.userType === "teacher"
      ? `/teacher/students/${identifier}`
      : `/admin/users/${identifier}`;
  };

  const resolveEnrollmentId = (candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return "";
    }

    const fields = [
      candidate.EnrollmentID,
      candidate.enrollmentID,
      candidate.enrollmentId,
      candidate.EnrollmentId,
    ];

    for (const value of fields) {
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str) return str;
    }

    return "";
  };

  const resolveEnrollmentActive = useCallback((studentEntry) => {
    const raw =
      studentEntry?.EnrollmentIsActive ??
      studentEntry?.enrollmentIsActive ??
      studentEntry?.EnrollmentStatus ??
      studentEntry?.enrollmentStatus ??
      null;

    if (typeof raw === "string") {
      const normalized = raw.trim().toLowerCase();
      if (normalized === "active") return true;
      if (normalized === "inactive") return false;
      if (normalized === "true" || normalized === "1") return true;
      if (normalized === "false" || normalized === "0") return false;
    } else if (raw !== null && raw !== undefined) {
      return Boolean(raw);
    }

    const fallback = studentEntry?.IsActive ?? studentEntry?.isActive;
    if (fallback !== undefined && fallback !== null) {
      return Boolean(fallback);
    }

    return true;
  }, []);

  const formatEnrollmentDate = (value) => {
    if (!value) return "Not specified";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString();
  };

  const { activeStudents, inactiveStudents } = useMemo(() => {
    const grouped = { active: [], inactive: [] };

    if (Array.isArray(students)) {
      for (const studentEntry of students) {
        const isActive = resolveEnrollmentActive(studentEntry);
        if (isActive) {
          grouped.active.push(studentEntry);
        } else {
          grouped.inactive.push(studentEntry);
        }
      }
    }

    return {
      activeStudents: grouped.active,
      inactiveStudents: grouped.inactive,
    };
  }, [students, resolveEnrollmentActive]);

  const subjectGroupsWithStatus = useMemo(() => {
    if (!Array.isArray(subjectStudentGroups)) {
      return [];
    }

    return subjectStudentGroups.map((group) => {
      const studentList = Array.isArray(group.students) ? group.students : [];
      const active = [];
      const inactive = [];

      for (const entry of studentList) {
        if (resolveEnrollmentActive(entry)) {
          active.push(entry);
        } else {
          inactive.push(entry);
        }
      }

      return {
        ...group,
        activeStudents: active,
        inactiveStudents: inactive,
      };
    });
  }, [subjectStudentGroups, resolveEnrollmentActive]);

  const courseSubjectOptions = useMemo(() => {
    const options = [];
    const seen = new Set();

    const pushOption = (rawId, nameCandidate, extra = {}) => {
      const normalizedId = normalizeIdString(rawId);
      if (!normalizedId || seen.has(normalizedId)) {
        return;
      }

      const labelSources = [
        nameCandidate,
        extra.name,
        extra.subjectName,
        extra.SubjectName,
        extra.title,
        extra.Title,
        extra.fallbackName,
      ];

      let label = "";
      for (const candidate of labelSources) {
        if (typeof candidate === "string") {
          const trimmed = candidate.trim();
          if (trimmed) {
            label = trimmed;
            break;
          }
        }
      }

      const codeSources = [
        extra.code,
        extra.subjectCode,
        extra.SubjectCode,
        extra.codeCandidate,
        extra.courseSubjectCode,
        extra.CourseSubjectCode,
      ];

      let code = "";
      for (const candidate of codeSources) {
        if (typeof candidate === "string") {
          const trimmed = candidate.trim();
          if (trimmed) {
            code = trimmed;
            break;
          }
        }
      }

      const courseSubjectIdRaw =
        extra.courseSubjectId ??
        extra.CourseSubjectId ??
        extra.CourseSubjectID ??
        null;

      const normalizedCourseSubjectId =
        courseSubjectIdRaw !== null && courseSubjectIdRaw !== undefined
          ? normalizeIdString(courseSubjectIdRaw)
          : null;

      options.push({
        id: normalizedId,
        label: label || `Subject ${normalizedId}`,
        code,
        courseSubjectId: normalizedCourseSubjectId,
      });
      seen.add(normalizedId);
    };

    (subjectStudentGroups || []).forEach((group, index) => {
      const rawId =
        group?.subjectId ??
        group?.SubjectID ??
        group?.SubjectId ??
        group?.id ??
        group?.Id ??
        null;

      if (rawId === null || rawId === undefined) {
        return;
      }

      pushOption(rawId, group?.subjectName ?? group?.SubjectName, {
        code: group?.subjectCode ?? group?.SubjectCode,
        courseSubjectId:
          group?.courseSubjectId ??
          group?.CourseSubjectId ??
          group?.CourseSubjectID ??
          null,
        fallbackName: Array.isArray(course?.subjects)
          ? course.subjects[index]
          : undefined,
      });
    });

    const detailSources = [
      course?.subjectDetails,
      course?.SubjectDetails,
      course?.courseSubjects,
      course?.CourseSubjects,
    ];

    detailSources.forEach((source) => {
      if (!Array.isArray(source)) {
        return;
      }

      source.forEach((entry) => {
        if (!entry || typeof entry !== "object") {
          return;
        }

        const rawId =
          entry.subjectId ??
          entry.SubjectID ??
          entry.SubjectId ??
          entry.subjectID ??
          entry.id ??
          entry.Id ??
          null;

        if (rawId === null || rawId === undefined) {
          return;
        }

        pushOption(
          rawId,
          entry.name ??
            entry.subjectName ??
            entry.SubjectName ??
            entry.title ??
            entry.Title,
          {
            code:
              entry.code ??
              entry.subjectCode ??
              entry.SubjectCode ??
              entry.Code ??
              null,
            courseSubjectId:
              entry.courseSubjectId ??
              entry.CourseSubjectId ??
              entry.CourseSubjectID ??
              null,
          }
        );
      });
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [course, normalizeIdString, subjectStudentGroups]);

  const courseSubjectOptionMap = useMemo(() => {
    const map = new Map();
    courseSubjectOptions.forEach((option) => {
      map.set(option.id, option);
    });
    return map;
  }, [courseSubjectOptions]);

  const handleExistingStudentConfirm = async (
    selectedIds = [],
    selectedSubjectIds = []
  ) => {
    if (!Array.isArray(selectedIds) || !selectedIds.length) {
      setStudentActionError("Select at least one student to enroll.");
      return;
    }

    const uniqueIds = Array.from(
      new Set(
        selectedIds
          .map((id) => normalizeIdString(id))
          .filter((value) => Boolean(value))
      )
    );

    if (!uniqueIds.length) {
      setStudentActionError("Select at least one student to enroll.");
      return;
    }

    const requireSubjects = courseSubjectOptions.length > 0;

    const uniqueSubjectIds = Array.from(
      new Set(
        (Array.isArray(selectedSubjectIds) ? selectedSubjectIds : [])
          .map((subjectId) => normalizeIdString(subjectId))
          .filter((value) => Boolean(value))
      )
    );

    if (requireSubjects && !uniqueSubjectIds.length) {
      setStudentActionError(
        "Select at least one class to enroll the students in."
      );
      return;
    }

    const rawCourseId =
      course?.id ??
      course?.CourseID ??
      course?.courseID ??
      course?.CourseId ??
      course?.courseId ??
      id;

    if (rawCourseId === undefined || rawCourseId === null) {
      setStudentActionError("Course information is missing.");
      return;
    }

    const numericCourseId = Number(rawCourseId);
    const useNumericCourseId = !Number.isNaN(numericCourseId);
    const courseIdForApi = useNumericCourseId ? numericCourseId : rawCourseId;

    const enrollmentOptions = {
      EnrollmentDate: new Date().toISOString(),
      IsActive: true,
    };

    const toApiId = (value) => {
      if (value === null || value === undefined) {
        return value;
      }
      const numeric = Number(value);
      return Number.isNaN(numeric) ? value : numeric;
    };

    setAddingStudents(true);
    setStudentActionError("");

    try {
      if (!requireSubjects || !uniqueSubjectIds.length) {
        for (const studentId of uniqueIds) {
          const resolvedStudentId = toApiId(studentId);

          if (useNumericCourseId) {
            await createEnrollmentsForStudent(
              resolvedStudentId,
              [numericCourseId],
              enrollmentOptions
            );
          } else {
            await createEnrollment({
              StudentID: resolvedStudentId,
              CourseID: rawCourseId,
              EnrollmentDate: enrollmentOptions.EnrollmentDate,
              IsActive: enrollmentOptions.IsActive,
            });
          }
        }

        setStudentActionError("");
        setShowStudentPicker(false);
        setStudentsRefreshCounter((prev) => prev + 1);
        setToastType("success");
        setToastMessage(
          uniqueIds.length > 1
            ? `Added ${uniqueIds.length} students to the course.`
            : `Added 1 student to the course.`
        );
        return;
      }

      const existingEnrollmentMap = new Map();

      const registerEnrollment = (entry) => {
        if (!entry || typeof entry !== "object") {
          return;
        }

        const studentIdValue = normalizeIdString(resolveStudentId(entry));
        if (!studentIdValue) {
          return;
        }

        const subjectCandidates = [
          entry.SubjectID,
          entry.subjectID,
          entry.SubjectId,
          entry.subjectId,
          entry.CourseSubjectID,
          entry.courseSubjectID,
          entry.CourseSubjectId,
          entry.courseSubjectId,
        ];

        let subjectIdValue = null;
        for (const subjectCandidate of subjectCandidates) {
          const normalizedSubjectId = normalizeIdString(subjectCandidate);
          if (normalizedSubjectId) {
            subjectIdValue = normalizedSubjectId;
            break;
          }
        }

        if (!subjectIdValue) {
          return;
        }

        const key = `${studentIdValue}::${subjectIdValue}`;
        if (existingEnrollmentMap.has(key)) {
          return;
        }

        existingEnrollmentMap.set(key, {
          entry,
          enrollmentId: resolveEnrollmentId(entry),
          isActive: resolveEnrollmentActive(entry),
          studentId: studentIdValue,
          subjectId: subjectIdValue,
        });
      };

      (students || []).forEach(registerEnrollment);
      (subjectStudentGroups || []).forEach((group) => {
        (group?.students || []).forEach(registerEnrollment);
      });

      const plannedKeys = new Set();
      const activations = [];
      const creations = [];
      const alreadyActive = [];

      for (const studentId of uniqueIds) {
        for (const subjectId of uniqueSubjectIds) {
          const key = `${studentId}::${subjectId}`;
          if (plannedKeys.has(key)) {
            continue;
          }
          plannedKeys.add(key);

          const existing = existingEnrollmentMap.get(key);
          if (existing) {
            if (existing.isActive) {
              alreadyActive.push({ studentId, subjectId });
              continue;
            }

            if (existing.enrollmentId) {
              activations.push({
                enrollmentId: existing.enrollmentId,
                studentId,
                subjectId,
              });
              continue;
            }
          }

          const option = courseSubjectOptionMap.get(subjectId) || null;
          creations.push({
            studentId,
            subjectId,
            courseSubjectId: option?.courseSubjectId ?? null,
          });
        }
      }

      const activationResults = await Promise.allSettled(
        activations.map(({ enrollmentId, studentId, subjectId }) => {
          const option = courseSubjectOptionMap.get(subjectId) || null;
          const payload = {
            StudentID: toApiId(studentId),
            CourseID: courseIdForApi,
            SubjectID: toApiId(subjectId),
          };

          if (
            option?.courseSubjectId !== null &&
            option?.courseSubjectId !== undefined
          ) {
            payload.CourseSubjectID = toApiId(option.courseSubjectId);
          }

          return setEnrollmentActiveStatus(enrollmentId, true, payload);
        })
      );

      const creationResults = await Promise.allSettled(
        creations.map(({ studentId, subjectId, courseSubjectId }) => {
          const payload = {
            StudentID: toApiId(studentId),
            CourseID: courseIdForApi,
            SubjectID: toApiId(subjectId),
            EnrollmentDate: enrollmentOptions.EnrollmentDate,
            IsActive: enrollmentOptions.IsActive,
          };

          if (courseSubjectId !== null && courseSubjectId !== undefined) {
            payload.CourseSubjectID = toApiId(courseSubjectId);
          }

          return createEnrollment(payload);
        })
      );

      const activationFailures = activationResults.filter(
        (result) => result.status === "rejected"
      );
      const creationFailures = creationResults.filter(
        (result) => result.status === "rejected"
      );

      const reactivatedCount =
        activationResults.length - activationFailures.length;
      const createdCount = creationResults.length - creationFailures.length;
      const alreadyActiveCount = alreadyActive.length;

      if (!activationFailures.length && !creationFailures.length) {
        setStudentActionError("");
        setShowStudentPicker(false);
        setStudentsRefreshCounter((prev) => prev + 1);

        const changedCount = createdCount + reactivatedCount;
        const segments = [];
        if (createdCount) {
          segments.push(`${createdCount} new`);
        }
        if (reactivatedCount) {
          segments.push(`${reactivatedCount} reactivated`);
        }

        let toastText = "";

        if (changedCount) {
          toastText = `${segments.join(" and ")} enrollment${
            changedCount === 1 ? "" : "s"
          }.`;
          if (alreadyActiveCount) {
            toastText += ` ${alreadyActiveCount} already active.`;
          }
        } else if (alreadyActiveCount) {
          toastText = `${alreadyActiveCount} enrollment${
            alreadyActiveCount === 1 ? "" : "s"
          } already active.`;
        } else {
          toastText = "No enrollment changes were required.";
        }

        setToastType("success");
        setToastMessage(toastText);
        return;
      }

      const failureMessages = [];
      if (creationFailures.length) {
        failureMessages.push(
          `${creationFailures.length} new enrollment${
            creationFailures.length === 1 ? "" : "s"
          }`
        );
      }
      if (activationFailures.length) {
        failureMessages.push(
          `${activationFailures.length} reactivation${
            activationFailures.length === 1 ? "" : "s"
          }`
        );
      }

      setStudentActionError(
        `Some enrollments could not be saved: ${failureMessages.join(
          ", "
        )}. Please try again.`
      );

      if (createdCount || reactivatedCount) {
        setStudentsRefreshCounter((prev) => prev + 1);

        const segments = [];
        if (createdCount) {
          segments.push(`${createdCount} created`);
        }
        if (reactivatedCount) {
          segments.push(`${reactivatedCount} reactivated`);
        }
        if (alreadyActiveCount) {
          segments.push(`${alreadyActiveCount} already active`);
        }

        setToastType("warning");
        setToastMessage(`${segments.join(", ")}.`);
      }
    } catch (error) {
      console.error("Failed to enroll selected students", error);
      setStudentActionError(
        error?.message || "Unable to add selected students. Please try again."
      );
    } finally {
      setAddingStudents(false);
    }
  };

  const handleEnrollmentStatusChange = async (studentEntry, makeActive) => {
    const enrollmentId = resolveEnrollmentId(studentEntry);
    if (!enrollmentId) {
      setToastType("error");
      setToastMessage("Unable to update enrollment. Missing identifier.");
      return;
    }

    setEnrollmentLoadingMap((prev) => ({
      ...prev,
      [enrollmentId]: true,
    }));

    try {
      const resolveSubjectId = (entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const candidates = [
          entry.SubjectID,
          entry.subjectID,
          entry.SubjectId,
          entry.subjectId,
        ];

        for (const candidate of candidates) {
          if (candidate === null || candidate === undefined) continue;
          const normalized = normalizeIdString(candidate);
          if (normalized) {
            return normalized;
          }
        }

        return null;
      };

      let resolvedSubjectId = resolveSubjectId(studentEntry);

      if (!resolvedSubjectId) {
        for (const group of subjectStudentGroups) {
          const match = (group.students || []).find((candidate) => {
            const cid = resolveEnrollmentId(candidate);
            if (cid && String(cid) === String(enrollmentId)) {
              return true;
            }
            const studentMatchId = resolveStudentId(candidate);
            const entryStudentId = resolveStudentId(studentEntry);
            return (
              studentMatchId &&
              entryStudentId &&
              studentMatchId === entryStudentId
            );
          });

          if (match) {
            resolvedSubjectId = resolveSubjectId(match);
            if (resolvedSubjectId) {
              break;
            }
          }
        }
      }

      const contextPayload = resolvedSubjectId
        ? {
            ...studentEntry,
            SubjectID: resolvedSubjectId,
            subjectId: resolvedSubjectId,
          }
        : studentEntry;

      await setEnrollmentActiveStatus(enrollmentId, makeActive, contextPayload);
      const nextStatus = makeActive ? "active" : "inactive";

      setStudents((prev) =>
        prev.map((studentItem) => {
          const currentId = resolveEnrollmentId(studentItem);
          if (currentId && String(currentId) === String(enrollmentId)) {
            return {
              ...studentItem,
              EnrollmentIsActive: makeActive,
              enrollmentIsActive: makeActive,
              EnrollmentStatus: nextStatus,
              enrollmentStatus: nextStatus,
              SubjectID:
                resolvedSubjectId ??
                studentItem.SubjectID ??
                studentItem.subjectID ??
                studentItem.subjectId ??
                studentItem.SubjectId,
              subjectID:
                resolvedSubjectId ??
                studentItem.subjectID ??
                studentItem.SubjectID,
              subjectId:
                resolvedSubjectId ??
                studentItem.subjectId ??
                studentItem.SubjectID,
            };
          }
          return studentItem;
        })
      );

      setSubjectStudentGroups((prevGroups) =>
        prevGroups.map((group) => {
          const updatedStudents = (group.students || []).map((studentItem) => {
            const currentId = resolveEnrollmentId(studentItem);
            if (currentId && String(currentId) === String(enrollmentId)) {
              return {
                ...studentItem,
                EnrollmentIsActive: makeActive,
                enrollmentIsActive: makeActive,
                EnrollmentStatus: nextStatus,
                enrollmentStatus: nextStatus,
                SubjectID:
                  resolvedSubjectId ??
                  studentItem.SubjectID ??
                  studentItem.subjectID ??
                  studentItem.subjectId ??
                  studentItem.SubjectId,
                subjectID:
                  resolvedSubjectId ??
                  studentItem.subjectID ??
                  studentItem.SubjectID,
                subjectId:
                  resolvedSubjectId ??
                  studentItem.subjectId ??
                  studentItem.SubjectID,
              };
            }
            return studentItem;
          });

          return {
            ...group,
            students: updatedStudents,
          };
        })
      );

      setToastType("success");
      setToastMessage(
        makeActive
          ? "Enrollment reactivated."
          : "Enrollment removed from course."
      );
    } catch (error) {
      console.error("Failed to update enrollment status:", error);
      setToastType("error");
      setToastMessage(
        makeActive
          ? "Unable to reactivate enrollment."
          : "Unable to remove enrollment."
      );
    } finally {
      setEnrollmentLoadingMap((prev) => {
        const next = { ...prev };
        delete next[enrollmentId];
        return next;
      });
    }
  };

  const handleRemoveEnrollment = async (studentEntry) => {
    const confirmed = window.confirm(
      "Remove this student from the course? They will remain associated but marked inactive."
    );
    if (!confirmed) return;
    await handleEnrollmentStatusChange(studentEntry, false);
  };

  const handleReactivateEnrollment = async (studentEntry) => {
    await handleEnrollmentStatusChange(studentEntry, true);
  };

  const renderEnrollmentList = (
    collection,
    { showRemove = false, showReactivate = false } = {}
  ) => {
    if (!collection || !collection.length) {
      return (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-md">
          <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-300">
            No students in this list.
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden  sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {collection.map((studentEntry, index) => {
            const enrollmentId = resolveEnrollmentId(studentEntry);
            const loading = enrollmentId
              ? Boolean(enrollmentLoadingMap[enrollmentId])
              : false;
            const detailPath = getStudentDetailsPath(studentEntry);
            const name =
              `${studentEntry.FirstName || studentEntry.firstName || ""} ${
                studentEntry.LastName || studentEntry.lastName || ""
              }`
                .replace(/\s+/g, " ")
                .trim() || "Unnamed Student";
            const username =
              studentEntry.Username || studentEntry.username || "";
            const email =
              studentEntry.Email ||
              studentEntry.email ||
              username ||
              "Details unavailable";
            const isActive = resolveEnrollmentActive(studentEntry);
            const statusClass = isActive
              ? "px-2 inline-flex text-xs font-semibold leading-5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "px-2 inline-flex text-xs font-semibold leading-5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300";
            const statusLabel = isActive ? "Active" : "Inactive";
            const enrollmentDate = formatEnrollmentDate(
              studentEntry.EnrollmentDate ?? studentEntry.enrollmentDate
            );
            const key =
              enrollmentId || resolveStudentId(studentEntry) || String(index);

            return (
              <li key={key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Avatar
                          name={`$
                            studentEntry.FirstName ||
                            studentEntry.firstName ||
                            ""
                          } ${
                            studentEntry.LastName || studentEntry.lastName || ""
                          }`}
                          size="sm"
                          user={studentEntry}
                        />
                      </div>
                      <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                        {detailPath ? (
                          <Link to={detailPath} className="min-w-0 block group">
                            <p
                              className="text-sm font-medium text-indigo-600 group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300 truncate max-w-full"
                              title={name}
                            >
                              {name}
                            </p>
                            <p className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <span
                                className="truncate block max-w-full"
                                title={email}
                              >
                                {email}
                              </span>
                            </p>
                          </Link>
                        ) : (
                          <div className="min-w-0 block">
                            <p
                              className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-full"
                              title={name}
                            >
                              {name}
                            </p>
                            <p className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <span
                                className="truncate block max-w-full"
                                title={email}
                              >
                                {email}
                              </span>
                            </p>
                          </div>
                        )}

                        <div className="mt-2 md:mt-0">
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">
                              Role: Student
                            </p>
                            {(studentEntry.RollNumber ||
                              studentEntry.rollNumber) && (
                              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Roll No:{" "}
                                {studentEntry.RollNumber ||
                                  studentEntry.rollNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center space-x-3 flex-shrink-0 mt-3 sm:mt-0">
                      <span className={statusClass}>{statusLabel}</span>
                      {showRemove && (
                        <button
                          onClick={() => handleRemoveEnrollment(studentEntry)}
                          disabled={loading || !enrollmentId}
                          className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-orange-600 hover:text-orange-800 ${
                            loading || !enrollmentId
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {loading ? "Removing..." : "Remove"}
                        </button>
                      )}
                      {showReactivate && (
                        <button
                          onClick={() =>
                            handleReactivateEnrollment(studentEntry)
                          }
                          disabled={loading || !enrollmentId}
                          className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-green-600 hover:text-green-800 ${
                            loading || !enrollmentId
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {loading ? "Activating..." : "Activate"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const renderSubjectSections = (
    grouped,
    { showRemove = false, showReactivate = false } = {}
  ) => {
    if (!grouped || !grouped.length) {
      return (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-md">
          <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-300">
            No subjects available for this course.
          </div>
        </div>
      );
    }

    return grouped.map((group, index) => {
      const key =
        group.subjectId ??
        group.SubjectID ??
        group.subjectName ??
        group.SubjectName ??
        `idx-${index}`;
      const displayName =
        group.subjectName ??
        group.SubjectName ??
        `Subject #${group.subjectId ?? group.SubjectID ?? ""}`;
      const subjectCode =
        group.subjectCode ??
        group.SubjectCode ??
        group.code ??
        group.Code ??
        "";

      return (
        <div key={`subject-${key}`} className="mb-6 last:mb-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              {displayName}
            </h4>
            {subjectCode ? (
              <span className="text-sm font-medium text-gray-500 dark:text-gray-300">
                {subjectCode}
              </span>
            ) : null}
          </div>
          {renderEnrollmentList(group.students, { showRemove, showReactivate })}
        </div>
      );
    });
  };

  const handleStudentPickerClose = () => {
    if (!addingStudents) {
      setShowStudentPicker(false);
    }
  };

  const handleRegisterModalClose = useCallback(() => {
    if (addingStudents) {
      return;
    }
    setShowRegisterModal(false);
    setRegisterStep(1);
    setPendingRegisterCore(null);
    setRegisterSelectedSubjectIds([]);
    setRegisterSubjectError("");
    setStudentActionError("");
  }, [addingStudents]);

  const handleCreateStudent = async (formData, selectedSubjectIds = []) => {
    setStudentActionError("");

    const rawCourseId =
      course?.id ??
      course?.CourseID ??
      course?.courseID ??
      course?.CourseId ??
      course?.courseId ??
      id;

    try {
      const uniqueSubjectIds = Array.from(
        new Set(
          (selectedSubjectIds || [])
            .map((value) => normalizeIdString(value))
            .filter(Boolean)
        )
      );

      const toApiId = (value) => {
        if (value === null || value === undefined) {
          return value;
        }
        const numeric = Number(value);
        return Number.isNaN(numeric) ? value : numeric;
      };

      const userPayload = {
        ...formData,
        UserTypeID: 3,
        IsActive: true,
        ProfilePicture:
          formData?.ProfilePicture ?? formData?.profilePicture ?? null,
      };

      const createdUser = await createUser(userPayload);

      const enrollmentDateValue =
        formData?.EnrollmentDate ?? formData?.enrollmentDate ?? null;

      const studentPayload = {
        UserID:
          createdUser?.UserID ??
          createdUser?.userID ??
          createdUser?.userId ??
          createdUser?.id ??
          formData?.UserID ??
          formData?.userID ??
          formData?.userId ??
          null,
        RollNumber:
          formData?.RollNumber ??
          formData?.rollNumber ??
          formData?.IDNumber ??
          formData?.idNumber ??
          undefined,
        EnrollmentDate: enrollmentDateValue ?? undefined,
        CurrentGrade:
          formData?.CurrentGrade ??
          formData?.currentGrade ??
          formData?.Class ??
          formData?.class ??
          undefined,
        ParentName:
          formData?.ParentName ??
          formData?.parentName ??
          formData?.GuardianName ??
          formData?.guardianName ??
          undefined,
        ParentContact:
          formData?.ParentContact ??
          formData?.parentContact ??
          formData?.GuardianPhone ??
          formData?.guardianPhone ??
          undefined,
      };

      const cleanedStudentPayload = Object.fromEntries(
        Object.entries(studentPayload).filter(
          ([, value]) => value !== undefined && value !== null
        )
      );

      const createdStudent = await createStudent(cleanedStudentPayload);

      const studentIdentifierCandidates = [
        createdStudent?.StudentID,
        createdStudent?.studentID,
        createdStudent?.studentId,
        createdStudent?.UserID,
        createdStudent?.userID,
        createdStudent?.userId,
        createdStudent?.id,
        createdUser?.StudentID,
        createdUser?.studentID,
        createdUser?.studentId,
        createdUser?.UserID,
        createdUser?.userID,
        createdUser?.userId,
        createdUser?.id,
      ];

      let resolvedStudentId = null;
      for (const candidate of studentIdentifierCandidates) {
        if (candidate === undefined || candidate === null) continue;
        const trimmed = String(candidate).trim();
        if (!trimmed) continue;
        resolvedStudentId = Number.isNaN(Number(trimmed))
          ? trimmed
          : Number(trimmed);
        break;
      }

      if (
        resolvedStudentId !== null &&
        resolvedStudentId !== undefined &&
        rawCourseId !== undefined &&
        rawCourseId !== null
      ) {
        const numericCourseId = Number(rawCourseId);
        const useNumericCourseId = !Number.isNaN(numericCourseId);
        const courseIdForApi = useNumericCourseId
          ? numericCourseId
          : rawCourseId;

        const enrollmentDateIso =
          enrollmentDateValue || new Date().toISOString();

        if (uniqueSubjectIds.length) {
          const creationResults = await Promise.allSettled(
            uniqueSubjectIds.map((subjectId) => {
              const option = courseSubjectOptionMap.get(subjectId) || null;
              const payload = {
                StudentID: toApiId(resolvedStudentId),
                CourseID: courseIdForApi,
                SubjectID: toApiId(subjectId),
                EnrollmentDate: enrollmentDateIso,
                IsActive: true,
              };

              if (
                option?.courseSubjectId !== null &&
                option?.courseSubjectId !== undefined
              ) {
                payload.CourseSubjectID = toApiId(option.courseSubjectId);
              }

              return createEnrollment(payload);
            })
          );

          const failures = creationResults.filter(
            (result) => result.status === "rejected"
          );

          if (failures.length) {
            const firstError = failures[0]?.reason;
            throw new Error(
              firstError?.message ||
                "Failed to enroll student in the selected classes."
            );
          }
        } else {
          if (useNumericCourseId) {
            await createEnrollmentsForStudent(
              resolvedStudentId,
              [numericCourseId],
              {
                EnrollmentDate: enrollmentDateIso,
                IsActive: true,
              }
            );
          } else {
            await createEnrollment({
              StudentID: toApiId(resolvedStudentId),
              CourseID: courseIdForApi,
              EnrollmentDate: enrollmentDateIso,
              IsActive: true,
            });
          }
        }
      }

      setStudentActionError("");
      setStudentsRefreshCounter((prev) => prev + 1);
      setToastType("success");
      if (uniqueSubjectIds.length) {
        const count = uniqueSubjectIds.length;
        setToastMessage(
          `Student created and enrolled in ${count} class${
            count === 1 ? "" : "es"
          }.`
        );
      } else {
        setToastMessage("Student created and enrolled in the course.");
      }
    } catch (error) {
      console.error("Failed to create student", error);
      const message =
        error?.message || "Failed to create student. Please try again.";
      setStudentActionError(message);
      throw error;
    }
  };

  const handleRegisterStudentSubmit = async (formData) => {
    if (registerStep === 1) {
      setPendingRegisterCore({ ...formData });
      setRegisterStep(2);
      setStudentActionError("");
      setRegisterSubjectError("");
      return;
    }

    const mergedData = {
      ...(pendingRegisterCore || {}),
      ...formData,
    };

    if (
      mergedData.UserTypeID === undefined &&
      mergedData.userTypeID === undefined &&
      mergedData.userTypeId === undefined
    ) {
      mergedData.UserTypeID = 3;
    }

    const requiresSubjectSelection = courseSubjectOptions.length > 0;
    const normalizedSubjectSelection = Array.from(
      new Set(
        (registerSelectedSubjectIds || [])
          .map((value) => normalizeIdString(value))
          .filter(Boolean)
      )
    );

    if (requiresSubjectSelection && !normalizedSubjectSelection.length) {
      setRegisterSubjectError(
        "Select at least one class to enroll the student in."
      );
      return;
    }

    setRegisterSubjectError("");

    try {
      setAddingStudents(true);
      setStudentActionError("");
      await handleCreateStudent(mergedData, normalizedSubjectSelection);
      setShowRegisterModal(false);
      setRegisterStep(1);
      setPendingRegisterCore(null);
      setRegisterSelectedSubjectIds([]);
    } catch (error) {
      // Errors are surfaced through studentActionError inside handleCreateStudent
      if (normalizedSubjectSelection.length) {
        setRegisterSubjectError(
          error?.message ||
            "Unable to enroll the student in the selected classes."
        );
      }
    } finally {
      setAddingStudents(false);
    }
  };

  const handleMaterialSubmit = (newMaterial) => {
    setMaterials([newMaterial, ...materials]);
    setShowMaterialModal(false);
  };

  if (loading || !course) {
    return <Loader className="py-12" />;
  }

  const subjects = Array.isArray(course.subjects)
    ? course.subjects
    : course.subject
    ? [course.subject]
    : [];

  const formattedSubjects = subjects.join(", ");
  const courseTeacherId = course?.teacherId;
  const hasTeacherAssignment =
    courseTeacherId !== undefined &&
    courseTeacherId !== null &&
    String(courseTeacherId).trim() !== "";
  const teacherDisplayName = teacher
    ? [teacher.firstName, teacher.lastName].filter(Boolean).join(" ").trim() ||
      teacher.username ||
      teacher.email
    : "";
  const teacherProfileId =
    teacher?.userID ??
    teacher?.UserID ??
    teacher?.id ??
    teacher?.userId ??
    courseTeacherId ??
    null;
  const isAdmin = user?.userType === "admin";
  const canModifyStudents = user?.userType === "teacher" || isAdmin;
  const enrolledStudentIds = Array.from(
    new Set(
      (students || [])
        .map((student) => resolveStudentId(student))
        .filter(Boolean)
    )
  );
  const hasSubjectGrouping = subjectGroupsWithStatus.length > 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 sm:space-y-8">
      <div className="overflow-hidden rounded-2xl bg-white/90 shadow-xl ring-1 ring-gray-200 backdrop-blur dark:bg-gray-900/60 dark:ring-gray-700">
        <div className="flex flex-col items-start justify-between gap-4 px-4 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {course.name}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              {course.code}
              {formattedSubjects ? ` - ${formattedSubjects}` : ""}
            </p>
          </div>
          <div className="mt-2 flex w-full flex-wrap items-center justify-start gap-2 sm:mt-0 sm:w-auto sm:justify-end">
            {isAdmin && (
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Edit
              </button>
            )}
            {isAdmin && isCourseActive && (
              <button
                onClick={async () => {
                  const candidateId =
                    course?.id ?? course?.CourseID ?? course?.courseId ?? id;
                  if (!candidateId) return;
                  const confirmed = confirm(
                    `Deactivate course "${
                      course?.name || candidateId
                    }"? Students will no longer see this course.`
                  );
                  if (!confirmed) return;
                  setDeleting(true);
                  try {
                    const updatedCourse = await deactivateCourse(candidateId);
                    if (updatedCourse) {
                      setCourse(updatedCourse);
                    }
                    setToastType("success");
                    setToastMessage("Course deactivated");
                    const redirectPath = isAdmin
                      ? "/admin/courses"
                      : "/teacher/courses";
                    if (isAdmin) {
                      navigate(redirectPath, { state: { tab: "inactive" } });
                    } else {
                      navigate(redirectPath);
                    }
                  } catch (err) {
                    console.error("Failed to deactivate course:", err);
                    setToastType("error");
                    setToastMessage("Failed to deactivate course");
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {deleting ? "Removing..." : "Remove"}
              </button>
            )}
            {isAdmin && !isCourseActive && (
              <button
                onClick={async () => {
                  const candidateId =
                    course?.id ?? course?.CourseID ?? course?.courseId ?? id;
                  if (!candidateId) return;
                  const confirmed = confirm(
                    `Reactivate course "${
                      course?.name || candidateId
                    }"? Students will be able to see this course again.`
                  );
                  if (!confirmed) return;
                  setReactivating(true);
                  try {
                    const updatedCourse = await reactivateCourse(candidateId);
                    if (updatedCourse) {
                      setCourse(updatedCourse);
                    }
                    setToastType("success");
                    setToastMessage("Course reactivated");
                    const redirectPath = isAdmin
                      ? "/admin/courses"
                      : "/teacher/courses";
                    if (isAdmin) {
                      navigate(redirectPath, { state: { tab: "active" } });
                    } else {
                      navigate(redirectPath);
                    }
                  } catch (err) {
                    console.error("Failed to reactivate course:", err);
                    setToastType("error");
                    setToastMessage("Failed to reactivate course");
                  } finally {
                    setReactivating(false);
                  }
                }}
                disabled={reactivating}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                {reactivating ? "Activating..." : "Active"}
              </button>
            )}
            <span className={statusBadgeClassName}>{statusBadgeLabel}</span>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 dark:border-gray-700 sm:px-6">
          <dl className="sm:divide-y sm:divide-gray-100 dark:sm:divide-gray-800">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Description
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {course.description}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Classes Included
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {subjects.length ? (
                  <ul className="list-disc list-inside space-y-1">
                    {subjects.map((subjectName) => (
                      <li key={subjectName}>
                        {user?.userType === "student" ? (
                          <span className="text-gray-900 dark:text-white">
                            {subjectName}
                          </span>
                        ) : (
                          <Link
                            to={`/subjects/${encodeURIComponent(subjectName)}`}
                            state={{ backgroundLocation: location }}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-700"
                          >
                            {subjectName}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">
                    No classes assigned yet.
                  </span>
                )}
                {/* Subjects can be managed in the Edit Course form (open Edit) */}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Assigned Teacher
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {teacherLoading ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    Fetching teacher information...
                  </span>
                ) : hasTeacherAssignment ? (
                  teacher ? (
                    <div className="space-y-1">
                      <p className="font-medium">
                        {isAdmin && teacherProfileId ? (
                          <Link
                            to={`/admin/users/${teacherProfileId}`}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {teacherDisplayName ||
                              `Teacher #${courseTeacherId}`}
                          </Link>
                        ) : (
                          teacherDisplayName || `Teacher #${courseTeacherId}`
                        )}
                      </p>
                      {teacher.email && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {teacher.email}
                        </p>
                      )}
                      {teacher.phone && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {teacher.phone}
                        </p>
                      )}
                    </div>
                  ) : teacherError ? (
                    <span className="text-red-500 dark:text-red-400">
                      {teacherError}
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">
                      Teacher record not available.
                    </span>
                  )
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">
                    No teacher assigned yet.
                  </span>
                )}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Academic Year
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {course.academicYear}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Study Materials
        </h3>
        {user.userType === "teacher" && (
          <Button variant="primary" onClick={() => setShowMaterialModal(true)}>
            Upload Material
          </Button>
        )}
      </div>
      <MaterialList materials={materials} /> */}

      {/* <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Attendance Records
        </h3>
        {user.userType === "teacher" && (
          <Button
            variant="primary"
            onClick={() => navigate(`/teacher/attendance/${id}`)}
          >
            Take Attendance
          </Button>
        )}
      </div>
      <AttendanceList attendance={attendance} /> */}

      {/* Do not show enrolled students list to student users */}
      {user?.userType !== "student" && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Enrolled Students
            </h3>
            {canModifyStudents ? (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="relative ml-auto sm:ml-0" ref={studentMenuRef}>
                  <Button
                    variant="primary"
                    onClick={() => setShowStudentMenu((s) => !s)}
                    disabled={addingStudents}
                  >
                    + Add Student
                  </Button>
                  {showStudentMenu && (
                    <div className="absolute right-0 mt-2 w-44 rounded-md border bg-white dark:bg-gray-800 z-20 shadow-md">
                      <button
                        type="button"
                        onClick={() => {
                          setShowStudentMenu(false);
                          setStudentActionError("");
                          setShowStudentPicker(true);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        Add Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowStudentMenu(false);
                          setStudentActionError("");
                          setRegisterStep(1);
                          setPendingRegisterCore(null);
                          setRegisterSelectedSubjectIds([]);
                          setRegisterSubjectError("");
                          setShowRegisterModal(true);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        Register New Student
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {studentsError ? (
            <div className="mt-3 text-sm text-red-600 dark:text-red-400">
              {studentsError}
            </div>
          ) : null}
          {studentActionError ? (
            <div className="mt-3 text-sm text-red-600 dark:text-red-400">
              {studentActionError}
            </div>
          ) : null}

          <div className="mt-4">
            {studentsLoading ? (
              <Loader className="py-8" />
            ) : (
              <>
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav
                    className="-mb-px flex space-x-6"
                    aria-label="Enrollment Tabs"
                  >
                    <button
                      type="button"
                      onClick={() => setStudentTab("active")}
                      className={`whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                        studentTab === "active"
                          ? "border-indigo-500 text-indigo-600 dark:text-indigo-300"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      Active Enrollments ({activeStudents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentTab("inactive")}
                      className={`whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                        studentTab === "inactive"
                          ? "border-indigo-500 text-indigo-600 dark:text-indigo-300"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      Inactive Enrollments ({inactiveStudents.length})
                    </button>
                  </nav>
                </div>

                {/* Subject tabs (appear under Active/Inactive tabs) */}
                {hasSubjectGrouping && (
                  <div className="mt-3 border-b border-gray-200 dark:border-gray-700">
                    <nav
                      className="-mb-px flex space-x-4 overflow-auto"
                      aria-label="Subject Tabs"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSubjectTab("all")}
                        className={`whitespace-nowrap border-b-2 px-2 pb-2 text-sm font-medium transition-colors ${
                          selectedSubjectTab === "all"
                            ? "border-indigo-500 text-indigo-600 dark:text-indigo-300"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                      >
                        All Classes
                      </button>
                      {subjectGroupsWithStatus.map((g) => {
                        const sid = String(
                          g.subjectId ??
                            g.SubjectID ??
                            g.subjectName ??
                            g.subjectName ??
                            ""
                        );
                        const label = g.subjectName || `Subject ${sid}`;
                        return (
                          <button
                            key={`stab-${sid}`}
                            type="button"
                            onClick={() => setSelectedSubjectTab(sid)}
                            className={`whitespace-nowrap border-b-2 px-2 pb-2 text-sm font-medium transition-colors ${
                              String(selectedSubjectTab) === sid
                                ? "border-indigo-500 text-indigo-600 dark:text-indigo-300"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                )}

                <div className="mt-4">
                  {studentTab === "active"
                    ? hasSubjectGrouping
                      ? selectedSubjectTab === "all"
                        ? renderSubjectSections(
                            subjectGroupsWithStatus.map((group) => ({
                              ...group,
                              students: group.activeStudents,
                            })),
                            {
                              showRemove: canModifyStudents,
                            }
                          )
                        : // single-subject view (active)
                          (() => {
                            const target = subjectGroupsWithStatus.find(
                              (gg) =>
                                String(
                                  gg.subjectId ??
                                    gg.SubjectID ??
                                    gg.subjectName ??
                                    gg.subjectName ??
                                    ""
                                ) === String(selectedSubjectTab)
                            );
                            return target
                              ? renderEnrollmentList(
                                  target.activeStudents || [],
                                  {
                                    showRemove: canModifyStudents,
                                  }
                                )
                              : renderEnrollmentList([], {
                                  showRemove: canModifyStudents,
                                });
                          })()
                      : renderEnrollmentList(activeStudents, {
                          showRemove: canModifyStudents,
                        })
                    : hasSubjectGrouping
                    ? selectedSubjectTab === "all"
                      ? renderSubjectSections(
                          subjectGroupsWithStatus.map((group) => ({
                            ...group,
                            students: group.inactiveStudents,
                          })),
                          {
                            showReactivate: canModifyStudents,
                          }
                        )
                      : // single-subject view (inactive)
                        (() => {
                          const target = subjectGroupsWithStatus.find(
                            (gg) =>
                              String(
                                gg.subjectId ??
                                  gg.SubjectID ??
                                  gg.subjectName ??
                                  gg.subjectName ??
                                  ""
                              ) === String(selectedSubjectTab)
                          );
                          return target
                            ? renderEnrollmentList(
                                target.inactiveStudents || [],
                                {
                                  showReactivate: canModifyStudents,
                                }
                              )
                            : renderEnrollmentList([], {
                                showReactivate: canModifyStudents,
                              });
                        })()
                    : renderEnrollmentList(inactiveStudents, {
                        showReactivate: canModifyStudents,
                      })}
                </div>
              </>
            )}
          </div>
        </>
      )}
      <StudentPickerModal
        isOpen={showStudentPicker}
        onClose={handleStudentPickerClose}
        onConfirm={handleExistingStudentConfirm}
        initialSelected={[]}
        excludedIds={enrolledStudentIds}
        subjectOptions={courseSubjectOptions}
        title="Add Existing Students"
        saving={addingStudents}
        errorMessage={studentActionError}
      />

      <Modal
        isOpen={showRegisterModal}
        onClose={handleRegisterModalClose}
        title="Register New Student"
        size="lg"
      >
        <UserForm
          onSubmit={handleRegisterStudentSubmit}
          loading={registerStep === 2 && addingStudents}
          forceUserType={3}
          showCoreFields={registerStep === 1}
          showRoleFields={registerStep === 2}
          submitLabel={registerStep === 1 ? "Next" : "Create Student"}
          additionalRoleContent={({ userTypeID }) => {
            if (String(userTypeID) !== "3") {
              return null;
            }

            if (!courseSubjectOptions.length) {
              return (
                <div className="mt-4 rounded-md border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  This course does not have any linked classes. The student will
                  be enrolled at the course level.
                </div>
              );
            }

            return (
              <div className="mt-4 space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    Select classes for this student
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {registerSelectedSubjectIds.length} selected
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {courseSubjectOptions.map((option) => {
                    const optionId = String(option.id);
                    const checked =
                      registerSelectedSubjectIds.includes(optionId);
                    return (
                      <label
                        key={`reg-subject-${optionId}`}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white px-3 py-2 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 dark:bg-gray-800 dark:hover:border-indigo-500/40 dark:hover:bg-gray-800/70"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={checked}
                          disabled={registerStep === 2 && addingStudents}
                          onChange={(event) => {
                            const { checked: isChecked } = event.target;
                            setRegisterSelectedSubjectIds((prev) => {
                              const next = new Set(
                                prev.map((id) => String(id))
                              );
                              if (isChecked) {
                                next.add(optionId);
                              } else {
                                next.delete(optionId);
                              }
                              setRegisterSubjectError("");
                              return Array.from(next);
                            });
                          }}
                        />
                        <span className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {option.label}
                          </span>
                          {option.code ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {option.code}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {registerSubjectError ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {registerSubjectError}
                  </p>
                ) : null}
              </div>
            );
          }}
        />
      </Modal>
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage("")}
      />

      <Modal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        title="Upload Study Material"
      >
        <MaterialForm
          courseId={id}
          onSuccess={handleMaterialSubmit}
          onCancel={() => setShowMaterialModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Generate QR Code for Attendance"
        size="lg"
      >
        <QRGenerator courseId={id} />
      </Modal>
      {/* Edit Course Modal (admin) */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit course — ${course.name}`}
        size="lg"
      >
        <CourseForm
          initialData={{
            name: course.name,
            code: course.code,
            description: course.description,
            academicYear: course.academicYear,
            subjectId: course.subjectId,
            subjects: Array.isArray(course.subjects)
              ? course.subjects
              : course.subject
              ? [course.subject]
              : [],
            teacherId: course.teacherId,
          }}
          onCancel={() => setShowEditModal(false)}
          loading={savingEdit}
          onSubmit={async (values) => {
            setSavingEdit(true);
            try {
              const subjectsList = Array.isArray(values.subjects)
                ? values.subjects
                : [];

              const courseIdValue = course?.id ?? course?.CourseID ?? id;
              const courseNameValue = course?.name ?? course?.CourseName ?? "";
              const courseCodeValue = course?.code ?? course?.CourseCode ?? "";

              const normalizeValue = (value) => String(value ?? "").trim();
              const normalizeKey = (value) =>
                normalizeValue(value).toLowerCase();

              const subjectsByName = new Map();
              const subjectsById = new Map();

              const registerSubjectLookup = (subject) => {
                if (!subject) return;
                const idCandidate =
                  subject?.id ??
                  subject?.SubjectID ??
                  subject?.subjectId ??
                  subject?.subjectID ??
                  null;
                const nameKey = normalizeKey(
                  subject?.name ??
                    subject?.subjectName ??
                    subject?.SubjectName ??
                    subject?.title ??
                    subject?.Title
                );
                if (idCandidate !== null && idCandidate !== undefined) {
                  const idKey = String(idCandidate);
                  if (!subjectsById.has(idKey)) {
                    subjectsById.set(idKey, subject);
                  }
                }
                if (nameKey && !subjectsByName.has(nameKey)) {
                  subjectsByName.set(nameKey, subject);
                }
              };

              try {
                const existingSubjects = await getAllSubjects();
                for (const entry of existingSubjects || []) {
                  registerSubjectLookup(entry);
                }
              } catch (lookupError) {
                console.warn(
                  "Unable to prefetch subjects before course update",
                  lookupError
                );
              }

              let primarySubjectId =
                values.subjectId ??
                values.SubjectID ??
                values.subjectID ??
                course?.subjectId ??
                course?.SubjectID ??
                null;

              for (const [index, subjectEntry] of subjectsList.entries()) {
                try {
                  const nameRaw =
                    typeof subjectEntry === "string"
                      ? subjectEntry
                      : subjectEntry?.name ??
                        subjectEntry?.subjectName ??
                        subjectEntry?.SubjectName ??
                        "";
                  const trimmedName = normalizeValue(nameRaw);
                  if (!trimmedName) continue;

                  let subjectId =
                    subjectEntry?.id ??
                    subjectEntry?.SubjectID ??
                    subjectEntry?.subjectId ??
                    subjectEntry?.subjectID ??
                    subjectEntry?.draft?.id ??
                    subjectEntry?.draft?.SubjectID ??
                    subjectEntry?.draft?.subjectId ??
                    null;

                  let subjectRecord = null;
                  if (subjectId !== null && subjectId !== undefined) {
                    subjectRecord =
                      subjectsById.get(String(subjectId)) ??
                      subjectEntry?.draft ??
                      null;
                  }

                  if (!subjectRecord) {
                    const match = subjectsByName.get(normalizeKey(trimmedName));
                    if (match) {
                      subjectRecord = match;
                      if (subjectId === null || subjectId === undefined) {
                        subjectId =
                          match?.id ??
                          match?.SubjectID ??
                          match?.subjectId ??
                          match?.subjectID ??
                          null;
                      }
                    }
                  }

                  const baseSource =
                    subjectRecord ?? subjectEntry?.draft ?? subjectEntry;

                  if (subjectId === null || subjectId === undefined) {
                    const creationPayload = {
                      name: trimmedName,
                      subjectName: trimmedName,
                    };
                    const codeCandidate =
                      baseSource?.subjectCode ??
                      baseSource?.SubjectCode ??
                      baseSource?.code ??
                      baseSource?.Code;
                    if (codeCandidate) {
                      creationPayload.subjectCode = codeCandidate;
                    }
                    const descriptionCandidate =
                      baseSource?.description ?? baseSource?.Description;
                    if (descriptionCandidate) {
                      creationPayload.description = descriptionCandidate;
                    }

                    const created = await createSubject(creationPayload);
                    subjectId =
                      created?.id ??
                      created?.SubjectID ??
                      created?.subjectId ??
                      created?.subjectID ??
                      null;
                    subjectRecord = {
                      ...creationPayload,
                      ...created,
                      id: subjectId,
                      name: created?.name ?? trimmedName,
                    };
                    registerSubjectLookup(subjectRecord);
                  }

                  if (subjectId !== null && subjectId !== undefined) {
                    const payload = {
                      name:
                        baseSource?.name ??
                        baseSource?.subjectName ??
                        baseSource?.SubjectName ??
                        trimmedName,
                      subjectName:
                        baseSource?.subjectName ??
                        baseSource?.SubjectName ??
                        baseSource?.name ??
                        trimmedName,
                      SubjectName:
                        baseSource?.subjectName ??
                        baseSource?.SubjectName ??
                        baseSource?.name ??
                        trimmedName,
                      subjectCode:
                        baseSource?.subjectCode ??
                        baseSource?.SubjectCode ??
                        baseSource?.code ??
                        baseSource?.Code ??
                        subjectRecord?.subjectCode ??
                        subjectRecord?.SubjectCode ??
                        subjectRecord?.code ??
                        subjectRecord?.Code,
                      SubjectCode:
                        baseSource?.subjectCode ??
                        baseSource?.SubjectCode ??
                        baseSource?.code ??
                        baseSource?.Code ??
                        subjectRecord?.subjectCode ??
                        subjectRecord?.SubjectCode ??
                        subjectRecord?.code ??
                        subjectRecord?.Code,
                      description:
                        baseSource?.description ??
                        baseSource?.Description ??
                        subjectRecord?.description ??
                        subjectRecord?.Description,
                      Description:
                        baseSource?.description ??
                        baseSource?.Description ??
                        subjectRecord?.description ??
                        subjectRecord?.Description,
                      courseId: courseIdValue,
                      CourseID: courseIdValue,
                      CourseId: courseIdValue,
                      courseName: courseNameValue,
                      CourseName: courseNameValue,
                      courseCode: courseCodeValue,
                      CourseCode: courseCodeValue,
                    };

                    await updateSubject(subjectId, payload);

                    registerSubjectLookup({
                      ...subjectRecord,
                      id: subjectId,
                      name: trimmedName,
                    });

                    if (index === 0 && !primarySubjectId) {
                      primarySubjectId = subjectId;
                    }
                  }
                } catch (innerErr) {
                  console.error(
                    "Failed to synchronise subject during course edit:",
                    innerErr
                  );
                }
              }

              const { subjects, ...courseValues } = values;

              // Build SubjectIDs to send to backend (after ensuring any new subjects were created above)
              const subjectIds = (subjects || [])
                .map((s) =>
                  s && typeof s === "object"
                    ? s?.id ??
                      s?.SubjectID ??
                      s?.subjectId ??
                      s?.draft?.id ??
                      null
                    : null
                )
                .filter((v) => v !== null && v !== undefined)
                .map((v) => (typeof v === "string" ? Number(v) : v));

              if (primarySubjectId !== null && primarySubjectId !== undefined) {
                courseValues.subjectId = primarySubjectId;
                courseValues.SubjectID = primarySubjectId;
                if (!subjectIds.length) subjectIds.push(primarySubjectId);
              }

              courseValues.SubjectIDs = subjectIds;

              const updated = await updateCourse(id, courseValues);
              setCourse(updated);
              setShowEditModal(false);
            } catch (err) {
              console.error("Failed to update course:", err);
            } finally {
              setSavingEdit(false);
            }
          }}
        />
      </Modal>
    </div>
  );
};

export default CourseView;
