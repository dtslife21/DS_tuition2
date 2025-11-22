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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                ID
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell"
              >
                Role
              </th>
              {/* Identifier column removed per request */}
              <th scope="col" className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => {
              const defaultId =
                user.UserID || user.userID || user.userId || user.id || null;
              const actionId =
                defaultId ||
                user.StudentID ||
                user.studentID ||
                user.studentId ||
                null;
              const rawId = defaultId ?? actionId ?? null;
              // determine prefix by role
              const rawType = String(
                user.UserTypeID ??
                  user.userTypeID ??
                  user.UserType ??
                  user.userType ??
                  ""
              ).trim();
              let rolePrefix = "";
              if (rawType === "1" || rawType.toLowerCase() === "admin") {
                rolePrefix = "A";
              } else if (
                rawType === "2" ||
                rawType.toLowerCase() === "teacher"
              ) {
                rolePrefix = "T";
              } else if (
                rawType === "3" ||
                rawType.toLowerCase() === "student"
              ) {
                rolePrefix = "S";
              }
              const displayedId = rawId ? `${rolePrefix}${rawId}` : "-";
              const detailPath = getDetailsPath
                ? getDetailsPath(user)
                : defaultId
                ? `/admin/users/${defaultId}`
                : null;

              const fullName = `${user.FirstName || user.firstName || ""} ${
                user.LastName || user.lastName || ""
              }`.trim();

              return (
                <tr
                  key={user.UserID || user.id || user.email}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-4 py-4 whitespace-nowrap align-top text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-mono text-sm">{displayedId}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-top">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Avatar name={fullName} size="sm" user={user} />
                      </div>
                      <div className="ml-3">
                        {detailPath ? (
                          <Link
                            to={detailPath}
                            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 truncate block"
                            title={fullName}
                          >
                            {fullName}
                          </Link>
                        ) : (
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {fullName}
                          </div>
                        )}
                        {/* Email shown in its own column; removed duplicate here */}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-top text-sm text-gray-700 dark:text-gray-300">
                    {user.Email || user.email}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-top text-sm text-gray-700 dark:text-gray-300 hidden md:table-cell">
                    {getUserTypeText(user.UserTypeID || user.userTypeID)}
                  </td>
                  {/* Identifier column removed per request */}
                  <td className="px-4 py-4 whitespace-nowrap align-top text-right text-sm font-medium">
                    <div className="inline-flex items-center gap-2">
                      {allowManage && (
                        <>
                          <button
                            onClick={() =>
                              onEdit && actionId && onEdit(actionId)
                            }
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                          >
                            Edit
                          </button>

                          {!Boolean(user.IsActive ?? user.isActive ?? true) &&
                            onActivate && (
                              <button
                                onClick={() =>
                                  onActivate && actionId && onActivate(actionId)
                                }
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-green-600 hover:text-green-800"
                              >
                                Active
                              </button>
                            )}

                          {Boolean(user.IsActive ?? user.isActive ?? true) &&
                            onDeactivate && (
                              <button
                                onClick={() =>
                                  onDeactivate &&
                                  actionId &&
                                  onDeactivate(actionId)
                                }
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-orange-600 hover:text-orange-800"
                              >
                                Remove
                              </button>
                            )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
