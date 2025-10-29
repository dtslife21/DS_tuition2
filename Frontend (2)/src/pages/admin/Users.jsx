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
import UserList from "../../components/users/UserList";
import UserForm from "../../components/users/UserForm";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import CoursePickerModal from "../../components/courses/CoursePickerModal";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editStep, setEditStep] = useState(1); // 1: core details, 2: role-specific
  const [formError, setFormError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [forceUserType, setForceUserType] = useState(null);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [initialCourseSelection, setInitialCourseSelection] = useState([]);
  const [pendingUserData, setPendingUserData] = useState(null); // holds student payload awaiting course pick

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

  const handleUserSubmit = async (userData) => {
    try {
      setFormError("");

      if (!selectedUser) {
        // Creation flow
        const typeId = String(userData.UserTypeID || userData.userTypeID || "");
        // If it's a student, ask to choose course(s) first via popup
        if (typeId === "3") {
          setPendingUserData({
            ...userData,
            IsActive: true,
            ProfilePicture: null,
          });
          setShowModal(false); // close form to show picker
          setInitialCourseSelection([]);
          setShowCoursePicker(true);
          return; // defer actual creation until after course picking
        }

        const newUser = {
          ...userData,
          IsActive: true,
          ProfilePicture: null,
        };

        const createdUser = await createUser(newUser);

        // If this is a teacher, post only the teacher-specific fields to the
        // Teachers API so the backend's TeachersController can persist them.
        if (typeId === "2") {
          try {
            const teacherPayload = {
              TeacherID:
                createdUser.UserID ??
                createdUser.id ??
                createdUser.userID ??
                createdUser.userId,
              EmployeeID: newUser.EmployeeID || undefined,
              Department: newUser.Department || undefined,
              Qualification: newUser.Qualification || undefined,
              JoiningDate: newUser.JoiningDate || undefined,
              Bio: newUser.Bio || undefined,
            };

            const createdTeacher = await createTeacher(teacherPayload);

            // merge teacher info into the created user for UI convenience
            const merged = {
              ...createdUser,
              TeacherID:
                createdTeacher.TeacherID ??
                createdTeacher.teacherId ??
                createdTeacher.Teacher?.TeacherID ??
                createdUser.TeacherID,
              Teacher: createdTeacher,
            };

            // If courses were selected in the form, assign them to this teacher
            try {
              const teacherId =
                merged.UserID ?? merged.id ?? merged.userID ?? merged.userId;
              const selectedCourseIds = (newUser.CourseIDs || []).map((v) =>
                Number(v)
              );
              if (teacherId && selectedCourseIds.length) {
                // Assign each selected course to this teacher
                for (const cid of selectedCourseIds) {
                  await updateCourse(cid, { TeacherID: teacherId });
                }
              }
            } catch (assignErr) {
              console.error("Failed to assign courses to teacher", assignErr);
              setFormError(
                assignErr?.message ||
                  "Teacher created, but failed to assign selected courses"
              );
            }

            setUsers([...users, merged]);
          } catch (err) {
            // If teacher creation fails, still show created user but surface error
            setUsers([...users, createdUser]);
            setFormError(err?.message || "Failed to create teacher record");
          }
        } else {
          setUsers([...users, createdUser]);
        }
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
    // For teachers, first open the course picker modal
    setForceUserType(typeId);
    setSelectedUser(null);
    setFormError("");
    if (typeId === 2) {
      // show course picker first
      setShowCoursePicker(true);
    } else {
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setFormError("");
    setForceUserType(null);
    setEditStep(1);
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

            <UserList
              users={filtered}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
            />

            <CoursePickerModal
              isOpen={showCoursePicker}
              onClose={() => setShowCoursePicker(false)}
              initialSelected={initialCourseSelection}
              title={
                pendingUserData
                  ? "Select Course for Student"
                  : "Select Courses for Teacher"
              }
              description={
                pendingUserData
                  ? "Choose a course to enroll the new student in."
                  : "Select one or more courses to assign to the new teacher."
              }
              multiSelect={!pendingUserData}
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
                  showCoreFields={Boolean(selectedUser) ? editStep === 1 : true}
                  showRoleFields={Boolean(selectedUser) ? editStep === 2 : true}
                  submitLabel={
                    selectedUser
                      ? editStep === 1
                        ? "Next"
                        : "Update"
                      : undefined
                  }
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
