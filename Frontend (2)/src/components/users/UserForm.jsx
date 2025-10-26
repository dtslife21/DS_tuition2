import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../common/Button";
import Modal from "../common/Modal";
import CourseForm from "../courses/CourseForm";
import { getAllCourses, createCourse } from "../../services/courseService";
import { getAllStudents } from "../../services/studentService";

const UserForm = ({
  onSubmit,
  loading,
  user,
  userTypes,
  forceUserType,
  initialCourseSelection = [],
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      // generic user defaults
      Username: user?.Username || user?.username || "",
      PasswordHash: "",
      Email: user?.Email || user?.email || "",
      FirstName: user?.FirstName || user?.firstName || "",
      LastName: user?.LastName || user?.lastName || "",
      UserTypeID: forceUserType
        ? String(forceUserType)
        : user?.UserTypeID || user?.userTypeID || "",
      // student specific defaults (for the redesigned student form)
      Class: user?.CurrentGrade || user?.currentGrade || "",
      IDNumber: user?.RollNumber || user?.rollNumber || "",
      Name: `${user?.FirstName || user?.firstName || ""} ${
        user?.LastName || user?.lastName || ""
      }`.trim(),
      Birthday: user?.Birthday || "",
      PhoneNumber: user?.Phone || user?.phone || "",
      Address: user?.Address || "",
      GuardianName: user?.ParentName || user?.parentName || "",
      GuardianPhone: user?.ParentContact || user?.parentContact || "",
      // legacy student fields retained for compatibility
      RollNumber: user?.RollNumber || user?.rollNumber || "",
      CurrentGrade: user?.CurrentGrade || user?.currentGrade || "",
      EmployeeID: user?.EmployeeID || user?.employeeID || "",
      TeacherID:
        user?.TeacherID ||
        user?.teacherID ||
        user?.teacherId ||
        user?.UserID ||
        user?.id ||
        "",
      Department: user?.Department || user?.department || "",
      Qualification: user?.Qualification || user?.qualification || "",
      JoiningDate: user?.JoiningDate || user?.joiningDate || "",
      Bio: user?.Bio || user?.bio || "",
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

  // Keep TeacherID in sync with the underlying user id when editing or when the
  // parent provides the created user object back to this form.
  useEffect(() => {
    if (!user) return;
    const id = user.UserID ?? user.id ?? user.UserId ?? user.ID ?? null;
    if (id != null) {
      setValue("TeacherID", String(id), { shouldValidate: false });
    }
  }, [user, setValue]);
  // Courses state for teacher assignment
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState(() => {
    if (initialCourseSelection && initialCourseSelection.length) {
      return (initialCourseSelection || []).map((c) => String(c));
    }
    return user?.CourseIDs && Array.isArray(user.CourseIDs)
      ? user.CourseIDs.map((c) => String(c))
      : (user?.AssignedCourseIDs || []).map((c) => String(c)) || [];
  });

  const [loadingStudents, setLoadingStudents] = useState(false);

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
    // If creating a new student (userType student and no existing user),
    // fetch students and auto-increment the IDNumber from the highest RollNumber.
    let mounted = true;
    const loadNextId = async () => {
      try {
        if (String(userTypeID) !== "3") return;
        // only auto-generate for new users
        if (user) return;
        setLoadingStudents(true);
        const students = await getAllStudents();
        if (!mounted) return;
        // extract numeric part from RollNumber if possible
        const nums = (students || [])
          .map((s) => {
            const r = s?.RollNumber ?? s?.rollNumber ?? "";
            const digits = String(r).replace(/\D/g, "");
            const n = parseInt(digits || "0", 10);
            return isNaN(n) ? 0 : n;
          })
          .filter((n) => !isNaN(n));

        const max = nums.length ? Math.max(...nums) : 0;
        const next = max + 1;
        const nextId = String(next).padStart(3, "0");
        setValue("IDNumber", nextId, { shouldValidate: true });
        setValue("RollNumber", nextId, { shouldValidate: false });
        // if username empty, set a sensible default
        if (!watch("Username")) {
          setValue("Username", `student${nextId}`);
        }
      } catch (err) {
        console.error("Failed to auto-generate next student ID", err);
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    };

    loadNextId();
    return () => {
      mounted = false;
    };
    // we only want to run when userTypeID or user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTypeID, user]);

  useEffect(() => {
    // initialize selectedCourseIds from form default if present (unless initialCourseSelection provided)
    if (!initialCourseSelection || initialCourseSelection.length === 0) {
      const defaultAssigned =
        (Array.isArray(watch("AssignedCourseIDs")) &&
          watch("AssignedCourseIDs").map((v) => String(v))) ||
        [];
      if (defaultAssigned.length && selectedCourseIds.length === 0) {
        setSelectedCourseIds(defaultAssigned);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormSubmit = (data) => {
    // When creating a student via the redesigned form, synthesize core fields
    const isStudent = String(data.UserTypeID) === "3";

    const synthesized = { ...data };

    if (isStudent) {
      // IDNumber -> RollNumber
      synthesized.RollNumber = data.IDNumber || data.RollNumber || "";
      // Class -> CurrentGrade
      synthesized.CurrentGrade = data.Class || data.CurrentGrade || "";
      // Name -> First/Last
      if (!data.FirstName && !data.LastName && data.Name) {
        const parts = String(data.Name).trim().split(/\s+/);
        synthesized.FirstName = parts.shift() || "";
        synthesized.LastName = parts.join(" ");
      }
      // Username/Email auto-fill if missing
      if (!data.Username) {
        synthesized.Username = `student${(synthesized.RollNumber || "").replace(
          /\s+/g,
          ""
        )}`;
      }
      if (!data.Email) {
        const localId = (synthesized.RollNumber || "unknown").toString();
        synthesized.Email = `student+${localId}@school.local`;
      }
      // Move guardian fields to expected student props (kept even if backend ignores)
      synthesized.ParentName = data.GuardianName || "";
      synthesized.ParentContact = data.GuardianPhone || "";
      // Optional student extras
      synthesized.Phone = data.PhoneNumber || data.Phone || "";
      synthesized.Address = data.Address || "";
      synthesized.Birthday = data.Birthday || "";
    }

    const apiData = {
      ...(user ? { UserID: user.UserID || user.id } : {}),
      Username: synthesized.Username,
      ...(!user && { PasswordHash: synthesized.PasswordHash }),
      Email: synthesized.Email,
      FirstName: synthesized.FirstName,
      LastName: synthesized.LastName,
      UserTypeID: Number(synthesized.UserTypeID),
      IsActive: true,
      ProfilePicture: null,
      ...(isStudent && {
        RollNumber: synthesized.RollNumber,
        CurrentGrade: synthesized.CurrentGrade,
        ParentName: synthesized.ParentName,
        ParentContact: synthesized.ParentContact,
        Phone: synthesized.Phone,
        Address: synthesized.Address,
        Birthday: synthesized.Birthday,
      }),
      ...(synthesized.UserTypeID === "2" && {
        EmployeeID: synthesized.EmployeeID,
        Department: synthesized.Department,
      }),
      ...(synthesized.UserTypeID === "2" && {
        TeacherID: isNaN(Number(synthesized.TeacherID))
          ? synthesized.TeacherID
          : Number(synthesized.TeacherID),
        Qualification: synthesized.Qualification,
        JoiningDate: synthesized.JoiningDate,
        Bio: synthesized.Bio,
      }),
      ...(synthesized.UserTypeID === "2" && {
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
      {/* Always include user type (hidden if forced) */}
      <div>
        <label
          htmlFor="UserTypeID"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          User Type
        </label>
        {forceUserType ? (
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

      {/* If student, show redesigned form; otherwise show generic fields */}
      {userTypeID !== "3" && (
        <>
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
                {...register("FirstName", {
                  required: "First name is required",
                })}
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
              <p className="mt-1 text-sm text-red-600">
                {errors.Email.message}
              </p>
            )}
          </div>
        </>
      )}

      {userTypeID === "3" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Class */}
            <div>
              <label
                htmlFor="Class"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Class *
              </label>
              <select
                id="Class"
                {...register("Class", { required: "Class is required" })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select class</option>
                {Array.from({ length: 13 }, (_, i) => `Grade ${i + 1}`).map(
                  (g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  )
                )}
              </select>
              {errors.Class && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.Class.message}
                </p>
              )}
            </div>

            {/* ID Number with generator */}
            <div>
              <label
                htmlFor="IDNumber"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                ID Number *
              </label>
              <div className="mt-1">
                <input
                  disabled
                  id="IDNumber"
                  type="text"
                  placeholder={
                    loadingStudents ? "Generating ID..." : "Auto-generated ID"
                  }
                  readOnly={false} /* keep editable but prefilled */
                  {...register("IDNumber", {
                    required: "ID number is required",
                    pattern: {
                      value: /^\d{3,}$/,
                      message: "Use numbers like 001, 002",
                    },
                  })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Format: 001, 002, 003...
              </p>
              {errors.IDNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.IDNumber.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Name */}
            <div>
              <label
                htmlFor="Name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Name *
              </label>
              <input
                id="Name"
                type="text"
                placeholder="Enter student's name"
                {...register("Name", {
                  required: "Name is required",
                  minLength: { value: 2, message: "Name is too short" },
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.Name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.Name.message}
                </p>
              )}
            </div>

            {/* Birthday */}
            <div>
              <label
                htmlFor="Birthday"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Birthday *
              </label>
              <input
                id="Birthday"
                type="date"
                {...register("Birthday", {
                  required: "Birthday is required",
                  validate: (v) =>
                    (v && new Date(v) <= new Date()) ||
                    "Birthday can't be in the future",
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.Birthday && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.Birthday.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Address */}
            <div>
              <label
                htmlFor="Address"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Address *
              </label>
              <input
                id="Address"
                type="text"
                placeholder="Enter address"
                {...register("Address", { required: "Address is required" })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.Address && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.Address.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="PhoneNumber"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Phone Number *
              </label>
              <input
                id="PhoneNumber"
                type="tel"
                placeholder="(+947) 456-7890"
                {...register("PhoneNumber", {
                  required: "Phone number is required",
                  validate: (v) =>
                    String(v).replace(/\D/g, "").length >= 10 ||
                    "Enter at least 10 digits",
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.PhoneNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.PhoneNumber.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Guardian name */}
            <div>
              <label
                htmlFor="GuardianName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Guardian's Name *
              </label>
              <input
                id="GuardianName"
                type="text"
                {...register("GuardianName", {
                  required: "Guardian's name is required",
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.GuardianName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.GuardianName.message}
                </p>
              )}
            </div>

            {/* Guardian phone */}
            <div>
              <label
                htmlFor="GuardianPhone"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Guardian's Phone *
              </label>
              <input
                id="GuardianPhone"
                type="tel"
                placeholder="(+947) 456-7890"
                {...register("GuardianPhone", {
                  required: "Guardian's phone is required",
                  validate: (v) =>
                    String(v).replace(/\D/g, "").length >= 10 ||
                    "Enter at least 10 digits",
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.GuardianPhone && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.GuardianPhone.message}
                </p>
              )}
            </div>
          </div>

          {/* Password */}
          {!user && (
            <div>
              <label
                htmlFor="PasswordHash"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password *
              </label>
              <input
                id="PasswordHash"
                name="PasswordHash"
                type="password"
                placeholder="Enter password"
                {...register("PasswordHash", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.PasswordHash && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.PasswordHash.message}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* CurrentGrade / RollNumber legacy inputs removed — use Class and IDNumber instead */}

      {userTypeID === "2" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="TeacherID"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Teacher ID
            </label>
            <input
              id="TeacherID"
              name="TeacherID"
              type="text"
              readOnly
              placeholder="Auto-filled from User ID"
              {...register("TeacherID")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-gray-50"
            />
            {errors.TeacherID && (
              <p className="mt-1 text-sm text-red-600">
                {errors.TeacherID.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="EmployeeID"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Employee ID
            </label>
            <input
              id="EmployeeID"
              name="EmployeeID"
              type="text"
              {...register("EmployeeID", {
                required: "Employee ID is recommended for teachers",
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors.EmployeeID && (
              <p className="mt-1 text-sm text-red-600">
                {errors.EmployeeID.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="Department"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Department
            </label>
            <input
              id="Department"
              name="Department"
              type="text"
              {...register("Department")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors.Department && (
              <p className="mt-1 text-sm text-red-600">
                {errors.Department.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="Qualification"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Qualification
            </label>
            <input
              id="Qualification"
              name="Qualification"
              type="text"
              {...register("Qualification")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="JoiningDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Joining Date
            </label>
            <input
              id="JoiningDate"
              name="JoiningDate"
              type="date"
              {...register("JoiningDate")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="Bio"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Bio
            </label>
            <textarea
              id="Bio"
              name="Bio"
              rows={3}
              {...register("Bio")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
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
          {loading
            ? "Saving..."
            : user
            ? "Update User"
            : userTypeID === "3"
            ? "Add Student"
            : "Create User"}
        </Button>
      </div>
    </form>
  );
};

export default UserForm;
