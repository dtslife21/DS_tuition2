import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../common/Button";
import Modal from "../common/Modal";
import CourseForm from "../courses/CourseForm";
import { getAllCourses, createCourse } from "../../services/courseService";
import { getAllStudents } from "../../services/studentService";
import CoursePickerModal from "../courses/CoursePickerModal";

const UserForm = ({
  onSubmit,
  loading,
  user,
  initialData, // alias used by some callers (UserFormDialog)
  userTypes,
  forceUserType,
  initialCourseSelection = [],
  onCancel,
  // New: allow showing only core fields or only role-specific fields
  showCoreFields = true,
  showRoleFields = true,
  // New: override submit button label
  submitLabel,
}) => {
  // support either `user` or `initialData` prop for backwards compatibility
  const initialUser = user || initialData || null;
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm({
    defaultValues: getDefaults(initialUser, forceUserType),
  });

  // derive default form values from a user object (or empty for create)
  function getDefaults(u, forcedType) {
    return {
      // generic user defaults
      Username: u?.Username || u?.username || "",
      PasswordHash: "",
      Email: u?.Email || u?.email || "",
      FirstName: u?.FirstName || u?.firstName || "",
      LastName: u?.LastName || u?.lastName || "",
      UserTypeID: forcedType
        ? String(forcedType)
        : u?.UserTypeID || u?.userTypeID || "",
      // student specific defaults (for the redesigned student form)
      Class: u?.CurrentGrade || u?.currentGrade || "",
      IDNumber: u?.RollNumber || u?.rollNumber || "",
      Name: `${u?.FirstName || u?.firstName || ""} ${
        u?.LastName || u?.lastName || ""
      }`.trim(),
      EnrollmentDate:
        u?.EnrollmentDate || u?.enrollmentDate || u?.enrollment_date || "",
      GuardianName: u?.ParentName || u?.parentName || "",
      GuardianPhone: u?.ParentContact || u?.parentContact || "",
      // legacy student fields retained for compatibility
      RollNumber: u?.RollNumber || u?.rollNumber || "",
      CurrentGrade: u?.CurrentGrade || u?.currentGrade || "",
      EmployeeID: u?.EmployeeID || u?.employeeID || "",
      TeacherID:
        u?.TeacherID ||
        u?.teacherID ||
        u?.teacherId ||
        u?.UserID ||
        u?.id ||
        "",
      Department: u?.Department || u?.department || "",
      Qualification: u?.Qualification || u?.qualification || "",
      JoiningDate: u?.JoiningDate || u?.joiningDate || "",
      Bio: u?.Bio || u?.bio || "",
      AssignedCourseIDs:
        (u?.Courses && Array.isArray(u.Courses)
          ? u.Courses.map((c) => c.id ?? c.CourseID ?? c.id)
          : u?.assignedCourseIds || u?.CourseIDs || []) || [],
    };
  }

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
    const u = initialUser;
    if (!u) return;
    const id = u.UserID ?? u.id ?? u.UserId ?? u.ID ?? null;
    if (id != null) {
      setValue("TeacherID", String(id), { shouldValidate: false });
    }
  }, [initialUser, setValue]);

  // When an existing user is loaded asynchronously, reset the form with their data
  useEffect(() => {
    const defaults = getDefaults(initialUser, forceUserType);
    reset(defaults);
    // Also sync selected courses from the user object
    const nextSelected = (defaults.AssignedCourseIDs || []).map((v) =>
      String(v)
    );
    setSelectedCourseIds(nextSelected);
    // Prefill student course selection from user if available
    const nextStudentSelected = (
      (initialUser?.StudentCourseIDs &&
      Array.isArray(initialUser.StudentCourseIDs)
        ? initialUser.StudentCourseIDs
        : initialUser?.CourseIDs && Array.isArray(initialUser.CourseIDs)
        ? initialUser.CourseIDs
        : (initialUser?.Courses || []).map((c) => c.id ?? c.CourseID)) || []
    ).map((v) => String(v));
    setStudentSelectedCourseIds(nextStudentSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser, forceUserType]);
  // Courses state for teacher assignment
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTeacherCoursePicker, setShowTeacherCoursePicker] = useState(false);
  const [showStudentCoursePicker, setShowStudentCoursePicker] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState(() => {
    if (initialCourseSelection && initialCourseSelection.length) {
      return (initialCourseSelection || []).map((c) => String(c));
    }
    const u = initialUser;
    return u?.CourseIDs && Array.isArray(u.CourseIDs)
      ? u.CourseIDs.map((c) => String(c))
      : (u?.AssignedCourseIDs || []).map((c) => String(c)) || [];
  });

  const [studentSelectedCourseIds, setStudentSelectedCourseIds] = useState(
    () => {
      const u = initialUser;
      return u?.StudentCourseIDs && Array.isArray(u.StudentCourseIDs)
        ? u.StudentCourseIDs.map((c) => String(c))
        : u?.CourseIDs && Array.isArray(u.CourseIDs)
        ? u.CourseIDs.map((c) => String(c))
        : u?.Courses && Array.isArray(u.Courses)
        ? u.Courses.map((c) => String(c.id ?? c.CourseID ?? c.id))
        : [];
    }
  );

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
        // Prefix student ID with 'R' (e.g. R001) as requested
        const numeric = String(next).padStart(3, "0");
        const nextId = `R${numeric}`;
        setValue("IDNumber", nextId, { shouldValidate: true });
        // store RollNumber with same format (keeps R prefix)
        setValue("RollNumber", nextId, { shouldValidate: false });
        // Do NOT auto-fill Username here; require manual entry for clarity
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
      // Do NOT auto-fill Username on submit; require explicit username from the user
      if (!data.Email) {
        const localId = (synthesized.RollNumber || "unknown").toString();
        synthesized.Email = `student+${localId}@school.local`;
      }
      // Move guardian fields to expected student props (kept even if backend ignores)
      synthesized.ParentName = data.GuardianName || "";
      synthesized.ParentContact = data.GuardianPhone || "";
      // Optional student extras
      synthesized.EnrollmentDate =
        data.EnrollmentDate || data.enrollmentDate || "";
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
        EnrollmentDate: synthesized.EnrollmentDate,
        // Include selected course IDs for student enrollment editing
        StudentCourseIDs: studentSelectedCourseIds.map((id) =>
          isNaN(Number(id)) ? id : Number(id)
        ),
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
      {/* User Type selector (only in core step). In role-only step, rely on forceUserType. */}
      {showCoreFields && (
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
                {...register("UserTypeID", {
                  required: "User type is required",
                })}
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
      )}

      {/* If not student: show generic core fields only when core step is shown */}
      {userTypeID !== "3" && showCoreFields && (
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

      {/* Student role-specific fields. Only show account core in core step. */}
      {userTypeID === "3" && showRoleFields && (
        <>
          {showCoreFields && (
            <>
              {/* Core account fields for students (same as admin/teacher) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Username */}
                <div>
                  <label
                    htmlFor="Username"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Username *
                  </label>
                  <input
                    id="Username"
                    name="Username"
                    type="text"
                    placeholder="Enter username"
                    {...register("Username", {
                      required: "Username is required",
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {errors.Username && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.Username.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="Email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email *
                  </label>
                  <input
                    id="Email"
                    name="Email"
                    type="email"
                    placeholder="student@example.com"
                    {...register("Email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {errors.Email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.Email.message}
                    </p>
                  )}
                </div>
              </div>

              {/* First/Last name instead of single Full Name */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="FirstName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    First Name *
                  </label>
                  <input
                    id="FirstName"
                    name="FirstName"
                    type="text"
                    placeholder="Enter first name"
                    {...register("FirstName", {
                      required: "First name is required",
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                    Last Name *
                  </label>
                  <input
                    id="LastName"
                    name="LastName"
                    type="text"
                    placeholder="Enter last name"
                    {...register("LastName", {
                      required: "Last name is required",
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {errors.LastName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.LastName.message}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

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
                  disabled={false}
                  id="IDNumber"
                  type="text"
                  placeholder={
                    loadingStudents ? "Generating ID..." : "Auto-generated ID"
                  }
                  readOnly={false} /* keep editable but prefilled */
                  {...register("IDNumber", {
                    required: "ID number is required",
                    pattern: {
                      // enforce leading 'R' followed by at least 3 digits (R001)
                      value: /^R\d{3,}$/i,
                      message: "Use format R001, R002...",
                    },
                  })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Format: R001, R002, R003...
              </p>
              {errors.IDNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.IDNumber.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Enrollment Date (replaces Birthday) */}
            <div>
              <label
                htmlFor="EnrollmentDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Enrollment Date *
              </label>
              <input
                id="EnrollmentDate"
                type="date"
                {...register("EnrollmentDate", {
                  required: "Enrollment date is required",
                  validate: (v) =>
                    (v && new Date(v) <= new Date()) ||
                    "Enrollment date can't be in the future",
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.EnrollmentDate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.EnrollmentDate.message}
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

          {/* Student: Manage enrolled courses (only when editing an existing user) */}
          {initialUser && (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enrolled Courses
                </label>
                <div className="mt-2 rounded-md border dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                  {studentSelectedCourseIds.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {studentSelectedCourseIds.map((cid) => {
                        const c = (courses || []).find(
                          (x) =>
                            String(
                              x.id ??
                                x.CourseID ??
                                x.CourseId ??
                                x.courseId ??
                                ""
                            ) === String(cid)
                        );
                        const label =
                          c?.name ||
                          c?.CourseName ||
                          c?.title ||
                          c?.courseName ||
                          `Course ${cid}`;
                        return (
                          <li
                            key={cid}
                            className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-200"
                          >
                            {label}
                            <button
                              type="button"
                              className="text-green-600 hover:text-green-800 dark:text-green-300"
                              onClick={() =>
                                setStudentSelectedCourseIds((prev) =>
                                  prev.filter((id) => id !== cid)
                                )
                              }
                            >
                              ✕
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-xs text-gray-500">
                      No courses enrolled yet.
                    </div>
                  )}

                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowStudentCoursePicker(true)}
                    >
                      Manage Enrolled Courses
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Password (core); only in create flow and only in core step) */}
          {!user && showCoreFields && (
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

      {userTypeID === "2" && showRoleFields && (
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

          {/* Teacher: Manage assigned courses */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Assigned Courses
            </label>
            <div className="mt-2 rounded-md border dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
              {selectedCourseIds.length ? (
                <ul className="flex flex-wrap gap-2">
                  {selectedCourseIds.map((cid) => {
                    const c = (courses || []).find(
                      (x) =>
                        String(
                          x.id ?? x.CourseID ?? x.CourseId ?? x.courseId ?? ""
                        ) === String(cid)
                    );
                    const label =
                      c?.name ||
                      c?.CourseName ||
                      c?.title ||
                      c?.courseName ||
                      `Course ${cid}`;
                    return (
                      <li
                        key={cid}
                        className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
                      >
                        {label}
                        <button
                          type="button"
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-300"
                          onClick={() =>
                            setSelectedCourseIds((prev) =>
                              prev.filter((id) => id !== cid)
                            )
                          }
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-xs text-gray-500">
                  No courses assigned yet.
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowTeacherCoursePicker(true)}
                >
                  Manage Courses
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCourseModal(true)}
                >
                  + Add New Course
                </Button>
              </div>
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

      {/* Course pickers for teacher and student */}
      <CoursePickerModal
        isOpen={showTeacherCoursePicker}
        onClose={() => setShowTeacherCoursePicker(false)}
        initialSelected={selectedCourseIds}
        onProceed={(ids) => {
          setSelectedCourseIds(ids.map((v) => String(v)));
          setShowTeacherCoursePicker(false);
        }}
        title="Assign Courses to Teacher"
        description="Choose one or more courses to assign to this teacher."
        multiSelect={true}
        allowCreate={true}
      />

      <CoursePickerModal
        isOpen={showStudentCoursePicker}
        onClose={() => setShowStudentCoursePicker(false)}
        initialSelected={studentSelectedCourseIds}
        onProceed={(ids) => {
          setStudentSelectedCourseIds(ids.map((v) => String(v)));
          setShowStudentCoursePicker(false);
        }}
        title="Enroll Student in Courses"
        description="Select courses for the student to be enrolled in."
        multiSelect={true}
        allowCreate={false}
      />

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="secondary" onClick={() => reset()}>
          Reset
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={() => onCancel()}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading
            ? "Saving..."
            : submitLabel ||
              (initialUser
                ? "Update User"
                : userTypeID === "3"
                ? "Add Student"
                : "Create User")}
        </Button>
      </div>
    </form>
  );
};

export default UserForm;
