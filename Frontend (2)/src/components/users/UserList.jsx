// UserList.js
import { Link } from "react-router-dom";
import EmptyState from "../common/EmptyState";
import Avatar from "../common/Avatar";

import UserFormDialog from "../common/UserFormDialog";

const UserList = ({
  users,
  onAddStudent,
  onEdit,
  onDelete,
  allowManage = true,
}) => {
  if (users.length === 0) {
    return (
      <EmptyState
        title="No users found"
        description="There are currently no users in the system."
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {users.map((user) => (
          <li
            key={user.UserID || user.id}
            className="hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Avatar
                      name={`${user.FirstName || user.firstName || ""} ${
                        user.LastName || user.lastName || ""
                      }`}
                      size="sm"
                    />
                  </div>
                  <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                    {/* Clickable area navigates to user details */}
                    <Link
                      to={`/admin/users/${user.UserID || user.id}`}
                      className="min-w-0 block group"
                    >
                      <p
                        className="text-sm font-medium text-indigo-600 group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300 truncate max-w-full"
                        title={`${user.FirstName || user.firstName || ""} ${
                          user.LastName || user.lastName || ""
                        }`.trim()}
                      >
                        {user.FirstName || user.firstName}{" "}
                        {user.LastName || user.lastName}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <span
                          className="truncate block max-w-full"
                          title={user.Email || user.email}
                        >
                          {user.Email || user.email}
                        </span>
                      </p>
                    </Link>
                    <div className="hidden md:block">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          Role:{" "}
                          {getUserTypeText(user.UserTypeID || user.userTypeID)}
                        </p>
                        {(user.RollNumber || user.rollNumber) && (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Roll No: {user.RollNumber || user.rollNumber}
                          </p>
                        )}
                        {(user.EmployeeID || user.employeeID) && (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Employee ID: {user.EmployeeID || user.employeeID}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                  {allowManage && (
                    <>
                      <button
                        onClick={() => onEdit && onEdit(user.UserID || user.id)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          onDelete && onDelete(user.UserID || user.id)
                        }
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const getUserTypeText = (userTypeID) => {
  switch (String(userTypeID)) {
    case "1":
      return "Admin";
    case "2":
      return "Teacher";
    case "3":
      return "Student";
    default:
      return "Unknown";
  }
};

export default UserList;
