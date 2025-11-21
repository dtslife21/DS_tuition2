import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getTeacherStudents,
  getCourseDetails,
  getTeacherCourseStudents,
} from "../../services/courseService";
import UserList from "../../components/users/UserList";
import UserForm from "../../components/users/UserForm";
import Toast from "../../components/common/Toast";
import {
  createUser,
  updateUser,
  deleteUser,
  getUserById,
} from "../../services/userService";
import { uploadProfilePhoto } from "../../services/userService";
import {
  createStudent,
  updateStudent,
  deleteStudent as deleteStudentRecord,
  getStudentById,
} from "../../services/studentService";
import {
  createEnrollmentsForStudent,
  getEnrollmentsByStudent,
  deleteEnrollment,
} from "../../services/enrollmentService";
import { getStudentCourses } from "../../services/courseService";
import Loader from "../../components/common/Loader";
import CoursePickerModal from "../../components/courses/CoursePickerModal";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";

const resolveTeacherId = (user) => {
  if (!user || typeof user !== "object") {
    return null;
  }

  return (
    user.TeacherID ??
    user.teacherID ??
    user.teacherId ??
    user.UserID ??
    user.userID ??
    user.userId ??
    user.id ??
    null
  );
};

const TeacherStudents = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [isEditOpen, setEditOpen] = useState(false);
  const [editStep, setEditStep] = useState(1);
  const [forceUserType, setForceUserType] = useState(null);
  const [formError, setFormError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("success");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [pendingCoreData, setPendingCoreData] = useState(null);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [pendingStudentData, setPendingStudentData] = useState(null);
  const [courseSelection, setCourseSelection] = useState([]);
  const [coursePickerSaving, setCoursePickerSaving] = useState(false);
  const [coursePickerError, setCoursePickerError] = useState("");
  const teacherId = resolveTeacherId(user);
  const queryCourse = new URLSearchParams(location.search || "").get("course");
  const courseId = queryCourse
    ? String(queryCourse).trim()
    : id
    ? String(id).trim()
    : null;
  const defaultCourseSelection = courseId ? [String(courseId)] : [];

  const refreshStudents = async () => {
    if (!teacherId) {
      setStudents([]);
      return;
    }

    try {
      if (courseId) {
        try {
          const { course: scopedCourse, students: scopedStudents } =
            await getTeacherCourseStudents(teacherId, courseId);
          setStudents(scopedStudents);
          if (scopedCourse) {
            setCourse(scopedCourse);
          }
        } catch (error) {
          console.error(
            "Error refreshing course students via teacher route:",
            error
          );
          const fallbackStudents = await getTeacherStudents(courseId, {
            scope: "course",
          });
          setStudents(fallbackStudents);
        }
      } else {
        const updatedStudents = await getTeacherStudents(teacherId);
        setStudents(updatedStudents);
        setCourse(null);
      }
    } catch (error) {
      console.error("Error refreshing students:", error);
    }
  };

  const [membersTab, setMembersTab] = useState("active");

  const openEdit = async (userId) => {
    setEditLoading(true);
    setFormError("");
    setEditStep(1);
    setForceUserType(3);
    try {
      const [userData, studentData] = await Promise.all([
        getUserById(userId),
        getStudentById(userId),
      ]);
      setEditUser(studentData ? { ...userData, ...studentData } : userData);
    } catch (err) {
      console.error("Error loading user for edit:", err);
      const fallback = students.find((s) => (s.UserID || s.id) === userId);
      setEditUser(fallback || null);
    } finally {
      setEditLoading(false);
      setEditOpen(true);
    }
  };

  const handleActivateUser = async (userID) => {
    try {
      setFormError("");
      const updated = await updateUser(userID, { IsActive: true });
      setStudents((prev) =>
        prev.map((u) => {
          const id = u.UserID || u.id || u.userID || u.userId || null;
          const updatedId =
            updated.UserID || updated.id || updated.userID || updated.userId;
          return String(id) === String(updatedId) ? updated : u;
        })
      );
      setToastMessage("User activated.");
      setToastType("success");
    } catch (err) {
      console.error("Failed to activate user", err);
      setFormError(err?.message || "Failed to activate user");
      setToastMessage("Failed to activate user.");
      setToastType("error");
    }
  };

  const handleDeactivateUser = async (userID) => {
    try {
      setFormError("");
      // confirm removal
      const ok = window.confirm("Do You Want To Remove This Student?");
      if (!ok) return;
      const updated = await updateUser(userID, { IsActive: false });
      setStudents((prev) =>
        prev.map((u) => {
          const id = u.UserID || u.id || u.userID || u.userId || null;
          const updatedId =
            updated.UserID || updated.id || updated.userID || updated.userId;
          return String(id) === String(updatedId) ? updated : u;
        })
      );
      setToastMessage("User deactivated.");
      setToastType("success");
    } catch (err) {
      console.error("Failed to deactivate user", err);
      setFormError(err?.message || "Failed to deactivate user");
      setToastMessage("Failed to deactivate user.");
      setToastType("error");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!teacherId) {
        setStudents([]);
        setCourse(null);
        setLoading(false);
        return;
      }

      try {
        if (courseId) {
          try {
            const { course: scopedCourse, students: scopedStudents } =
              await getTeacherCourseStudents(teacherId, courseId);
            setStudents(scopedStudents);
            setCourse(
              scopedCourse || (await getCourseDetails(courseId)) || null
            );
          } catch (error) {
            console.error(
              "Error fetching course students via teacher route:",
              error
            );
            const [studentsData, courseData] = await Promise.all([
              getTeacherStudents(courseId, { scope: "course" }),
              getCourseDetails(courseId),
            ]);
            setStudents(studentsData);
            setCourse(courseData);
          }
        } else {
          const studentsData = await getTeacherStudents(teacherId);
          setStudents(studentsData);
          setCourse(null);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teacherId, courseId]);

  const openCreateModal = () => {
    setCreateOpen(true);
    setCreateStep(1);
    setPendingCoreData(null);
    setPendingStudentData(null);
    setCourseSelection(defaultCourseSelection);
    setCoursePickerError("");
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreateStep(1);
    setPendingCoreData(null);
    setPendingStudentData(null);
    setCourseSelection(defaultCourseSelection);
    setCoursePickerError("");
  };

  const handleCreateSubmit = async (formData) => {
    if (createStep === 1) {
      setPendingCoreData(formData);
      setCreateStep(2);
      return;
    }

    const mergedPayload = {
      ...(pendingCoreData || {}),
      ...formData,
    };

    const normalizedPayload = {
      ...mergedPayload,
      UserTypeID: 3,
      userTypeID: 3,
      IsActive: true,
      ProfilePicture:
        mergedPayload.ProfilePicture || mergedPayload.profilePicture || null,
    };

    const existingCourseIds = Array.isArray(normalizedPayload.StudentCourseIDs)
      ? normalizedPayload.StudentCourseIDs
      : Array.isArray(normalizedPayload.CourseIDs)
      ? normalizedPayload.CourseIDs
      : [];

    const initialSelection = Array.from(
      new Set([
        ...defaultCourseSelection,
        ...(existingCourseIds || []).map((cid) => String(cid)),
      ])
    ).filter(Boolean);

    setPendingStudentData(normalizedPayload);
    setCourseSelection(
      (initialSelection && initialSelection.length
        ? initialSelection
        : defaultCourseSelection
      ).map(String)
    );
    setCreateOpen(false);
    setCreateStep(1);
    setPendingCoreData(null);
    setCoursePickerError("");
    setShowCoursePicker(true);
  };

  const handleCoursePickerClose = () => {
    if (coursePickerSaving) return;
    setShowCoursePicker(false);
    setPendingStudentData(null);
    setCoursePickerError("");
    setCourseSelection(defaultCourseSelection);
  };

  const handleCoursePickerProceed = async (selectedIds) => {
    const ids = (selectedIds || []).map((id) => String(id));
    setCourseSelection(ids);

    if (!pendingStudentData) {
      setShowCoursePicker(false);
      setCourseSelection(defaultCourseSelection);
      return;
    }

    setCoursePickerSaving(true);
    setCoursePickerError("");

    try {
      const photoToUpload =
        pendingStudentData.ProfilePicture ||
        pendingStudentData.profilepicture ||
        null;

      const createdUser = await createUser({
        ...pendingStudentData,
        CourseIDs: ids.map((cid) =>
          Number.isNaN(Number(cid)) ? cid : Number(cid)
        ),
        IsActive: true,
        ProfilePicture: null,
      });

      // upload profile photo if provided
      if (
        photoToUpload &&
        typeof photoToUpload === "string" &&
        photoToUpload.startsWith("data:")
      ) {
        try {
          await uploadProfilePhoto(
            createdUser.UserID || createdUser.id,
            photoToUpload
          );
        } catch (uErr) {
          console.warn("Profile upload failed:", uErr);
        }
      }

      const studentPayload = {
        UserID:
          createdUser.UserID ??
          createdUser.id ??
          createdUser.userID ??
          createdUser.userId,
        RollNumber:
          pendingStudentData.RollNumber ??
          pendingStudentData.IDNumber ??
          pendingStudentData.rollNumber ??
          pendingStudentData.idNumber ??
          undefined,
        EnrollmentDate: pendingStudentData.EnrollmentDate ?? undefined,
        CurrentGrade:
          pendingStudentData.CurrentGrade ??
          pendingStudentData.Class ??
          pendingStudentData.currentGrade ??
          pendingStudentData.class ??
          undefined,
        ParentName:
          pendingStudentData.ParentName ??
          pendingStudentData.GuardianName ??
          pendingStudentData.parentName ??
          pendingStudentData.guardianName ??
          undefined,
        ParentContact:
          pendingStudentData.ParentContact ??
          pendingStudentData.GuardianPhone ??
          pendingStudentData.parentContact ??
          pendingStudentData.guardianPhone ??
          undefined,
      };

      let createdStudent = null;
      try {
        createdStudent = await createStudent(
          Object.fromEntries(
            Object.entries(studentPayload).filter(
              ([, value]) => value !== undefined
            )
          )
        );
      } catch (studentErr) {
        console.error("Failed to create student record:", studentErr);
      }

      const studentId =
        createdStudent?.StudentID ??
        createdStudent?.studentId ??
        createdStudent?.UserID ??
        createdStudent?.id ??
        null;

      const numericCourseIds = ids
        .map((cid) => Number(cid))
        .filter((cid) => !Number.isNaN(cid));

      if (studentId && numericCourseIds.length) {
        try {
          await createEnrollmentsForStudent(studentId, numericCourseIds, {
            EnrollmentDate: studentPayload.EnrollmentDate || undefined,
            IsActive: true,
          });
        } catch (enrollErr) {
          console.error("Failed to enroll student:", enrollErr);
        }
      }

      await refreshStudents();
      setShowCoursePicker(false);
      setPendingStudentData(null);
      setCourseSelection(defaultCourseSelection);
      setCoursePickerError("");
    } catch (err) {
      console.error("Error creating student record:", err);
      setCoursePickerError(
        err?.message || "Unable to create student. Please try again."
      );
    } finally {
      setCoursePickerSaving(false);
    }
  };

  // Handles the multi-step edit flow for students (mirrors admin behavior)
  const handleEditSubmit = async (formData) => {
    setFormError("");
    try {
      if (editStep === 1) {
        const uid = editUser?.UserID || editUser?.id;
        const updatedUser = await updateUser(uid, {
          ...formData,
          UserTypeID: 3,
        });

        // If a new profile photo was supplied (data URL), upload it
        const photoToUpload =
          formData?.ProfilePicture || formData?.profilepicture || null;
        if (
          photoToUpload &&
          typeof photoToUpload === "string" &&
          photoToUpload.startsWith("data:")
        ) {
          try {
            const uploadedPath = await uploadProfilePhoto(uid, photoToUpload);
            if (uploadedPath) {
              updatedUser.ProfilePicture = uploadedPath;
              updatedUser.profilepicture = uploadedPath;
            }
          } catch (uErr) {
            console.warn("Profile upload failed:", uErr);
          }
        }

        let merged = { ...updatedUser };
        try {
          const [studentRec, courses] = await Promise.all([
            getStudentById(uid),
            getStudentCourses(uid),
          ]);
          const courseIds = (courses || [])
            .map((c) => c.id ?? c.CourseID ?? c.courseId)
            .filter((v) => v !== undefined && v !== null);

          merged = {
            ...merged,
            RollNumber:
              studentRec?.RollNumber ??
              studentRec?.rollNumber ??
              merged.RollNumber,
            CurrentGrade:
              studentRec?.CurrentGrade ??
              studentRec?.currentGrade ??
              merged.CurrentGrade,
            ParentName:
              studentRec?.ParentName ??
              studentRec?.parentName ??
              merged.ParentName,
            ParentContact:
              studentRec?.ParentContact ??
              studentRec?.parentContact ??
              merged.ParentContact,
            EnrollmentDate:
              studentRec?.EnrollmentDate ??
              studentRec?.enrollmentDate ??
              merged.EnrollmentDate,
            StudentCourseIDs: courseIds,
          };
        } catch (prefillErr) {
          console.warn("Failed to preload student details", prefillErr);
        }

        setStudents((prev) =>
          prev.map((s) => {
            const currentUserId = s.UserID || s.id;
            const updatedUserId = merged.UserID || merged.id;
            return currentUserId === updatedUserId ? merged : s;
          })
        );
        setEditUser(merged);
        setForceUserType(3);
        setEditStep(2);
        return;
      }

      // Step 2: update student-specific details and sync enrollments
      const uid = editUser?.UserID || editUser?.id;
      try {
        await updateStudent(uid, {
          StudentID: uid,
          RollNumber: formData.RollNumber,
          EnrollmentDate: formData.EnrollmentDate,
          CurrentGrade: formData.CurrentGrade,
          ParentName: formData.ParentName,
          ParentContact: formData.ParentContact,
        });

        const desired = (formData.StudentCourseIDs || [])
          .map((v) => Number(v))
          .filter((n) => !isNaN(n));

        try {
          const current = await getEnrollmentsByStudent(uid);
          const currentCourseIds = current
            .map((e) => Number(e.CourseID))
            .filter((n) => !isNaN(n));
          const toAdd = desired.filter(
            (cid) => !currentCourseIds.includes(cid)
          );
          const toRemove = current.filter(
            (e) => !desired.includes(Number(e.CourseID))
          );

          if (toAdd.length) {
            await createEnrollmentsForStudent(uid, toAdd, {
              EnrollmentDate: formData.EnrollmentDate,
              IsActive: true,
            });
          }

          for (const e of toRemove) {
            if (e.EnrollmentID != null) {
              await deleteEnrollment(e.EnrollmentID);
            }
          }
        } catch (enSyncErr) {
          console.error("Failed to sync student enrollments", enSyncErr);
          setFormError(
            enSyncErr?.message ||
              "Updated student, but failed to sync enrollments"
          );
        }
      } catch (roleErr) {
        console.error("Failed to update student data", roleErr);
        setFormError(
          roleErr?.message ||
            "User updated, but failed to update student details"
        );
      }

      await refreshStudents();
      setEditOpen(false);
      setEditUser(null);
      setForceUserType(null);
      setEditStep(1);
    } catch (error) {
      console.error("Error saving edit:", error);
      setFormError(error?.message || "Failed to save user");
    }
  };

  if (loading) {
    return <Loader className="py-12" />;
  }

  // if (!id) {
  //   return (
  //     <div className="space-y-6">
  //       <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
  //         Students
  //       </h1>
  //       <EmptyState
  //         title="Select a course"
  //         description="Please select a course to view enrolled students."
  //       />
  //     </div>
  //   )
  // }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white border-l-4 border-indigo-500/60 dark:border-indigo-400/60 pl-3">
        {course
          ? `Students in ${
              course.name ?? course.CourseName ?? course.courseName ?? ""
            }`
          : "My Students"}
      </h1>

      <div className="flex justify-end">
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          + Add Student
        </button>
      </div>

      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {"Create New User"}
                </h2>
                <button
                  onClick={closeCreateModal}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-4">
                <UserForm
                  onSubmit={handleCreateSubmit}
                  loading={false}
                  user={null}
                  userTypes={[
                    { id: 1, name: "Admin" },
                    { id: 2, name: "Teacher" },
                    { id: 3, name: "Student" },
                  ]}
                  forceUserType={3}
                  initialCourseSelection={defaultCourseSelection}
                  teacherId={teacherId}
                  showCoreFields={createStep === 1}
                  showRoleFields={createStep === 2}
                  submitLabel={createStep === 1 ? "Next" : "Create"}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-gradient-to-br from-white to-indigo-50/70 dark:from-gray-900/70 dark:to-indigo-950/20 backdrop-blur shadow-lg ring-1 ring-indigo-100 dark:ring-indigo-800 rounded-2xl p-4 sm:p-6">
        {(() => {
          const isActiveFlag = (u) =>
            Boolean(u?.IsActive ?? u?.isActive ?? true);
          const activeStudents = (students || []).filter(isActiveFlag);
          const inactiveStudents = (students || []).filter(
            (u) => !isActiveFlag(u)
          );

          return (
            <>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => setMembersTab("active")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      membersTab === "active"
                        ? "bg-indigo-600 text-white"
                        : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    title={`Active (${activeStudents.length})`}
                  >
                    Active{" "}
                    <span className="ml-2 text-xs">
                      ({activeStudents.length})
                    </span>
                  </button>

                  <button
                    onClick={() => setMembersTab("inactive")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      membersTab === "inactive"
                        ? "bg-indigo-600 text-white"
                        : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    title={`Inactive (${inactiveStudents.length})`}
                  >
                    Inactive{" "}
                    <span className="ml-2 text-xs">
                      ({inactiveStudents.length})
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {membersTab === "active" ? (
                  <UserList
                    users={activeStudents}
                    onEdit={openEdit}
                    onActivate={handleActivateUser}
                    onDeactivate={handleDeactivateUser}
                    getDetailsPath={(student) => {
                      const identifier =
                        student.UserID ||
                        student.userID ||
                        student.userId ||
                        student.id ||
                        student.StudentID ||
                        student.studentID ||
                        student.studentId;
                      return identifier
                        ? `/teacher/students/${identifier}`
                        : null;
                    }}
                  />
                ) : (
                  <UserList
                    users={inactiveStudents}
                    onEdit={openEdit}
                    onActivate={handleActivateUser}
                    onDeactivate={handleDeactivateUser}
                    getDetailsPath={(student) => {
                      const identifier =
                        student.UserID ||
                        student.userID ||
                        student.userId ||
                        student.id ||
                        student.StudentID ||
                        student.studentID ||
                        student.studentId;
                      return identifier
                        ? `/teacher/students/${identifier}`
                        : null;
                    }}
                  />
                )}
              </div>

              {toastMessage && (
                <Toast
                  message={toastMessage}
                  type={toastType}
                  onClose={() => setToastMessage(null)}
                />
              )}
            </>
          );
        })()}
      </div>

      <CoursePickerModal
        isOpen={showCoursePicker}
        onClose={handleCoursePickerClose}
        initialSelected={courseSelection}
        title="Select Course for Student"
        description="Choose a course to enroll the new student in."
        multiSelect={false}
        allowCreate={false}
        teacherId={teacherId}
        saving={coursePickerSaving}
        errorMessage={coursePickerError}
        onProceed={handleCoursePickerProceed}
      />

      {/* Edit Student Popup (admin-style multi-step modal) */}
      <AnimatePresence>
        {isEditOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editUser ? "Edit User" : "Create New User"}
                </h2>
                <button
                  onClick={() => {
                    setEditOpen(false);
                    setEditUser(null);
                    setForceUserType(null);
                    setEditStep(1);
                    setFormError("");
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 px-4 py-3">
                  {formError}
                </div>
              )}

              <div className="p-4">
                <UserForm
                  onSubmit={handleEditSubmit}
                  user={editUser}
                  loading={editLoading}
                  userTypes={[
                    { id: 1, name: "Admin" },
                    { id: 2, name: "Teacher" },
                    { id: 3, name: "Student" },
                  ]}
                  forceUserType={forceUserType}
                  teacherId={teacherId}
                  initialCourseSelection={
                    (editUser?.StudentCourseIDs || []).map(String) || []
                  }
                  showCoreFields={editStep === 1}
                  showRoleFields={editStep === 2}
                  submitLabel={editStep === 1 ? "Next" : "Update"}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherStudents;
