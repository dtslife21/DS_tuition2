import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCourseDetails,
  updateCourse,
  getTeacherCourseStudents,
  getTeacherStudents,
  deleteCourse,
} from "../../services/courseService";
import { getCourseMaterials } from "../../services/materialService";
import { getCourseAttendance } from "../../services/attendanceService";
import { getUserById } from "../../services/userService";
import MaterialList from "../materials/MaterialList";
import AttendanceList from "../attendance/AttendanceList";
import Modal from "../common/Modal";
import StudentPickerModal from "../common/StudentPickerModal";
import UserList from "../users/UserList";
import CourseForm from "./CourseForm";
import MaterialForm from "../materials/MaterialForm";
import QRGenerator from "../attendance/QRGenerator";
import Loader from "../common/Loader";
import Button from "../common/Button";
import UserForm from "../users/UserForm";
import {
  createSubject,
  updateSubject,
  getAllSubjects,
} from "../../services/subjectService";
import {
  createEnrollment,
  createEnrollmentsForStudent,
} from "../../services/enrollmentService";
import { createStudent } from "../../services/studentService";
import { createUser } from "../../services/userService";
import Toast from "../common/Toast";

const CourseView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
  const [showStudentMenu, setShowStudentMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  // Ref for student menu wrapper to detect outside clicks
  const studentMenuRef = useRef(null);

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
              setStudents(scopedStudents || []);
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
              setStudents(teacherScopedStudents);
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
                return String(studentCourseId) === String(id);
              })
            : [];
          setStudents(filteredStudents);
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
  }, [id, user, loading, course?.teacherId, studentsRefreshCounter]);

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

  const handleExistingStudentConfirm = async (selectedIds = []) => {
    if (!Array.isArray(selectedIds) || !selectedIds.length) {
      setStudentActionError("Select at least one student to enroll.");
      return;
    }

    const uniqueIds = Array.from(
      new Set(
        selectedIds
          .map((id) => String(id || "").trim())
          .filter((value) => Boolean(value))
      )
    );

    if (!uniqueIds.length) {
      setStudentActionError("Select at least one student to enroll.");
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
    const enrollmentOptions = {
      EnrollmentDate: new Date().toISOString(),
      IsActive: true,
    };

    setAddingStudents(true);
    setStudentActionError("");

    try {
      for (const studentId of uniqueIds) {
        const numericStudentId = Number(studentId);
        const resolvedStudentId = Number.isNaN(numericStudentId)
          ? studentId
          : numericStudentId;

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
    } catch (error) {
      console.error("Failed to enroll selected students", error);
      setStudentActionError(
        error?.message || "Unable to add selected students. Please try again."
      );
    } finally {
      setAddingStudents(false);
    }
  };

  const handleStudentPickerClose = () => {
    if (!addingStudents) {
      setShowStudentPicker(false);
    }
  };

  const handleCreateStudent = async (formData) => {
    setStudentActionError("");

    const rawCourseId =
      course?.id ??
      course?.CourseID ??
      course?.courseID ??
      course?.CourseId ??
      course?.courseId ??
      id;

    try {
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
        if (!Number.isNaN(numericCourseId)) {
          await createEnrollmentsForStudent(
            resolvedStudentId,
            [numericCourseId],
            {
              EnrollmentDate: enrollmentDateValue || undefined,
              IsActive: true,
            }
          );
        } else {
          await createEnrollment({
            StudentID: resolvedStudentId,
            CourseID: rawCourseId,
            EnrollmentDate: enrollmentDateValue || new Date().toISOString(),
            IsActive: true,
          });
        }
      }

      setStudentActionError("");
      setStudentsRefreshCounter((prev) => prev + 1);
      setToastType("success");
      setToastMessage("Student created and enrolled in the course.");
    } catch (error) {
      console.error("Failed to create student", error);
      const message =
        error?.message || "Failed to create student. Please try again.";
      setStudentActionError(message);
      throw error;
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

  return (
    <div className="space-y-8">
      <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden rounded-2xl">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {course.name}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              {course.code}
              {formattedSubjects ? ` - ${formattedSubjects}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Edit
              </button>
            )}
            {isAdmin && (
              <button
                onClick={async () => {
                  const candidateId =
                    course?.id ?? course?.CourseID ?? course?.courseId ?? id;
                  if (!candidateId) return;
                  const confirmed = confirm(
                    `Delete course "${
                      course?.name || candidateId
                    }"? This action cannot be undone.`
                  );
                  if (!confirmed) return;
                  setDeleting(true);
                  try {
                    const ok = await deleteCourse(candidateId);
                    if (ok) {
                      setToastType("success");
                      setToastMessage("Course deleted");
                      const redirectPath = isAdmin
                        ? "/admin/courses"
                        : "/teacher/courses";
                      navigate(redirectPath);
                    } else {
                      setToastType("error");
                      setToastMessage("Failed to delete course");
                    }
                  } catch (err) {
                    console.error("Failed to delete course:", err);
                    setToastType("error");
                    setToastMessage("Failed to delete course");
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            )}
            <span className="px-3 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800">
              Active
            </span>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
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
                Subjects Included
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {subjects.length ? (
                  <ul className="list-disc list-inside space-y-1">
                    {subjects.map((subjectName) => (
                      <li key={subjectName}>
                        <Link
                          to={`/subjects/${encodeURIComponent(subjectName)}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-700"
                        >
                          {subjectName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">
                    No subjects assigned yet.
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

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Study Materials
        </h3>
        {user.userType === "teacher" && (
          <Button variant="primary" onClick={() => setShowMaterialModal(true)}>
            Upload Material
          </Button>
        )}
      </div>
      <MaterialList materials={materials} />

      <div className="flex justify-between items-center">
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
      <AttendanceList attendance={attendance} />

      {/* Do not show enrolled students list to student users */}
      {user?.userType !== "student" && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Enrolled Students
            </h3>
            {canModifyStudents ? (
              <div className="flex items-center gap-2">
                {user.userType === "teacher" ? (
                  <Button
                    variant="primary"
                    onClick={() =>
                      navigate(
                        `/teacher/students?course=${encodeURIComponent(id)}`
                      )
                    }
                  >
                    Manage Students
                  </Button>
                ) : isAdmin ? (
                  <Button
                    variant="primary"
                    onClick={() =>
                      navigate(
                        `/admin/users?tab=students&course=${encodeURIComponent(
                          id
                        )}`
                      )
                    }
                  >
                    Manage Students
                  </Button>
                ) : null}
                <div className="relative" ref={studentMenuRef}>
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
              <UserList
                users={students}
                // In the course view we don't want inline edit/delete buttons;
                // management should happen on the dedicated Students pages.
                allowManage={false}
                getDetailsPath={(student) => {
                  const identifier =
                    student.UserID ||
                    student.userID ||
                    student.userId ||
                    student.id ||
                    student.StudentID ||
                    student.studentID ||
                    student.studentId;
                  if (!identifier) return null;
                  return user?.userType === "teacher"
                    ? `/teacher/students/${identifier}`
                    : `/admin/users/${identifier}`;
                }}
                onEdit={null}
                onDelete={null}
              />
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
        title="Add Existing Students"
        saving={addingStudents}
        errorMessage={studentActionError}
      />

      <Modal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Register New Student"
        size="lg"
      >
        <UserForm
          onSubmit={async (formData) => {
            try {
              setAddingStudents(true);
              await handleCreateStudent(formData);
              setShowRegisterModal(false);
            } catch (e) {
              // handleCreateStudent sets studentActionError
            } finally {
              setAddingStudents(false);
            }
          }}
          loading={addingStudents}
          forceUserType={3}
          showCoreFields={true}
          showRoleFields={true}
          submitLabel={addingStudents ? "Creating..." : "Create Student"}
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
                    ? s?.id ?? s?.SubjectID ?? s?.subjectId ?? s?.draft?.id ?? null
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
