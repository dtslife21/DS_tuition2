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
} from "../../services/userService";
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
        setUsers([...users, createdUser]);
      } else {
        const userId = selectedUser.UserID || selectedUser.id;
        const updatedUser = await updateUser(userId, userData);
        setUsers(
          users.map((user) => {
            const currentUserId = user.UserID || user.id;
            const updatedUserId = updatedUser.UserID || updatedUser.id;
            return currentUserId === updatedUserId ? updatedUser : user;
          })
        );
      }

      setShowModal(false);
      setSelectedUser(null);
      setForceUserType(null);
    } catch (error) {
      console.error("Error saving user:", error);
      setFormError(error.message || "Failed to save user");
    }
  };

  const handleEditUser = async (userID) => {
    try {
      setEditLoading(true);
      setFormError("");
      setSelectedUser(null);

      const user = await getUserById(userID);
      setSelectedUser(user);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching user details:", error);
      const fallbackUser = users.find((u) => (u.UserID || u.id) === userID);
      if (fallbackUser) {
        setSelectedUser(fallbackUser);
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
                  className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
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
                  className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  + Add Student
                </button>
              )}
            </div>

            <UserList users={filtered} onEdit={handleEditUser} />

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
