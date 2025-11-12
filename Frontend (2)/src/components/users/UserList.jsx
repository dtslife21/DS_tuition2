// UserList.js
import { Link } from "react-router-dom";
import EmptyState from "../common/EmptyState";
import Avatar from "../common/Avatar";

const UserList = ({
  users,
  onAddStudent,
  onEdit,
  onActivate,
  onDeactivate,
  allowManage = true,
  getDetailsPath,
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
        {users.map((user) => {
          const defaultId =
            user.UserID || user.userID || user.userId || user.id || null;
          const actionId =
            defaultId ||
            user.StudentID ||
            user.studentID ||
            user.studentId ||
            null;
          const detailPath = getDetailsPath
            ? getDetailsPath(user)
            : defaultId
            ? `/admin/users/${defaultId}`
            : null;
          const primaryInfo = (
            <>
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
            </>
          );

          return (
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
                      {detailPath ? (
                        <Link to={detailPath} className="min-w-0 block group">
                          {primaryInfo}
                        </Link>
                      ) : (
                        <div className="min-w-0 block group">{primaryInfo}</div>
                      )}
                      <div className="hidden md:block">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            Role:{" "}
                            {getUserTypeText(
                              user.UserTypeID || user.userTypeID
                            )}
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
                          onClick={() => onEdit && actionId && onEdit(actionId)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                        >
                          Edit
                        </button>
                        {/* Show Activate for inactive users */}
                        {!Boolean(user.IsActive ?? user.isActive ?? true) && onActivate && (
                          <button
                            onClick={() => onActivate && actionId && onActivate(actionId)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-green-600 hover:text-green-800"
                          >
                            Active
                          </button>
                        )}
                        {/* Show Deactivate for active users */}
                        {Boolean(user.IsActive ?? user.isActive ?? true) && onDeactivate && (
                          <button
                            onClick={() => onDeactivate && actionId && onDeactivate(actionId)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-orange-600 hover:text-orange-800"
                          >
                            Remove
                          </button>
                        )}
                      </>
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
