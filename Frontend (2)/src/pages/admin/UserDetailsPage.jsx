import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getUserById, updateUser } from "../../services/userService";
import {
  getTeacherCourses,
  getStudentCourses,
} from "../../services/courseService";
import UserForm from "../../components/users/UserForm";
import Card from "../../components/common/Card";
import Avatar from "../../components/common/Avatar";
import Loader from "../../components/common/Loader";
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

const Pill = ({ children, color = "indigo"}) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-${color}-100 text-${color}-800 dark:bg-${color}-900/30 dark:text-${color}-800`}
  >
    {children}
  </span>
);

const UserDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState("");

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
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      const isTeacherType =
        String(user.UserTypeID || user.userTypeID || "").trim() === "2" ||
        String((user.userType || "").toLowerCase()) === "teacher";
      const isStudentType =
        String(user.UserTypeID || user.userTypeID || "").trim() === "3" ||
        String((user.userType || "").toLowerCase()) === "student";

      // Derive ids for both roles
      const teacherId =
        user.TeacherID ?? user.teacherID ?? user.teacherId ?? null;
      const studentId =
        user.StudentID ?? user.studentID ?? user.studentId ?? null;

      // Choose fetching strategy
      try {
        setCoursesLoading(true);
        setCoursesError("");
        let list = [];
        if (isTeacherType) {
          const idForTeacher =
            teacherId ?? user.id ?? user.UserID ?? user.userID;
          list = await getTeacherCourses(idForTeacher);
        } else if (isStudentType) {
          const idForStudent =
            studentId ?? user.id ?? user.UserID ?? user.userID;
          list = await getStudentCourses(idForStudent);
        } else {
          // Not teacher or student, skip
          setCourses([]);
          return;
        }
        setCourses(Array.isArray(list) ? list : []);
      } catch (err) {
        setCoursesError(
          isTeacherType
            ? "Failed to load teacher courses"
            : "Failed to load student courses"
        );
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, [user]);

  const handleSave = async (userData) => {
    try {
      const updatedUser = await updateUser(id, userData);
      setUser(updatedUser);
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
            User Details
          </h1>
          <Link
            to="/admin/users"
            className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
          >
            Back to Users
          </Link>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-md">
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
          >
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Details
          </h1>
        </div>
        {!isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Edit
            </button>
            <Link
              to="/admin/users"
              className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
            >
              Manage Users
            </Link>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
          >
            Cancel
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <UserForm
            onSubmit={handleSave}
            user={user}
            userTypes={[
              { id: 1, name: "Admin" },
              { id: 2, name: "Teacher" },
              { id: 3, name: "Student" },
            ]}
          />
        </div>
      ) : (
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Avatar
              name={fullName || user.Username || user.username}
              size="lg"
              src={user.ProfilePicture || user.profilePicture || undefined}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
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

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoRow
              label="First Name"
              value={user.FirstName || user.firstName}
            />
            <InfoRow label="Last Name" value={user.LastName || user.lastName} />
            <InfoRow label="Username" value={user.Username || user.username} />
            <InfoRow label="Email" value={user.Email || user.email} />
            <InfoRow label="Phone" value={user.Phone || user.phone} />
            <InfoRow label="User Type" value={userTypeLabel} />
            <InfoRow
              label="User Type ID"
              value={user.UserTypeID || user.userTypeID}
            />
            <InfoRow label="User ID" value={user.UserID || user.id} />
            {(user.EmployeeID || user.employeeID) && (
              <InfoRow
                label="Employee ID"
                value={user.EmployeeID || user.employeeID}
              />
            )}
            {(user.RollNumber || user.rollNumber) && (
              <InfoRow
                label="Roll Number"
                value={user.RollNumber || user.rollNumber}
              />
            )}
          </div>
        </Card>
      )}

      {/* Courses section for Teacher or Student (visible to admin) */}
      {user &&
        (String(user.UserTypeID || user.userTypeID || "").trim() === "2" ||
          String((user.userType || "").toLowerCase()) === "teacher" ||
          String(user.UserTypeID || user.userTypeID || "").trim() === "3" ||
          String((user.userType || "").toLowerCase()) === "student") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {String(user.UserTypeID || user.userTypeID || "").trim() ===
                  "2" ||
                String((user.userType || "").toLowerCase()) === "teacher"
                  ? "Assigned Courses"
                  : "Enrolled Courses"}
              </h2>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map((course) => (
                    <div
                      key={course.id || course.CourseID || course.courseId}
                      className="bg-white dark:bg-gray-800 shadow rounded-lg p-4"
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
                          <Link
                            to={`/admin/courses/${
                              course.id || course.CourseID || course.courseId
                            }`}
                            className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            View
                          </Link>
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
          </div>
        )}
    </div>
  );
};

export default UserDetailsPage;
