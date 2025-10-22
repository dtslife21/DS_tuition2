import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../common/Button";
import Modal from "../common/Modal";
import CourseForm from "../courses/CourseForm";
import { getAllCourses, createCourse } from "../../services/courseService";

const UserForm = ({ onSubmit, loading, user, userTypes, forceUserType }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      Username: user?.Username || user?.username || "",
      PasswordHash: "",
      Email: user?.Email || user?.email || "",
      FirstName: user?.FirstName || user?.firstName || "",
      LastName: user?.LastName || user?.lastName || "",
      UserTypeID: forceUserType
        ? String(forceUserType)
        : user?.UserTypeID || user?.userTypeID || "",
      RollNumber: user?.RollNumber || user?.rollNumber || "",
      CurrentGrade: user?.CurrentGrade || user?.currentGrade || "",
      EmployeeID: user?.EmployeeID || user?.employeeID || "",
      Department: user?.Department || user?.department || "",
      AssignedCourseIDs:
        (user?.Courses && Array.isArray(user.Courses)
          ? user.Courses.map((c) => c.id ?? c.CourseID ?? c.id)
          : user?.assignedCourseIds || user?.CourseIDs || []) || [],
    },
  });

  // If a forced user type is provided, set it as the watched value.
  const userTypeID = forceUserType
    ? String(forceUserType)
    : watch("UserTypeID");

  // Keep form state in sync when forcing user type
  useEffect(() => {
    if (forceUserType) {
      setValue("UserTypeID", String(forceUserType), { shouldValidate: true });
    }
  }, [forceUserType, setValue]);

  // Courses state for teacher assignment
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState(
    user?.CourseIDs && Array.isArray(user.CourseIDs)
      ? user.CourseIDs.map((c) => String(c))
      : (user?.AssignedCourseIDs || []).map((c) => String(c)) || []
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoadingCourses(true);
        const all = await getAllCourses();
        if (!mounted) return;
        setCourses(all || []);
      } catch (err) {
        console.error("Failed to load courses for user form", err);
        setCourses([]);
      } finally {
        if (mounted) setLoadingCourses(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // initialize selectedCourseIds from form default if present
    const defaultAssigned =
      (Array.isArray(watch("AssignedCourseIDs")) &&
        watch("AssignedCourseIDs").map((v) => String(v))) ||
      [];
    if (defaultAssigned.length && selectedCourseIds.length === 0) {
      setSelectedCourseIds(defaultAssigned);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormSubmit = (data) => {
    const apiData = {
      ...(user ? { UserID: user.UserID || user.id } : {}),
      Username: data.Username,
      ...(!user && { PasswordHash: data.PasswordHash }),
      Email: data.Email,
      FirstName: data.FirstName,
      LastName: data.LastName,
      UserTypeID: Number(data.UserTypeID),
      IsActive: true,
      ProfilePicture: null,
      ...(data.UserTypeID === "3" && {
        RollNumber: data.RollNumber,
        CurrentGrade: data.CurrentGrade,
      }),
      ...(data.UserTypeID === "2" && {
        EmployeeID: data.EmployeeID,
        Department: data.Department,
      }),
      ...(data.UserTypeID === "2" && {
        // include selected course ids when creating/updating a teacher
        CourseIDs: selectedCourseIds.map((id) =>
          isNaN(Number(id)) ? id : Number(id)
        ),
      }),
    };
    onSubmit(apiData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="Username"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Username
          </label>
          <input
            id="Username"
            name="Username"
            type="text"
            {...register("Username", { required: "Username is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {errors.Username && (
            <p className="mt-1 text-sm text-red-600">
              {errors.Username.message}
            </p>
          )}
        </div>

        {!user && (
          <div>
            <label
              htmlFor="PasswordHash"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="PasswordHash"
              name="PasswordHash"
              type="password"
              {...register("PasswordHash", {
                required: !user ? "Password is required" : false,
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors.PasswordHash && (
              <p className="mt-1 text-sm text-red-600">
                {errors.PasswordHash.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="FirstName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            First Name
          </label>
          <input
            id="FirstName"
            name="FirstName"
            type="text"
            {...register("FirstName", { required: "First name is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {errors.FirstName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.FirstName.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="LastName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Last Name
          </label>
          <input
            id="LastName"
            name="LastName"
            type="text"
            {...register("LastName", { required: "Last name is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {errors.LastName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.LastName.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="Email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email
        </label>
        <input
          id="Email"
          name="Email"
          type="email"
          {...register("Email", {
            required: "Email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address",
            },
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        {errors.Email && (
          <p className="mt-1 text-sm text-red-600">{errors.Email.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="UserTypeID"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          User Type
        </label>
        {forceUserType ? (
          // If a forced user type is provided, keep it hidden and show a read-only label
          <div className="mt-1">
            <input
              type="hidden"
              defaultValue={String(forceUserType)}
              {...register("UserTypeID", { required: "User type is required" })}
            />
            <div className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200">
              {forceUserType === 1
                ? "Admin"
                : forceUserType === 2
                ? "Teacher"
                : "Student"}
            </div>
          </div>
        ) : (
          <select
            id="UserTypeID"
            name="UserTypeID"
            {...register("UserTypeID", { required: "User type is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Select User Type</option>
            <option value="1">Admin</option>
            <option value="2">Teacher</option>
            <option value="3">Student</option>
          </select>
        )}
        {errors.UserTypeID && (
          <p className="mt-1 text-sm text-red-600">
            {errors.UserTypeID.message}
          </p>
        )}
      </div>

      {userTypeID === "3" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="RollNumber"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Roll Number
            </label>
            <input
              id="RollNumber"
              name="RollNumber"
              type="text"
              {...register("RollNumber", {
                required: "Roll number is required for students",
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors.RollNumber && (
              <p className="mt-1 text-sm text-red-600">
                {errors.RollNumber.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="CurrentGrade"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Current Grade
            </label>
            <input
              id="CurrentGrade"
              name="CurrentGrade"
              type="text"
              {...register("CurrentGrade")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      )}

      {userTypeID === "2" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            {/* <label
              htmlFor="EmployeeID"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Employee ID
            </label> */}
            {/* <input
              id="EmployeeID"
              name="EmployeeID"
              type="text"
              {...register('EmployeeID', {
                required: 'Employee ID is required for teachers',
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            /> */}
            {errors.EmployeeID && (
              <p className="mt-1 text-sm text-red-600">
                {errors.EmployeeID.message}
              </p>
            )}
          </div>

          <div>
            {/* <label
              htmlFor="Department"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Department
            </label>
            <input
              id="Department"
              name="Department"
              type="text"
              {...register('Department')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            /> */}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Assigned Courses
            </label>

            {loadingCourses ? (
              <div className="mt-2 text-sm text-gray-500">
                Loading courses...
              </div>
            ) : courses && courses.length > 0 ? (
              <div className="mt-2 grid gap-2">
                {courses.map((c) => {
                  const cid = String(
                    c.id ?? c.CourseID ?? c.CourseId ?? c.courseId ?? ""
                  );
                  const checked = selectedCourseIds.includes(cid);
                  return (
                    <label key={cid} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedCourseIds((prev) =>
                            prev.includes(cid)
                              ? prev.filter((x) => x !== cid)
                              : [...prev, cid]
                          );
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        {c.name || c.CourseName || c.title || c.courseName}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-500">
                No courses available.
              </div>
            )}

            <div className="mt-3 flex gap-2 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCourseModal(true)}
              >
                Add Course
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        title="Add New Course"
      >
        <CourseForm
          onSubmit={async (data) => {
            try {
              const newCourse = await createCourse(data);
              // normalize id to string
              const newId = String(
                newCourse.id ??
                  newCourse.CourseID ??
                  newCourse.CourseId ??
                  newCourse.id ??
                  ""
              );
              setCourses((prev) => [newCourse, ...(prev || [])]);
              setSelectedCourseIds((prev) =>
                Array.from(new Set([...(prev || []), newId]))
              );
              setShowCourseModal(false);
            } catch (err) {
              console.error("Failed to create course from user form", err);
            }
          }}
          onCancel={() => setShowCourseModal(false)}
        />
      </Modal>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="secondary" onClick={() => reset()}>
          Reset
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Saving..." : user ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  );
};

export default UserForm;
