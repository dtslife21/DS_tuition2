// import { useState, useEffect } from 'react'
// import { useParams, Link } from 'react-router-dom'
// import { getAllUsers, getUserDetails } from '../../services/userService'
// import UserList from '../../components/users/UserList'
// import UserForm from '../../components/users/UserForm'
// import Modal from '../../components/common/Modal'
// import Button from '../../components/common/Button'
// import Loader from '../../components/common/Loader'

// const AdminUsers = () => {
//   const [users, setUsers] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [showModal, setShowModal] = useState(false)
//   const [selectedUser, setSelectedUser] = useState(null)

//   useEffect(() => {
//     const fetchUsers = async () => {
//       try {
//         const data = await getAllUsers()
//         setUsers(data)
//       } catch (error) {
//         console.error('Error fetching users:', error)
//       } finally {
//         setLoading(false)
//       }
//     }

//     fetchUsers()
//   }, [])

//   const handleUserSubmit = (userData) => {
//     if (selectedUser) {
//       setUsers(
//         users.map((user) =>
//           user.id === selectedUser.id ? { ...user, ...userData } : user
//         )
//       )
//     } else {
//       setUsers([...users, { id: users.length + 1, ...userData }])
//     }
//     setShowModal(false)
//     setSelectedUser(null)
//   }

//   const handleEditUser = async (userId) => {
//     try {
//       const user = await getUserDetails(userId)
//       setSelectedUser(user)
//       setShowModal(true)
//     } catch (error) {
//       console.error('Error fetching user details:', error)
//     }
//   }

//   if (loading) {
//     return <Loader className="py-12" />
//   }

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
//           Users
//         </h1>
//         <Button variant="primary" onClick={() => setShowModal(true)}>
//           Add User
//         </Button>
//       </div>

//       <UserList users={users} onEdit={handleEditUser} />

//     </div>
//   )
// }

// export default AdminUsers

import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  getAllUsers,
  createUser,
  updateUser,
  getUserById,
  deleteUser,
} from "../../services/userService";
import {
  createStudent,
  updateStudent,
  getStudentById,
} from "../../services/studentService";
import { createEnrollmentsForStudent } from "../../services/enrollmentService";
import {
  createTeacher,
  updateTeacher,
  getTeacherById,
} from "../../services/teacherService";
import {
  getTeacherCourses,
  updateCourse,
  getStudentCourses,
} from "../../services/courseService";
import {
  getEnrollmentsByStudent,
  deleteEnrollment,
} from "../../services/enrollmentService";
import { setEnrollmentActiveStatus } from "../../services/enrollmentService";
import UserList from "../../components/users/UserList";
import UserForm from "../../components/users/UserForm";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import CoursePickerModal from "../../components/courses/CoursePickerModal";
import Toast from "../../components/common/Toast";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredStudentIds, setFilteredStudentIds] = useState(new Set());
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editStep, setEditStep] = useState(1); // 1: core details, 2: role-specific (edit flow)
  const [createStep, setCreateStep] = useState(1); // 1: core details, 2: role-specific (create flow)
  const [formError, setFormError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [forceUserType, setForceUserType] = useState(null);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [initialCourseSelection, setInitialCourseSelection] = useState([]);
  const [pendingUserData, setPendingUserData] = useState(null); // holds student payload awaiting course pick
  const [pendingCreateCore, setPendingCreateCore] = useState(null); // stores step-1 (core) data for create flow
  // Post-create teacher course assignment modal state
  const [showAssignTeacherCourses, setShowAssignTeacherCourses] =
    useState(false);
  const [newTeacherIdForAssignment, setNewTeacherIdForAssignment] =
    useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("success");
  // view for members list: 'active' or 'inactive'
  const [membersTab, setMembersTab] = useState("active");

  // derived course filter (if admin navigated here with a course param)
  const courseFilterParam = (() => {
    try {
      const qs = new URLSearchParams(location.search || "");
      return (qs.get("course") || location.state?.course || "") || "";
    } catch (e) {
      return "";
    }
  })();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getAllUsers();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Apply initial tab/course filter from URL (either search params or navigation state)
  useEffect(() => {
    const qs = new URLSearchParams(location.search || "");
    const tab = (qs.get("tab") || location.state?.tab || "").toString();
    const courseParam = (
      qs.get("course") ||
      location.state?.course ||
      ""
    ).toString();

    if (tab === "students") {
      setActiveTab("students");
    }

    if (courseParam) {
      // set students tab if not already
      setActiveTab("students");
      // compute student ids enrolled in the course and store in state
      (async () => {
        try {
          const matching = new Set();
          // For each user that is a student, check enrollments
          const allUsers = users && users.length ? users : await getAllUsers();
          const studentUsers = (allUsers || []).filter((u) =>
            ["3", 3].includes(
              Number(
                u.UserTypeID ?? u.userTypeID ?? u.UserType ?? u.userType ?? 0
              )
            )
          );

          for (const u of studentUsers) {
            const sid = u.UserID ?? u.id ?? u.userID ?? u.userId ?? null;
            if (!sid) continue;
            try {
              const enrollments = await getEnrollmentsByStudent(sid);
              if (
                Array.isArray(enrollments) &&
                enrollments.some(
                  (e) => String(e.CourseID) === String(courseParam)
                )
              ) {
                matching.add(String(sid));
              }
            } catch (e) {
              // ignore per-user errors
            }
          }

          setFilteredStudentIds(matching);
        } catch (err) {
          console.warn("Failed to pre-filter students by course", err);
        }
      })();
    }
  }, [location.search, location.state, users]);

  const handleUserSubmit = async (userData) => {
    try {
      setFormError("");

      if (!selectedUser) {
        // Creation flow (2-step wizard)
        const typeId = String(userData.UserTypeID || userData.userTypeID || "");

        // If admin, there's no role-specific step — create immediately from step 1
        if (createStep === 1 && typeId === "1") {
          const createdAdmin = await createUser({
            ...userData,
            IsActive: true,
            ProfilePicture: null,
          });
          setUsers([...users, createdAdmin]);
          setShowModal(false);
          setForceUserType(null);
          setCreateStep(1);
          setPendingCreateCore(null);
          return;
        }

        if (createStep === 1) {
          // Store core details and move to step 2
          setPendingCreateCore({ ...userData });
          // Lock user type for step 2
          setForceUserType(Number(typeId) || null);
          setCreateStep(2);
          return; // don't call API yet
        }

        // Step 2: role-specific submit
        const mergedCreate = {
          ...(pendingCreateCore || {}),
          ...userData,
          UserTypeID: Number(
            typeId ||
              (pendingCreateCore?.UserTypeID ?? pendingCreateCore?.userTypeID)
          ),
          IsActive: true,
          ProfilePicture: null,
        };

        if (typeId === "3") {
          // Student: after step 2, open course picker to finish
          setPendingUserData(mergedCreate);
          setShowModal(false);
          setInitialCourseSelection(
            (mergedCreate.StudentCourseIDs || []).map((id) => String(id))
          );
          setShowCoursePicker(true);
          // reset wizard state
          setCreateStep(1);
          setPendingCreateCore(null);
          return;
        }

        // If creating a teacher, synthesize the next user id from existing users
        if (typeId === "2") {
          try {
            const existing = await getAllUsers();
            const nums = (existing || []).map((u) => {
              const id = u?.UserID ?? u?.id ?? u?.userID ?? u?.userId ?? 0;
              const n = Number(id);
              return Number.isNaN(n) ? 0 : n;
            });
            const max = nums.length ? Math.max(...nums) : 0;
            const nextId = max + 1;
            // prefer not to overwrite if caller already supplied an id
            mergedCreate.UserID = mergedCreate.UserID ?? nextId;
            mergedCreate.userID = mergedCreate.userID ?? nextId;
            mergedCreate.id = mergedCreate.id ?? nextId;
          } catch (err) {
            // ignore and proceed without injected id
            console.warn("Failed to auto-generate next user id:", err);
          }
        }

        // Create base user
        const createdUser = await createUser(mergedCreate);

        if (typeId === "2") {
          // Create teacher record and assign courses if provided
          try {
            const teacherPayload = {
              TeacherID:
                createdUser.UserID ??
                createdUser.id ??
                createdUser.userID ??
                createdUser.userId,
              EmployeeID: mergedCreate.EmployeeID || undefined,
              Department: mergedCreate.Department || undefined,
              Qualification: mergedCreate.Qualification || undefined,
              JoiningDate: mergedCreate.JoiningDate || undefined,
              Bio: mergedCreate.Bio || undefined,
            };

            const createdTeacher = await createTeacher(teacherPayload);

            const merged = {
              ...createdUser,
              TeacherID:
                createdTeacher.TeacherID ??
                createdTeacher.teacherId ??
                createdTeacher.Teacher?.TeacherID ??
                createdUser.TeacherID,
              Teacher: createdTeacher,
            };
            setUsers([...users, merged]);
            // Open post-create course assignment modal instead of pre-select step
            const teacherId =
              merged.UserID ?? merged.id ?? merged.userID ?? merged.userId;
            if (teacherId) {
              setNewTeacherIdForAssignment(String(teacherId));
              setShowAssignTeacherCourses(true);
            }
          } catch (err) {
            setUsers([...users, createdUser]);
            setFormError(err?.message || "Failed to create teacher record");
          }
        } else {
          setUsers([...users, createdUser]);
        }

        // Reset wizard state
        setShowModal(false);
        setForceUserType(null);
        setCreateStep(1);
        setPendingCreateCore(null);
      } else {
        const userId = selectedUser.UserID || selectedUser.id;

        if (editStep === 1) {
          // Step 1: update core details only
          const updatedUser = await updateUser(userId, userData);

          // Determine next type and handle admin as a one-step update
          const nextTypeId = String(
            updatedUser.UserTypeID || updatedUser.userTypeID || ""
          );

          // If the user is an Admin, complete the update in one step.
          if (nextTypeId === "1") {
            setUsers(
              users.map((user) => {
                const currentUserId = user.UserID || user.id;
                const updatedUserId = updatedUser.UserID || updatedUser.id;
                return currentUserId === updatedUserId ? updatedUser : user;
              })
            );
            // close modal and reset state
            setShowModal(false);
            setSelectedUser(null);
            setForceUserType(null);
            setEditStep(1);
            return;
          }

          // Preload role-specific details for step 2 and merge into user
          let merged = { ...updatedUser };
          try {
            if (nextTypeId === "3") {
              // Student: load student record and enrolled courses
              const [studentRec, courses] = await Promise.all([
                getStudentById(userId),
                getStudentCourses(userId),
              ]);
              const studentFields = studentRec || {};
              const courseIds = (courses || [])
                .map((c) => c.id ?? c.CourseID ?? c.courseId)
                .filter((v) => v !== undefined && v !== null);
              merged = {
                ...merged,
                RollNumber:
                  studentFields.RollNumber ??
                  studentFields.rollNumber ??
                  merged.RollNumber,
                CurrentGrade:
                  studentFields.CurrentGrade ??
                  studentFields.currentGrade ??
                  merged.CurrentGrade,
                ParentName:
                  studentFields.ParentName ??
                  studentFields.parentName ??
                  merged.ParentName,
                ParentContact:
                  studentFields.ParentContact ??
                  studentFields.parentContact ??
                  merged.ParentContact,
                EnrollmentDate:
                  studentFields.EnrollmentDate ??
                  studentFields.enrollmentDate ??
                  merged.EnrollmentDate,
                StudentCourseIDs: courseIds,
              };
            } else if (nextTypeId === "2") {
              // Teacher: load teacher record and assigned courses
              const [teacherRec, courses] = await Promise.all([
                getTeacherById(userId),
                getTeacherCourses(userId),
              ]);
              const courseIds = (courses || [])
                .map((c) => c.id ?? c.CourseID ?? c.courseId)
                .filter((v) => v !== undefined && v !== null);
              merged = {
                ...merged,
                EmployeeID:
                  teacherRec?.EmployeeID ??
                  teacherRec?.employeeID ??
                  merged.EmployeeID,
                Department:
                  teacherRec?.Department ??
                  teacherRec?.department ??
                  merged.Department,
                Qualification:
                  teacherRec?.Qualification ??
                  teacherRec?.qualification ??
                  merged.Qualification,
                JoiningDate:
                  teacherRec?.JoiningDate ??
                  teacherRec?.joiningDate ??
                  merged.JoiningDate,
                Bio: teacherRec?.Bio ?? teacherRec?.bio ?? merged.Bio,
                CourseIDs: courseIds,
              };
            }
          } catch (prefillErr) {
            console.warn("Failed to preload role-specific details", prefillErr);
          }

          // Update list and move to step 2
          setUsers(
            users.map((user) => {
              const currentUserId = user.UserID || user.id;
              const updatedUserId = merged.UserID || merged.id;
              return currentUserId === updatedUserId ? merged : user;
            })
          );
          setSelectedUser(merged);
          setForceUserType(Number(nextTypeId || 0) || null);
          setEditStep(2);
          // stay in modal for step 2
          return;
        }

        // Step 2: update role-specific data only
        const typeId = String(
          selectedUser.UserTypeID || selectedUser.userTypeID || ""
        );

        try {
          if (typeId === "3") {
            await updateStudent(userId, {
              RollNumber: userData.RollNumber ?? userData.IDNumber,
              EnrollmentDate: userData.EnrollmentDate,
              CurrentGrade: userData.CurrentGrade ?? userData.Class,
              ParentName: userData.ParentName ?? userData.GuardianName,
              ParentContact: userData.ParentContact ?? userData.GuardianPhone,
            });
            const desired = (userData.StudentCourseIDs || [])
              .map((v) => Number(v))
              .filter((n) => !isNaN(n));
            try {
              const current = await getEnrollmentsByStudent(userId);
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
                await createEnrollmentsForStudent(userId, toAdd, {
                  EnrollmentDate: userData.EnrollmentDate,
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
          } else if (typeId === "2") {
            await updateTeacher(userId, {
              TeacherID: userId,
              EmployeeID: userData.EmployeeID,
              Department: userData.Department,
              Qualification: userData.Qualification,
              JoiningDate: userData.JoiningDate,
              Bio: userData.Bio,
            });
            const desired = (userData.CourseIDs || [])
              .map((v) => Number(v))
              .filter((n) => !isNaN(n));
            try {
              const existing = await getTeacherCourses(userId);
              const currentIds = (existing || [])
                .map((c) => Number(c.id ?? c.CourseID ?? c.courseId))
                .filter((n) => !isNaN(n));
              const toAssign = desired.filter(
                (cid) => !currentIds.includes(cid)
              );
              const toUnassign = currentIds.filter(
                (cid) => !desired.includes(cid)
              );
              for (const cid of toAssign) {
                await updateCourse(cid, { TeacherID: userId });
              }
              for (const cid of toUnassign) {
                await updateCourse(cid, { TeacherID: null });
              }
            } catch (tcErr) {
              console.error("Failed to sync teacher courses", tcErr);
              setFormError(
                tcErr?.message ||
                  "Updated teacher, but failed to sync assigned courses"
              );
            }
          }
        } catch (roleErr) {
          console.error("Failed to update role-specific data", roleErr);
          setFormError(
            roleErr?.message ||
              "User updated, but failed to update role-specific details"
          );
        }

        setShowModal(false);
        setSelectedUser(null);
        setForceUserType(null);
        setEditStep(1);
      }

      setShowModal(false);
      setSelectedUser(null);
      setForceUserType(null);
    } catch (error) {
      console.error("Error saving user:", error);
      setFormError(error.message || "Failed to save user");
    }
  };

  const handleDeleteUser = async (userID) => {
    try {
      setFormError("");
      // Optional: confirm before delete
      // eslint-disable-next-line no-restricted-globals
      const ok = window.confirm("Are you sure you want to delete this user?");
      if (!ok) return;
      await deleteUser(userID);
      setUsers((prev) => prev.filter((u) => (u.UserID || u.id) !== userID));
    } catch (err) {
      console.error("Failed to delete user", err);
      setFormError(err?.message || "Failed to delete user");
    }
  };

  const handleActivateUser = async (userID) => {
    try {
      setFormError("");
      // call API to set IsActive = true
      const updated = await updateUser(userID, { IsActive: true });
      setUsers((prev) =>
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
      // call API to set IsActive = false
      const updated = await updateUser(userID, { IsActive: false });
      setUsers((prev) =>
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

  // When admin is viewing students filtered by a course, allow removing (deactivating)
  // the enrollment rather than the user record itself.
  const handleRemoveEnrollmentFromCourse = async (userID) => {
    try {
      setFormError("");
      const courseId = courseFilterParam;
      if (!courseId) {
        setToastMessage("No course selected for removal.");
        setToastType("error");
        return;
      }

      // Find enrollment for this student in the course
      const enrollments = await getEnrollmentsByStudent(userID);
      const enrollment = (enrollments || []).find(
        (e) => String(e.CourseID) === String(courseId)
      );

      if (!enrollment) {
        setToastMessage("Enrollment record not found for this student.");
        setToastType("error");
        return;
      }

      const ok = window.confirm(
        "Remove this student from the course? They will be marked inactive."
      );
      if (!ok) return;

      await setEnrollmentActiveStatus(enrollment.EnrollmentID ?? enrollment.id ?? enrollment.enrollmentID, false, {
        StudentID: userID,
        CourseID: courseId,
      });

      // Remove from the filtered set so it disappears from the course-specific view
      setFilteredStudentIds((prev) => {
        const next = new Set(prev);
        next.delete(String(userID));
        return next;
      });

      setToastMessage("Enrollment removed from course.");
      setToastType("success");
    } catch (err) {
      console.error("Failed to remove enrollment", err);
      setToastMessage(err?.message || "Failed to remove enrollment.");
      setToastType("error");
    }
  };

  const handleReactivateEnrollmentFromCourse = async (userID) => {
    try {
      setFormError("");
      const courseId = courseFilterParam;
      if (!courseId) {
        setToastMessage("No course selected for activation.");
        setToastType("error");
        return;
      }

      const enrollments = await getEnrollmentsByStudent(userID);
      const enrollment = (enrollments || []).find(
        (e) => String(e.CourseID) === String(courseId)
      );

      if (!enrollment) {
        setToastMessage("Enrollment record not found for this student.");
        setToastType("error");
        return;
      }

      await setEnrollmentActiveStatus(enrollment.EnrollmentID ?? enrollment.id ?? enrollment.enrollmentID, true, {
        StudentID: userID,
        CourseID: courseId,
      });

      // Add back to filtered set so it shows in the course-specific view
      setFilteredStudentIds((prev) => {
        const next = new Set(prev);
        next.add(String(userID));
        return next;
      });

      setToastMessage("Enrollment reactivated for course.");
      setToastType("success");
    } catch (err) {
      console.error("Failed to reactivate enrollment", err);
      setToastMessage(err?.message || "Failed to reactivate enrollment.");
      setToastType("error");
    }
  };

  const handleEditUser = async (userID) => {
    try {
      setEditLoading(true);
      setFormError("");
      setSelectedUser(null);

      const user = await getUserById(userID);
      setSelectedUser(user);
      setEditStep(1);
      setForceUserType(null);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching user details:", error);
      const fallbackUser = users.find((u) => (u.UserID || u.id) === userID);
      if (fallbackUser) {
        setSelectedUser(fallbackUser);
        setEditStep(1);
        setForceUserType(null);
        setShowModal(true);
      } else {
        setFormError("Failed to fetch user details. Please try again.");
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setShowModal(true);
    setFormError("");
  };

  const openCreateFor = (typeId) => {
    // Initialize 2-step create flow
    setForceUserType(typeId);
    setSelectedUser(null);
    setFormError("");
    setInitialCourseSelection([]);
    setPendingCreateCore(null);
    setCreateStep(1);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setFormError("");
    setForceUserType(null);
    setEditStep(1);
    setCreateStep(1);
    setPendingCreateCore(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          User Management
        </h1>
      </div>

      {editLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 z-40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
            <span className="text-gray-700 dark:text-gray-300">
              Loading user details...
            </span>
          </div>
        </div>
      )}

      {/* Tabs for filtering users by role */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "All" },
            { key: "admins", label: "Admins" },
            { key: "teachers", label: "Teachers" },
            { key: "students", label: "Students" },
          ].map((tab) => {
            const count = getCountForTab(users, tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title={`${tab.label} (${count})`}
              >
                {tab.label} <span className="ml-2 text-xs">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter users by active tab and show role-specific add button */}
      {(() => {
        const filtered = filterUsersByTab(users, activeTab);
        // If admin was navigated here with a course filter, further narrow student list
        const displayUsers =
          activeTab === "students" &&
          filteredStudentIds &&
          filteredStudentIds.size
            ? filtered.filter((u) => {
                const sid = u.UserID ?? u.id ?? u.userID ?? u.userId ?? null;
                return sid && filteredStudentIds.has(String(sid));
              })
            : filtered;

        return (
          <>
            <div className="flex justify-end mb-3">
              {activeTab === "admins" && (
                <button
                  onClick={() => openCreateFor(1)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  + Add Admin
                </button>
              )}

              {activeTab === "teachers" && (
                <button
                  onClick={() => openCreateFor(2)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  + Add Teacher
                </button>
              )}

              {activeTab === "students" && (
                <button
                  onClick={() => openCreateFor(3)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  + Add Student
                </button>
              )}
            </div>

            {/* Members tab (Active / Inactive) */}
            {(() => {
              const isActiveFlag = (u) =>
                Boolean(u?.IsActive ?? u?.isActive ?? true);

              const activeUsers = (displayUsers || []).filter(isActiveFlag);
              const inactiveUsers = (displayUsers || []).filter(
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
                        title={`Active (${activeUsers.length})`}
                      >
                        Active{" "}
                        <span className="ml-2 text-xs">
                          ({activeUsers.length})
                        </span>
                      </button>

                      <button
                        onClick={() => setMembersTab("inactive")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          membersTab === "inactive"
                            ? "bg-indigo-600 text-white"
                            : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                        title={`Inactive (${inactiveUsers.length})`}
                      >
                        Inactive{" "}
                        <span className="ml-2 text-xs">
                          ({inactiveUsers.length})
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    {membersTab === "active" ? (
                      <UserList
                        users={activeUsers}
                        onEdit={handleEditUser}
                        onActivate={handleActivateUser}
                        onDeactivate={handleDeactivateUser}
                      />
                    ) : (
                      <UserList
                        users={inactiveUsers}
                        onEdit={handleEditUser}
                        onActivate={handleActivateUser}
                        onDeactivate={handleDeactivateUser}
                      />
                    )}
                  </div>
                </>
              );
            })()}

            <CoursePickerModal
              isOpen={showCoursePicker}
              onClose={() => setShowCoursePicker(false)}
              initialSelected={initialCourseSelection}
              title={
                pendingUserData
                  ? "Select Courses for Student"
                  : "Select Courses for Teacher"
              }
              description={
                pendingUserData
                  ? "Choose one or more courses to enroll the new student in."
                  : "Select one or more courses to assign to the new teacher."
              }
              multiSelect={true}
              // when enrolling a student, disallow creating new courses from the picker
              allowCreate={!pendingUserData}
              // when enrolling a pending student, hide courses already passed in (if any)
              excludedIds={pendingUserData?.CourseIDs || []}
              onProceed={async (selectedIds) => {
                // Two modes:
                // 1) Teacher pre-pick: no pending user yet -> open form with preselected
                // 2) Student post-form: pending user -> create user with chosen CourseIDs
                const ids = (selectedIds || []).map((id) =>
                  isNaN(Number(id)) ? id : Number(id)
                );

                if (!pendingUserData) {
                  // Teacher flow: pass selection into form and open it
                  setInitialCourseSelection(ids.map(String));
                  setShowCoursePicker(false);
                  setShowModal(true);
                  return;
                }

                try {
                  const newUser = {
                    ...pendingUserData,
                    CourseIDs: ids,
                    IsActive: true,
                    ProfilePicture: null,
                  };
                  const createdUser = await createUser(newUser);
                  // Persist student record in Students table as well
                  try {
                    const studentPayload = {
                      UserID:
                        createdUser.UserID ??
                        createdUser.id ??
                        createdUser.userID ??
                        createdUser.userId,
                      RollNumber:
                        pendingUserData.RollNumber ??
                        pendingUserData.IDNumber ??
                        undefined,
                      EnrollmentDate:
                        pendingUserData.EnrollmentDate ?? undefined,
                      CurrentGrade:
                        pendingUserData.CurrentGrade ??
                        pendingUserData.Class ??
                        undefined,
                      ParentName:
                        pendingUserData.ParentName ??
                        pendingUserData.GuardianName ??
                        undefined,
                      ParentContact:
                        pendingUserData.ParentContact ??
                        pendingUserData.GuardianPhone ??
                        undefined,
                    };

                    // Only include defined fields in payload
                    const createdStudent = await createStudent(
                      Object.fromEntries(
                        Object.entries(studentPayload).filter(
                          ([, v]) => v !== undefined
                        )
                      )
                    );

                    // If user selected course(s), create enrollments for the student
                    const studentId =
                      createdStudent?.StudentID ??
                      createdStudent?.studentId ??
                      createdStudent?.UserID ??
                      createdStudent?.id ??
                      null;

                    if (studentId && ids && ids.length) {
                      try {
                        await createEnrollmentsForStudent(studentId, ids, {
                          EnrollmentDate:
                            studentPayload.EnrollmentDate || undefined,
                          IsActive: true,
                        });
                      } catch (enrollErr) {
                        console.error(
                          "Failed to create enrollments:",
                          enrollErr
                        );
                        // surface a friendly message but don't block the user creation
                        setFormError(
                          enrollErr?.message ||
                            "Student created but failed to enroll to selected course(s)"
                        );
                      }
                    }
                  } catch (studentErr) {
                    console.error(
                      "Failed to create student record:",
                      studentErr
                    );
                    setFormError(
                      studentErr?.message ||
                        "Student created but failed to create student record"
                    );
                  }

                  setUsers([...users, createdUser]);
                } catch (err) {
                  console.error("Error creating student with course IDs", err);
                  setFormError(
                    err?.message ||
                      "Failed to create student with selected course"
                  );
                } finally {
                  setPendingUserData(null);
                  setShowCoursePicker(false);
                  setShowModal(false);
                  setForceUserType(null);
                }
              }}
            />
            {/* Post-create teacher course assignment modal */}
            <CoursePickerModal
              isOpen={showAssignTeacherCourses}
              onClose={() => {
                setShowAssignTeacherCourses(false);
                setNewTeacherIdForAssignment(null);
              }}
              // show all existing courses for assignment (new teachers won't
              // have any teacher-scoped courses yet)
              teacherId={newTeacherIdForAssignment}
              scopeToTeacher={false}
              initialSelected={[]}
              title="Assign Courses to New Teacher"
              description="Select one or more courses to assign to the newly created teacher."
              multiSelect={true}
              allowCreate={true}
              // Only allow creating a new course in this post-create flow
              // (admins cannot pick from existing courses per requested behavior)
              onlyCreate={true}
              onProceed={async (selectedIds) => {
                const ids = (selectedIds || []).map((id) =>
                  isNaN(Number(id)) ? id : Number(id)
                );
                const teacherId = newTeacherIdForAssignment;
                if (teacherId && ids.length) {
                  try {
                    for (const cid of ids) {
                      await updateCourse(cid, { TeacherID: teacherId });
                    }
                    // Refresh users list to reflect assignments
                    try {
                      const all = await getAllUsers();
                      setUsers(all);
                    } catch (_) {
                      // non-fatal
                    }
                    setToastMessage("Assigned courses to the new teacher.");
                    setToastType("success");
                  } catch (assignErr) {
                    console.error(
                      "Failed to assign selected courses to teacher",
                      assignErr
                    );
                    setFormError(
                      assignErr?.message ||
                        "Teacher created, but failed to assign selected courses"
                    );
                    setToastMessage("Failed to assign selected courses.");
                    setToastType("error");
                  }
                }
                setShowAssignTeacherCourses(false);
                setNewTeacherIdForAssignment(null);
              }}
            />
          </>
        );
      })()}

      <AnimatePresence>
        {showModal && (
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
                  {selectedUser ? "Edit User" : "Create New User"}
                </h2>
                <button
                  onClick={closeModal}
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
                  onSubmit={handleUserSubmit}
                  user={selectedUser}
                  loading={editLoading}
                  userTypes={[
                    { id: 1, name: "Admin" },
                    { id: 2, name: "Teacher" },
                    { id: 3, name: "Student" },
                  ]}
                  forceUserType={forceUserType}
                  initialCourseSelection={initialCourseSelection}
                  showCoreFields={
                    Boolean(selectedUser) ? editStep === 1 : createStep === 1
                  }
                  showRoleFields={
                    Boolean(selectedUser) ? editStep === 2 : createStep === 2
                  }
                  submitLabel={
                    selectedUser
                      ? editStep === 1
                        ? "Next"
                        : "Update"
                      : createStep === 1
                      ? "Next"
                      : "Create"
                  }
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {toastMessage ? (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      ) : null}
    </div>
  );
};

// Toast rendering (placed here so it can access users page state via closure)
const ToastWrapper = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <Toast message={message} type={type} duration={3000} onClose={onClose} />
  );
};

// Helper: returns filtered users array based on selected tab
const filterUsersByTab = (users, tabKey) => {
  if (!users || users.length === 0) return [];
  switch (tabKey) {
    case "admins":
      return users.filter(
        (u) =>
          String(u.UserTypeID || u.userTypeID || u.UserType || u.userType) ===
            "1" || String(u.userType)?.toLowerCase?.() === "admin"
      );
    case "teachers":
      return users.filter(
        (u) =>
          String(u.UserTypeID || u.userTypeID || u.UserType || u.userType) ===
            "2" || String(u.userType)?.toLowerCase?.() === "teacher"
      );
    case "students":
      return users.filter(
        (u) =>
          String(u.UserTypeID || u.userTypeID || u.UserType || u.userType) ===
            "3" || String(u.userType)?.toLowerCase?.() === "student"
      );
    case "all":
    default:
      return users;
  }
};

// Helper: count users for a tab
const getCountForTab = (users, tabKey) =>
  filterUsersByTab(users, tabKey).length;

export default AdminUsers;
