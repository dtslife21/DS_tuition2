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



import { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUser, getUserById } from '../../services/userService';  
import UserList from '../../components/users/UserList';
import UserForm from '../../components/users/UserForm';  
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formError, setFormError] = useState('');
  const [editLoading, setEditLoading] = useState(false);  

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getAllUsers();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleUserSubmit = async (userData) => {
    try {
      setFormError('');
      
      if (!selectedUser) {
        const newUser = {
          ...userData,
          IsActive: true,
          ProfilePicture: null
        };
        
        const createdUser = await createUser(newUser);
        setUsers([...users, createdUser]);
      } else {
        const userId = selectedUser.UserID || selectedUser.id;
        const updatedUser = await updateUser(userId, userData);
        setUsers(users.map(user => {
          const currentUserId = user.UserID || user.id;
          const updatedUserId = updatedUser.UserID || updatedUser.id;
          return currentUserId === updatedUserId ? updatedUser : user;
        }));
      }
      
      setShowModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
      setFormError(error.message || 'Failed to save user');
    }
  };

const handleEditUser = async (userID) => {
  try {
    setEditLoading(true);
    setFormError('');
    setSelectedUser(null);
     
    const user = await getUserById(userID);
    setSelectedUser(user);
    setShowModal(true);
  } catch (error) {
    console.error('Error fetching user details:', error);
    const fallbackUser = users.find(u => (u.UserID || u.id) === userID);
    if (fallbackUser) {
      setSelectedUser(fallbackUser);
      setShowModal(true);
    } else {
      setFormError('Failed to fetch user details. Please try again.');
    }
  } finally {
    setEditLoading(false);
  }
};

  const handleAddUser = () => {
    setSelectedUser(null);
    setShowModal(true);
    setFormError('');
  };
  
  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setFormError('');
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
        <button
          onClick={handleAddUser}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <span>+</span> Add User
        </button>
      </div>

      {editLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 z-40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Loading user details...</span>
          </div>
        </div>
      )}

      <UserList users={users} onEdit={handleEditUser} />

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
                  {selectedUser ? 'Edit User' : 'Create New User'}
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
                    { id: 1, name: 'Admin' },
                    { id: 2, name: 'Teacher' },
                    { id: 3, name: 'Student' }
                  ]}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;