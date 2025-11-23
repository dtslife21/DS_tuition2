import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getUserById, updateUser } from "../../services/userService";
import {
  getTeacherCourses,
  getStudentCourses,
  updateCourse,
} from "../../services/courseService";
import {
  createEnrollmentsForStudent,
  getEnrollmentsByStudent,
  deleteEnrollment,
} from "../../services/enrollmentService";
import { getStudentById } from "../../services/studentService";
import {
  getTeacherById,
  updateTeacher as updateTeacherService,
} from "../../services/teacherService";
import UserForm from "../../components/users/UserForm";
import Card from "../../components/common/Card";
import Avatar from "../../components/common/Avatar";
import Loader from "../../components/common/Loader";
import CoursePickerModal from "../../components/courses/CoursePickerModal";
import AttendanceList from "../../components/attendance/AttendanceList";
import { getStudentAttendance } from "../../services/attendanceService";
// No direct CourseCard usage here because admin links differ from teacher view

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {label}
    </span>
    <span className="text-sm text-gray-900 dark:text-gray-100 break-all">
      {value ?? "-"}
    </span>
  </div>
);

const Pill = ({ children, color = "indigo" }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-${color}-100 text-${color}-800 dark:bg-${color}-900/30 dark:text-${color}-800`}
  >
    {children}
  </span>
);

const UserDetailsPage = ({
  allowEdit = true,
  showManageLink = false,
  manageLinkPath = "/admin/users",
  manageLinkText = "Manage Users",
  backPath,
  heading = "User Details",
  listLabel = "Users",
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState("");
  const [teacherDetails, setTeacherDetails] = useState(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState("");
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [isAssignCoursesOpen, setIsAssignCoursesOpen] = useState(false);
  const [assigningCourses, setAssigningCourses] = useState(false);
  const [assignCoursesError, setAssignCoursesError] = useState("");
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollingCourses, setEnrollingCourses] = useState(false);
  const [enrollCoursesError, setEnrollCoursesError] = useState("");
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [unenrollingId, setUnenrollingId] = useState(null);
  const [unenrollError, setUnenrollError] = useState("");

  const isTeacherUser = useMemo(() => {
    if (!user) return false;
    const roleId = String(user.UserTypeID || user.userTypeID || "").trim();
    if (roleId === "2") return true;
    const roleName = String(user.userType || "").toLowerCase();
    return roleName === "teacher";
  }, [user]);

  const isStudentUser = useMemo(() => {
    if (!user) return false;
    const roleId = String(user.UserTypeID || user.userTypeID || "").trim();
    if (roleId === "3") return true;
    const roleName = String(user.userType || "").toLowerCase();
    return roleName === "student";
  }, [user]);

  const teacherIdentifier = useMemo(() => {
    const candidates = [
      user?.TeacherID,
      user?.teacherID,
      user?.teacherId,
      teacherDetails?.TeacherID,
      teacherDetails?.teacherID,
      teacherDetails?.teacherId,
      teacherDetails?.id,
      user?.UserID,
      user?.id,
    ];
    for (const value of candidates) {
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str.length) return str;
    }
    return "";
  }, [teacherDetails, user]);

  const resolvedTeacherId = useMemo(() => {
    if (!teacherIdentifier) return null;
    return !Number.isNaN(Number(teacherIdentifier))
      ? Number(teacherIdentifier)
      : teacherIdentifier;
  }, [teacherIdentifier]);

  const handleBackClick = () => {
    if (backPath) {
      navigate(backPath);
      return;
    }
    navigate(-1);
  };

  const startEditing = () => {
    if (!allowEdit) return;
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await getUserById(id);
        setUser(data);
      } catch (err) {
        setError("Failed to load user details");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  // When the loaded user is a teacher or student, fetch their courses for admin view
  const loadCourses = useCallback(async () => {
    if (!user) {
      setCourses([]);
      return;
    }

    try {
      setCoursesLoading(true);
      setCoursesError("");

      if (isTeacherUser) {
        if (!teacherIdentifier) {
          setCourses([]);
          return;
        }

        const normalizedTeacherId = !Number.isNaN(Number(teacherIdentifier))
          ? Number(teacherIdentifier)
          : teacherIdentifier;
        const list = await getTeacherCourses(normalizedTeacherId);
        setCourses(Array.isArray(list) ? list : []);
        return;
      }

      if (isStudentUser) {
        const rawStudentId =
          user.StudentID ??
          user.studentID ??
          user.studentId ??
          user.id ??
          user.UserID ??
          user.userID ??
          null;

        if (!rawStudentId) {
          setCourses([]);
          return;
        }

        const normalizedStudentId = !Number.isNaN(Number(rawStudentId))
          ? Number(rawStudentId)
          : rawStudentId;
        const list = await getStudentCourses(normalizedStudentId);
        setCourses(Array.isArray(list) ? list : []);

        try {
          const enrolls = await getEnrollmentsByStudent(normalizedStudentId);
          setStudentEnrollments(Array.isArray(enrolls) ? enrolls : []);
        } catch (e) {
          console.warn("Failed to load student enrollments", e);
          setStudentEnrollments([]);
        }
        return;
      }

      // Not teacher or student, skip
      setCourses([]);
    } catch (err) {
      setCoursesError(
        isTeacherUser
          ? "Failed to load teacher courses"
          : isStudentUser
          ? "Failed to load student courses"
          : "Failed to load courses"
      );
    } finally {
      setCoursesLoading(false);
    }
  }, [isStudentUser, isTeacherUser, teacherIdentifier, user]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const assignedCourseIds = useMemo(() => {
    return (courses || [])
      .map((course) => {
        const id =
          course?.id ??
          course?.CourseID ??
          course?.courseId ??
          course?.CourseId;
        if (id === undefined || id === null) return null;
        const str = String(id).trim();
        return str.length ? str : null;
      })
      .filter(Boolean);
  }, [courses]);

  const studentSubjects = useMemo(() => {
    const collected = [];
    if (!Array.isArray(courses)) return collected;

    for (const c of courses) {
      if (!c) continue;
      // normalized subject names may appear in several places
      if (Array.isArray(c.subjects) && c.subjects.length) {
        for (const s of c.subjects) {
          if (s === undefined || s === null) continue;
          const name = typeof s === "string" ? s.trim() : String(s || "");
          if (name) collected.push(name);
        }
      } else if (c.subject) {
        const name = String(c.subject || "").trim();
        if (name) collected.push(name);
      } else if (
        c.subjectDetails &&
        (c.subjectDetails.name || c.subjectDetails.SubjectName)
      ) {
        const name = (
          c.subjectDetails.name ||
          c.subjectDetails.SubjectName ||
          ""
        ).trim();
        if (name) collected.push(name);
      } else if (Array.isArray(c.CourseNames) && c.CourseNames.length) {
        // ignore course names here
      }
    }

    return Array.from(new Set(collected));
  }, [courses]);

  const isAdminViewer = useMemo(() => {
    if (!authUser) return false;
    const idVal = String(
      authUser.UserTypeID || authUser.userTypeID || ""
    ).trim();
    if (idVal === "1") return true;
    const name = String(
      authUser.userType || authUser.UserType || ""
    ).toLowerCase();
    return name === "admin";
  }, [authUser]);

  const enrollmentIdByCourseId = useMemo(() => {
    const map = new Map();
    (studentEnrollments || []).forEach((e) => {
      const cid = String(e.CourseID ?? e.courseID ?? e.courseId ?? "");
      const eid =
        e.EnrollmentID ??
        e.enrollmentID ??
        e.id ??
        e.EnrollmentId ??
        e.raw?.EnrollmentID ??
        null;
      if (cid) map.set(cid, eid);
    });
    return map;
  }, [studentEnrollments]);

  const handleUnenrollCourse = async (course) => {
    if (!isStudentUser) return;
    setUnenrollError("");

    const cid = String(
      course?.id ??
        course?.CourseID ??
        course?.courseId ??
        course?.CourseId ??
        ""
    );
    const enrollmentId = enrollmentIdByCourseId.get(cid);
    if (!enrollmentId) {
      setUnenrollError("No enrollment record found for this course.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove this course enrollment?`
    );
    if (!confirmed) return;

    setUnenrollingId(enrollmentId);
    try {
      const ok = await deleteEnrollment(enrollmentId);
      if (!ok) throw new Error("Failed to delete enrollment");
      // refresh courses/enrollments
      await loadCourses();
    } catch (err) {
      console.error("Failed to unenroll", err);
      setUnenrollError(err?.message || "Unable to remove enrollment.");
    } finally {
      setUnenrollingId(null);
    }
  };

  const handleOpenAssignCourses = () => {
    if (!isTeacherUser) return;
    setAssignCoursesError("");
    setIsAssignCoursesOpen(true);
  };

  const handleOpenEnrollCourses = () => {
    if (!isStudentUser) return;
    setEnrollCoursesError("");
    setIsEnrollOpen(true);
  };

  const handleCloseAssignCourses = () => {
    if (assigningCourses) return;
    setIsAssignCoursesOpen(false);
    setAssignCoursesError("");
  };

  const handleAssignCourses = async (selectedIds) => {
    if (!isTeacherUser) {
      setAssignCoursesError(
        "Course assignments are only available for teachers."
      );
      return;
    }

    if (resolvedTeacherId === null || resolvedTeacherId === "") {
      setAssignCoursesError(
        "Missing teacher identifier. Please reload and try again."
      );
      return;
    }

    const preparedCourseIds = [];
    for (const rawId of selectedIds || []) {
      if (rawId === undefined || rawId === null) continue;
      const str = String(rawId).trim();
      if (!str) continue;
      const alreadyPrepared = preparedCourseIds.some(
        (item) => item.key === str
      );
      if (alreadyPrepared) continue;
      const value = !Number.isNaN(Number(str)) ? Number(str) : str;
      preparedCourseIds.push({ key: str, value });
    }

    const pendingAssignments = preparedCourseIds.filter(
      (item) => !assignedCourseIds.includes(item.key)
    );

    if (!pendingAssignments.length) {
      setAssignCoursesError("Select at least one new course to assign.");
      return;
    }

    setAssigningCourses(true);
    setAssignCoursesError("");

    try {
      for (const { value } of pendingAssignments) {
        await updateCourse(value, { TeacherID: resolvedTeacherId });
      }

      setIsAssignCoursesOpen(false);
      await loadCourses();
    } catch (err) {
      console.error("Failed to assign courses to teacher", err);
      setAssignCoursesError(
        err?.message || "Failed to assign courses. Please try again."
      );
    } finally {
      setAssigningCourses(false);
    }
  };

  const studentIdentifier = useMemo(() => {
    const candidates = [
      user?.StudentID,
      user?.studentID,
      user?.studentId,
      studentDetails?.StudentID,
      studentDetails?.studentID,
      studentDetails?.studentId,
      studentDetails?.id,
      user?.UserID,
      user?.id,
    ];
    for (const value of candidates) {
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str.length) return str;
    }
    return "";
  }, [studentDetails, user]);

  const resolvedStudentId = useMemo(() => {
    if (!studentIdentifier) return null;
    return !Number.isNaN(Number(studentIdentifier))
      ? Number(studentIdentifier)
      : studentIdentifier;
  }, [studentIdentifier]);

  const handleCloseEnrollCourses = () => {
    if (enrollingCourses) return;
    setIsEnrollOpen(false);
    setEnrollCoursesError("");
  };

  const handleEnrollCourses = async (selectedIds) => {
    if (!isStudentUser) {
      setEnrollCoursesError(
        "Course enrollment is only available for students."
      );
      return;
    }

    if (resolvedStudentId === null || resolvedStudentId === "") {
      setEnrollCoursesError(
        "Missing student identifier. Please reload and try again."
      );
      return;
    }

    const preparedIds = (selectedIds || [])
      .map((id) => (id === undefined || id === null ? null : String(id).trim()))
      .filter(Boolean);

    const pending = preparedIds.filter((id) => !assignedCourseIds.includes(id));

    if (!pending.length) {
      setEnrollCoursesError("Select at least one new course to enroll.");
      return;
    }

    setEnrollingCourses(true);
    setEnrollCoursesError("");
    try {
      await createEnrollmentsForStudent(
        resolvedStudentId,
        pending.map((id) => (Number.isNaN(Number(id)) ? id : Number(id)))
      );
      setIsEnrollOpen(false);
      await loadCourses();
    } catch (err) {
      console.error("Failed to enroll courses for student", err);
      setEnrollCoursesError(
        err?.message || "Failed to enroll courses. Please try again."
      );
    } finally {
      setEnrollingCourses(false);
    }
  };

  // Fetch teacher record (department/qualification/bio/etc.) when user is a teacher
  useEffect(() => {
    const fetchTeacher = async () => {
      if (!user) return;

      const isTeacherType =
        String(user.UserTypeID || user.userTypeID || "").trim() === "2" ||
        String((user.userType || "").toLowerCase()) === "teacher";

      if (!isTeacherType) {
        setTeacherDetails(null);
        setTeacherError("");
        return;
      }

      const teacherId =
        user.TeacherID ??
        user.teacherID ??
        user.teacherId ??
        user.UserID ??
        user.id ??
        null;

      try {
        setTeacherLoading(true);
        setTeacherError("");
        if (!teacherId) {
          setTeacherDetails(null);
          return;
        }
        const rec = await getTeacherById(teacherId);
        setTeacherDetails(rec);
      } catch (err) {
        console.warn("Failed to load teacher record", err);
        setTeacherError("Failed to load teacher details");
      } finally {
        setTeacherLoading(false);
      }
    };

    fetchTeacher();
  }, [user]);

  // Fetch student record when user is a student
  useEffect(() => {
    const fetchStudent = async () => {
      if (!user) return;

      const isStudentType =
        String(user.UserTypeID || user.userTypeID || "").trim() === "3" ||
        String((user.userType || "").toLowerCase()) === "student";

      if (!isStudentType) {
        setStudentDetails(null);
        setStudentError("");
        return;
      }

      const studentId =
        user.StudentID ??
        user.studentID ??
        user.studentId ??
        user.UserID ??
        user.id ??
        null;

      try {
        setStudentLoading(true);
        setStudentError("");
        if (!studentId) {
          setStudentDetails(null);
          return;
        }
        const rec = await getStudentById(studentId);
        setStudentDetails(rec);
      } catch (err) {
        console.warn("Failed to load student record", err);
        setStudentError("Failed to load student details");
      } finally {
        setStudentLoading(false);
      }
    };

    fetchStudent();
  }, [user]);

  // Load attendance records for the viewed student (admin/teacher view)
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!isStudentUser) {
        setStudentAttendance([]);
        setAttendanceError("");
        setAttendanceLoading(false);
        return;
      }

      // Prefer studentDetails (service-fetched) but fall back to user props
      const rawStudentId =
        studentDetails?.StudentID ??
        studentDetails?.studentID ??
        studentDetails?.studentId ??
        user?.StudentID ??
        user?.studentID ??
        user?.studentId ??
        user?.UserID ??
        user?.userID ??
        user?.id ??
        null;

      if (!rawStudentId) {
        setStudentAttendance([]);
        return;
      }

      try {
        setAttendanceLoading(true);
        setAttendanceError("");
        const records = await getStudentAttendance(rawStudentId);
        setStudentAttendance(Array.isArray(records) ? records : []);
      } catch (err) {
        console.error("Failed to load student attendance", err);
        setAttendanceError("Unable to load attendance records.");
        setStudentAttendance([]);
      } finally {
        setAttendanceLoading(false);
      }
    };

    fetchAttendance();
  }, [isStudentUser, studentDetails, user, id]);

  const handleSave = async (userData) => {
    if (!allowEdit) return;
    try {
      const updatedUser = await updateUser(id, userData);
      setUser(updatedUser);
      // If the updated user is a teacher, also persist teacher-specific fields
      try {
        const isTeacherType =
          String(
            updatedUser?.UserTypeID ?? updatedUser?.userTypeID ?? ""
          ).trim() === "2" ||
          String(updatedUser?.userType || "").toLowerCase() === "teacher";

        if (isTeacherType) {
          const teacherId =
            updatedUser?.TeacherID ??
            updatedUser?.teacherID ??
            updatedUser?.teacherId ??
            updatedUser?.UserID ??
            updatedUser?.id ??
            resolvedTeacherId ??
            null;

          if (teacherId) {
            const teacherPayload = {
              EmployeeID: userData.EmployeeID ?? userData.employeeID,
              Department: userData.Department ?? userData.department,
              Qualification: userData.Qualification ?? userData.qualification,
              JoiningDate: userData.JoiningDate ?? userData.joiningDate,
              Bio: userData.Bio ?? userData.bio,
            };

            // Only call update when there's at least one teacher field present
            const hasTeacherFields = Object.values(teacherPayload).some(
              (v) => v !== undefined && v !== null && String(v).trim() !== ""
            );

            if (hasTeacherFields) {
              try {
                await updateTeacherService(teacherId, teacherPayload);
                // merge into local teacherDetails for immediate UI update
                setTeacherDetails((prev) => ({
                  ...(prev || {}),
                  ...teacherPayload,
                }));
              } catch (e) {
                console.warn("Failed to update teacher record", e);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Teacher sync check failed", e);
      }

      setIsEditing(false);
    } catch (err) {
      setError("Failed to update user");
    }
  };

  const fullName = [
    user?.FirstName || user?.firstName,
    user?.LastName || user?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const userTypeLabel = (() => {
    const map = { 1: "Admin", 2: "Teacher", 3: "Student" };
    const idVal = String(user?.UserTypeID ?? user?.userTypeID ?? "");
    const byId = map[idVal];
    if (byId) return byId;
    const byName = String(user?.userType || "").toLowerCase();
    if (byName === "admin") return "Admin";
    if (byName === "teacher") return "Teacher";
    if (byName === "student") return "Student";
    return user?.userType || "Unknown";
  })();

  if (loading) {
    return <Loader className="h-64" />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {heading}
          </h1>
          {manageLinkPath && (
            <Link
              to={manageLinkPath}
              className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
            >
              {`Back to ${listLabel}`}
            </Link>
          )}
        </div>
        <div className="rounded-md bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!user)
    return (
      <div className="text-gray-600 dark:text-gray-300">User not found</div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <button
            onClick={handleBackClick}
            className="rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {heading}
          </h1>
        </div>
        {(allowEdit || (showManageLink && manageLinkPath)) && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* {allowEdit && !isEditing && (
              <button
                onClick={startEditing}
                className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:w-auto"
              >
                Edit
              </button>
            )} */}
            {allowEdit && isEditing && (
              <button
                onClick={cancelEditing}
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 sm:w-auto"
              >
                Cancel
              </button>
            )}
            {!isEditing && showManageLink && manageLinkPath && (
              <Link
                to={manageLinkPath}
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 sm:w-auto"
              >
                {manageLinkText}
              </Link>
            )}
          </div>
        )}
      </div>

      {allowEdit && isEditing ? (
        <div className="rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70 sm:p-6">
          <UserForm
            onSubmit={handleSave}
            // pass a merged initialData so teacher-specific fields (like JoiningDate)
            // from `teacherDetails` appear in the form when editing a teacher.
            initialData={
              teacherDetails ? { ...(user || {}), ...teacherDetails } : user
            }
            userTypes={[
              { id: 1, name: "Admin" },
              { id: 2, name: "Teacher" },
              { id: 3, name: "Student" },
            ]}
          />
        </div>
      ) : (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <Avatar
              name={fullName || user.Username || user.username}
              size="lg"
              src={user.ProfilePicture || user.profilePicture || undefined}
              user={user}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                  {fullName || user.Username || user.username || "User"}
                </h2>
                <Pill>{userTypeLabel}</Pill>
                {user.IsActive ?? user.isActive ? (
                  <Pill color="green">Active</Pill>
                ) : (
                  <Pill color="gray">Inactive</Pill>
                )}
                {(user.TeacherID || user.teacherId) && (
                  <Pill color="purple">
                    Teacher #{user.TeacherID || user.teacherId}
                  </Pill>
                )}
                {(user.StudentID || user.studentId) && (
                  <Pill color="yellow">
                    Student #{user.StudentID || user.studentId}
                  </Pill>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-all">
                {user.Email || user.email}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow
              label="First Name"
              value={user.FirstName || user.firstName}
            />
            <InfoRow label="Last Name" value={user.LastName || user.lastName} />
            <InfoRow label="Username" value={user.Username || user.username} />
            <InfoRow label="Email" value={user.Email || user.email} />
            <InfoRow label="User Type" value={userTypeLabel} />
            {/* <InfoRow
              label="User Type ID"
              value={user.UserTypeID || user.userTypeID}
            /> */}
            {/* <InfoRow label="User ID" value={user.UserID || user.id} /> */}
            {(user.EmployeeID || user.employeeID) && (
              <InfoRow
                label="Employee ID"
                value={user.EmployeeID || user.employeeID}
              />
            )}
            {(user.RollNumber || user.rollNumber) && (
              <InfoRow
                label="Student ID"
                value={user.RollNumber || user.rollNumber}
              />
            )}
          </div>
          {/* Teacher-specific details (if present) */}
          {teacherLoading && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Loading teacher details...
            </div>
          )}
          {teacherError && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md">
              {teacherError}
            </div>
          )}
          {teacherDetails && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Teacher Details
              </h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(teacherDetails.Department || teacherDetails.department) && (
                  <InfoRow
                    label="Department"
                    value={
                      teacherDetails.Department || teacherDetails.department
                    }
                  />
                )}
                {(teacherDetails.Qualification ||
                  teacherDetails.qualification) && (
                  <InfoRow
                    label="Qualification"
                    value={
                      teacherDetails.Qualification ||
                      teacherDetails.qualification
                    }
                  />
                )}
                {(teacherDetails.JoiningDate || teacherDetails.joiningDate) && (
                  <InfoRow
                    label="Joining Date"
                    value={new Date(
                      teacherDetails.JoiningDate || teacherDetails.joiningDate
                    ).toLocaleDateString()}
                  />
                )}
                {(teacherDetails.EmployeeID || teacherDetails.employeeID) &&
                  !(user.EmployeeID || user.employeeID) && (
                    <InfoRow
                      label="Employee ID"
                      value={
                        teacherDetails.EmployeeID || teacherDetails.employeeID
                      }
                    />
                  )}
              </div>

              {(teacherDetails.Bio || teacherDetails.bio) && (
                <div className="mt-4 bg-gray-50 dark:bg-gray-900/20 p-3 rounded-md text-sm text-gray-700 dark:text-gray-300">
                  <div className="font-medium text-gray-900 dark:text-white">
                    Bio
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">
                    {teacherDetails.Bio || teacherDetails.bio}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Student-specific details (shown below main card, before courses) */}
      {studentLoading && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          Loading student details...
        </div>
      )}
      {studentError && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md">
          {studentError}
        </div>
      )}
      {studentDetails && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Student Details
            </h2>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow
                label="Student ID"
                value={
                  studentDetails.RollNumber || studentDetails.rollNumber || "-"
                }
              />
              <InfoRow
                label="Enrollment Date"
                value={
                  studentDetails.EnrollmentDate
                    ? new Date(
                        studentDetails.EnrollmentDate
                      ).toLocaleDateString()
                    : "-"
                }
              />
              <div>
                <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Class
                </span>
                <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-all">
                  {studentSubjects && studentSubjects.length ? (
                    <span>
                      {studentSubjects.map((s, idx) => (
                        <span key={s}>
                          <Link
                            to={`/subjects/${encodeURIComponent(s)}`}
                            state={{ backgroundLocation: location }}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {s}
                          </Link>
                          {idx < studentSubjects.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">-</span>
                  )}
                </div>
              </div>
              <InfoRow
                label="Parent Name"
                value={
                  studentDetails.ParentName || studentDetails.parentName || "-"
                }
              />
              <InfoRow
                label="Parent Contact"
                value={
                  studentDetails.ParentContact ||
                  studentDetails.parentContact ||
                  "-"
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Attendance records for the student (visible to admin/teacher when viewing a student) */}
      {/* {isStudentUser && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Attendance Records
            </h2>
            <span className="text-sm text-gray-500">
              {attendanceLoading
                ? "Loading..."
                : `${studentAttendance.length} record(s)`}
            </span>
          </div>

          {attendanceError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md">
              {attendanceError}
            </div>
          )}

          {attendanceLoading ? (
            <Loader className="h-32" />
          ) : (
            <AttendanceList attendance={studentAttendance || []} />
          )}
        </div>
      )} */}

      {/* Courses section for Teacher or Student (visible to admin) */}
      {user &&
        (String(user.UserTypeID || user.userTypeID || "").trim() === "2" ||
          String((user.userType || "").toLowerCase()) === "teacher" ||
          String(user.UserTypeID || user.userTypeID || "").trim() === "3" ||
          String((user.userType || "").toLowerCase()) === "student") && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {String(user.UserTypeID || user.userTypeID || "").trim() ===
                    "2" ||
                  String((user.userType || "").toLowerCase()) === "teacher"
                    ? "Assigned Courses"
                    : "Enrolled Courses"}
                </h2>
                {isTeacherUser && (
                  <button
                    onClick={handleOpenAssignCourses}
                    className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:w-auto"
                  >
                    Assign Course
                  </button>
                )}
                {/* {isStudentUser && (
                  <button
                    onClick={handleOpenEnrollCourses}
                    className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:w-auto"
                  >
                    Enroll Course
                  </button>
                )} */}
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {coursesLoading ? "Loading..." : `${courses.length} course(s)`}
              </span>
            </div>

            {coursesLoading && <Loader className="h-32" />}

            {coursesError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md">
                {coursesError}
              </div>
            )}

            {!coursesLoading &&
              !coursesError &&
              courses &&
              courses.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {courses.map((course) => (
                    <div
                      key={course.id || course.CourseID || course.courseId}
                      className="rounded-lg border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/70"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {course.name || course.CourseName || "Course"}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {course.code || course.CourseCode} —{" "}
                            {course.subject ||
                              (course.subjectDetails &&
                                course.subjectDetails.name) ||
                              ""}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          {(() => {
                            const prefix =
                              authUser && authUser.userType === "teacher"
                                ? "/teacher"
                                : "/admin";
                            const cid =
                              course.id || course.CourseID || course.courseId;
                            if (!cid) {
                              return (
                                <button
                                  className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-gray-200 text-gray-700"
                                  disabled
                                >
                                  View
                                </button>
                              );
                            }

                            return (
                              <Link
                                to={`${prefix}/courses/${cid}`}
                                className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:w-auto"
                              >
                                View
                              </Link>
                            );
                          })()}
                          {isStudentUser &&
                            isAdminViewer &&
                            (() => {
                              const cid = String(
                                course.id ??
                                  course.CourseID ??
                                  course.courseId ??
                                  ""
                              );
                              const eid = enrollmentIdByCourseId.get(cid);
                              return (
                                <div className="mt-2">
                                  <button
                                    onClick={() => handleUnenrollCourse(course)}
                                    disabled={!eid || unenrollingId === eid}
                                    className="inline-flex w-full items-center justify-center rounded-md bg-gray-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:w-auto"
                                  >
                                    {unenrollingId === eid
                                      ? "Removing..."
                                      : "Remove"}
                                  </button>
                                </div>
                              );
                            })()}
                        </div>
                      </div>
                      {course.description && (
                        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                          {course.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {!coursesLoading &&
              !coursesError &&
              (!courses || courses.length === 0) && (
                <div className="text-gray-600 dark:text-gray-400">
                  {String(user.UserTypeID || user.userTypeID || "").trim() ===
                    "2" ||
                  String((user.userType || "").toLowerCase()) === "teacher"
                    ? "No courses assigned to this teacher."
                    : "No courses enrolled for this student."}
                </div>
              )}

            {isTeacherUser && (
              <CoursePickerModal
                isOpen={isAssignCoursesOpen}
                onClose={handleCloseAssignCourses}
                initialSelected={[]}
                title="Assign Course"
                description="Select one or more courses to assign to this teacher."
                multiSelect
                allowCreate
                teacherId={
                  resolvedTeacherId === null || resolvedTeacherId === ""
                    ? undefined
                    : resolvedTeacherId
                }
                scopeToTeacher={false}
                excludedIds={assignedCourseIds}
                saving={assigningCourses}
                proceedLabel={
                  assigningCourses ? "Assigning..." : "Assign Courses"
                }
                errorMessage={assignCoursesError}
                onProceed={handleAssignCourses}
              />
            )}
            {isStudentUser && (
              <CoursePickerModal
                isOpen={isEnrollOpen}
                onClose={handleCloseEnrollCourses}
                initialSelected={[]}
                title="Enroll Courses"
                description="Select one or more courses to enroll this student in."
                multiSelect
                allowCreate
                teacherId={undefined}
                scopeToTeacher={false}
                excludedIds={assignedCourseIds}
                saving={enrollingCourses}
                proceedLabel={
                  enrollingCourses ? "Enrolling..." : "Enroll Courses"
                }
                errorMessage={enrollCoursesError}
                onProceed={handleEnrollCourses}
              />
            )}
          </div>
        )}
    </div>
  );
};

export default UserDetailsPage;
