import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Cropper from "react-easy-crop";
import Button from "../common/Button";
import Avatar from "../common/Avatar";
import Modal from "../common/Modal";
import CourseForm from "../courses/CourseForm";
import {
  getAllCourses,
  getTeacherCourses,
  createCourse,
} from "../../services/courseService";
import { getAllStudents } from "../../services/studentService";
import CoursePickerModal from "../courses/CoursePickerModal";
import { getAllTeachers } from "../../services/teacherService";
import { getAllUsers } from "../../services/userService";

const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB cap for inline uploads
const PROFILE_PHOTO_ASPECT_RATIO = 1; // keep avatars square

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const getCroppedImage = async (imageSrc, cropPixels) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not get canvas context");
  }

  const target = cropPixels || {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  };

  const width = Math.max(1, Math.round(target.width));
  const height = Math.max(1, Math.round(target.height));

  canvas.width = width;
  canvas.height = height;

  context.drawImage(
    image,
    target.x,
    target.y,
    target.width,
    target.height,
    0,
    0,
    width,
    height
  );

  return canvas.toDataURL("image/jpeg", 0.9);
};

const parseEmployeeId = (value) => {
  const str = String(value ?? "").trim();
  if (!str) {
    return null;
  }
  const match = str.match(/^(.*?)(\d+)$/);
  if (match) {
    const numeric = Number.parseInt(match[2], 10);
    if (Number.isNaN(numeric)) {
      return null;
    }
    return {
      prefix: match[1] || "",
      number: numeric,
      width: match[2].length,
    };
  }
  const numeric = Number.parseInt(str, 10);
  if (Number.isNaN(numeric)) {
    return null;
  }
  return {
    prefix: "",
    number: numeric,
    width: str.length,
  };
};

const computeNextEmployeeId = (existingIds) => {
  const parsed = (existingIds || [])
    .map((id) => parseEmployeeId(id))
    .filter(Boolean);

  if (!parsed.length) {
    return "EMP001";
  }

  const highest = parsed.reduce((acc, curr) => {
    if (!acc) {
      return curr;
    }
    if (curr.number > acc.number) {
      return curr;
    }
    if (curr.number === acc.number && curr.width > acc.width) {
      return curr;
    }
    return acc;
  }, null);

  const nextNumber = highest.number + 1;
  const padded = highest.width
    ? String(nextNumber).padStart(highest.width, "0")
    : String(nextNumber);
  return `${highest.prefix}${padded}`;
};

const UserForm = ({
  onSubmit,
  loading,
  user,
  initialData, // alias used by some callers (UserFormDialog)
  userTypes,
  forceUserType,
  initialCourseSelection = [],
  onCancel,
  onBack,
  // when provided, scope course lists/creation to this teacher id
  teacherId = null,
  // New: allow showing only core fields or only role-specific fields
  showCoreFields = true,
  showRoleFields = true,
  // New: override submit button label
  submitLabel,
  additionalRoleContent = null,
  onStudentCourseSelectionChange = null,
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

  // Async uniqueness checks (soft-fail to true on API error to avoid blocking)
  const isUsernameUnique = async (val) => {
    try {
      const v = String(val || "")
        .trim()
        .toLowerCase();
      if (!v) return true;
      // if editing and username unchanged, allow
      const existingName = (
        initialUser?.Username ||
        initialUser?.username ||
        ""
      )
        .toString()
        .toLowerCase();
      if (initialUser && existingName && existingName === v) return true;
      const users = await getAllUsers();
      const found = (users || []).find(
        (u) => String(u.Username || u.username || "").toLowerCase() === v
      );
      if (!found) return true;
      const foundId =
        found.UserID ?? found.id ?? found.userID ?? found.userId ?? null;
      const currentId = initialUser
        ? initialUser.UserID ??
          initialUser.id ??
          initialUser.userID ??
          initialUser.userId ??
          null
        : null;
      if (currentId && String(foundId) === String(currentId)) return true;
      return "Username already taken";
    } catch (e) {
      return true;
    }
  };

  const isEmailUnique = async (val) => {
    try {
      const v = String(val || "")
        .trim()
        .toLowerCase();
      if (!v) return true;
      const existingEmail = (initialUser?.Email || initialUser?.email || "")
        .toString()
        .toLowerCase();
      if (initialUser && existingEmail && existingEmail === v) return true;
      const users = await getAllUsers();
      const found = (users || []).find(
        (u) => String(u.Email || u.email || "").toLowerCase() === v
      );
      if (!found) return true;
      const foundId =
        found.UserID ?? found.id ?? found.userID ?? found.userId ?? null;
      const currentId = initialUser
        ? initialUser.UserID ??
          initialUser.id ??
          initialUser.userID ??
          initialUser.userId ??
          null
        : null;
      if (currentId && String(foundId) === String(currentId)) return true;
      return "Email already in use";
    } catch (e) {
      return true;
    }
  };

  const initialProfilePicture =
    initialUser?.ProfilePicture || initialUser?.profilePicture || "";
  const initialProfileVersion =
    initialUser?.ProfilePictureVersion ||
    initialUser?.profilePictureVersion ||
    null;
  const [photoPreview, setPhotoPreview] = useState(initialProfilePicture);
  const [photoVersion, setPhotoVersion] = useState(initialProfileVersion);
  const [photoError, setPhotoError] = useState("");
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [rawPhoto, setRawPhoto] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isSavingCrop, setIsSavingCrop] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [isEmployeeIdGenerating, setIsEmployeeIdGenerating] = useState(false);
  const [employeeIdAutoGenerated, setEmployeeIdAutoGenerated] = useState(
    Boolean(
      initialUser?.EmployeeID ||
        initialUser?.employeeID ||
        initialUser?.employeeId
    )
  );

  useEffect(() => {
    register("ProfilePicture");
  }, [register]);

  useEffect(() => {
    setEmployeeIdAutoGenerated(
      Boolean(
        initialUser?.EmployeeID ||
          initialUser?.employeeID ||
          initialUser?.employeeId
      )
    );
  }, [initialUser]);

  const openPhotoEditor = (imageData) => {
    if (!imageData) return;
    setRawPhoto(imageData);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setEditorError("");
    setIsPhotoEditorOpen(true);
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file (PNG or JPG).");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      setPhotoError("Image must be smaller than 2 MB.");
      event.target.value = "";
      return;
    }

    setPhotoError("");
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result?.toString() || "";
      if (!result) {
        setPhotoError("Could not read the selected file.");
        return;
      }
      openPhotoEditor(result);
    };
    reader.onerror = () => {
      setPhotoError("Could not read the selected file.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handlePhotoRemove = () => {
    if (!isSavingCrop) {
      setIsPhotoEditorOpen(false);
    }
    setPhotoPreview("");
    setValue("ProfilePicture", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
    setPhotoError("");
    setRawPhoto("");
    setEditorError("");
    setPhotoVersion(Date.now());
  };

  const handleExistingPhotoEdit = () => {
    if (photoPreview) {
      openPhotoEditor(photoPreview);
    }
  };

  const handlePhotoEditorClose = () => {
    if (isSavingCrop) return;
    setIsPhotoEditorOpen(false);
    setRawPhoto("");
    setEditorError("");
  };

  const handleCropComplete = (_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleZoomChange = (event) => {
    setZoom(Number(event.target.value));
  };

  const estimateBase64Size = (dataUrl) => {
    if (!dataUrl) return 0;
    const base64 = dataUrl.split(",")[1] || "";
    return Math.ceil((base64.length * 3) / 4);
  };

  const handleConfirmCrop = async () => {
    if (!rawPhoto) return;
    setIsSavingCrop(true);
    setEditorError("");
    try {
      const cropped = await getCroppedImage(rawPhoto, croppedAreaPixels);
      const size = estimateBase64Size(cropped);
      if (size > MAX_PROFILE_PHOTO_SIZE) {
        setEditorError(
          "Cropped image is still larger than 2 MB. Try a tighter crop."
        );
        setPhotoError(
          "Cropped image is still larger than 2 MB. Try a tighter crop."
        );
        return;
      }
      setPhotoPreview(cropped);
      setValue("ProfilePicture", cropped, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setPhotoError("");
      setIsPhotoEditorOpen(false);
      setRawPhoto("");
      setPhotoVersion(Date.now());
    } catch (error) {
      console.error("Failed to crop image", error);
      setEditorError("Could not process the selected area. Please try again.");
      setPhotoError("Could not process the selected area. Please try again.");
    } finally {
      setIsSavingCrop(false);
    }
  };

  const renderPhotoField = () => (
    <div className="space-y-2">
      <label
        htmlFor="profile-photo-input"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Profile Photo
      </label>
      <input
        id="profile-photo-input"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handlePhotoSelect}
      />
      <div className="mt-2 flex flex-wrap items-center gap-4">
        {photoPreview ? (
          <div className="h-16 w-16 rounded-full overflow-hidden">
            <Avatar
              src={photoPreview}
              user={{
                ProfilePicture: photoPreview,
                profilePictureVersion: photoVersion,
                ProfilePictureVersion: photoVersion,
              }}
              size="lg"
              className="h-16 w-16"
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
            No photo
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor="profile-photo-input"
            className="cursor-pointer inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {photoPreview ? "Change Photo" : "Upload Photo"}
          </label>
          {photoPreview && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExistingPhotoEdit}
            >
              Edit Crop
            </Button>
          )}
          {photoPreview && (
            <button
              type="button"
              onClick={handlePhotoRemove}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/60"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {photoError && <p className="text-sm text-red-600">{photoError}</p>}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        PNG or JPG up to 2 MB.
      </p>
    </div>
  );

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
      ProfilePicture: u?.ProfilePicture || u?.profilePicture || "",
      // student specific defaults (for the redesigned student form)
      Class: u?.CurrentGrade || u?.currentGrade || "",
      IDNumber: u?.RollNumber || u?.rollNumber || "",
      Name: `${u?.FirstName || u?.firstName || ""} ${
        u?.LastName || u?.lastName || ""
      }`.trim(),
      EnrollmentDate: (() => {
        // Convert known date shapes into YYYY-MM-DD so <input type="date"> shows the value
        // Use local date parts instead of toISOString() to avoid timezone shifts
        const raw =
          u?.EnrollmentDate || u?.enrollmentDate || u?.enrollment_date || "";
        if (!raw) return "";
        try {
          // If already in YYYY-MM-DD, return as-is
          if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return raw;
          }
          const d = new Date(raw);
          if (isNaN(d.getTime())) return String(raw);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        } catch (e) {
          return String(raw);
        }
      })(),
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
      JoiningDate: (() => {
        // Convert known date shapes into YYYY-MM-DD so <input type="date"> shows the value
        // Use local date parts instead of toISOString() to avoid timezone shifts
        const raw = u?.JoiningDate || u?.joiningDate || "";
        if (!raw) return "";
        try {
          if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return raw;
          }
          const d = new Date(raw);
          if (isNaN(d.getTime())) return String(raw);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        } catch (e) {
          return String(raw);
        }
      })(),
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
    setPhotoPreview(defaults.ProfilePicture || "");
    const nextVersion =
      initialUser?.ProfilePictureVersion ||
      initialUser?.profilePictureVersion ||
      null;
    setPhotoVersion(nextVersion);
    setValue("ProfilePicture", defaults.ProfilePicture || "", {
      shouldDirty: false,
      shouldValidate: false,
    });
    setPhotoError("");
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

  useEffect(() => {
    let cancelled = false;
    const hasExistingEmployeeId = Boolean(
      initialUser?.EmployeeID ||
        initialUser?.employeeID ||
        initialUser?.employeeId
    );
    const shouldGenerate =
      userTypeID === "2" &&
      showRoleFields &&
      !employeeIdAutoGenerated &&
      !hasExistingEmployeeId;

    if (!shouldGenerate) {
      return undefined;
    }

    const generateId = async () => {
      setIsEmployeeIdGenerating(true);
      try {
        const teachers = await getAllTeachers();
        if (cancelled) {
          return;
        }
        const existingIds = Array.isArray(teachers)
          ? teachers
              .map(
                (t) =>
                  t?.EmployeeID ??
                  t?.employeeID ??
                  t?.employeeId ??
                  t?.employee_id ??
                  null
              )
              .map((id) =>
                typeof id === "string" ? id.trim() : id ?? undefined
              )
              .filter((id) => id !== undefined && id !== null && id !== "")
          : [];
        const nextId = computeNextEmployeeId(existingIds);
        setValue("EmployeeID", nextId, {
          shouldDirty: true,
          shouldValidate: true,
        });
        setEmployeeIdAutoGenerated(true);
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to auto-generate employee id", error);
          const fallbackId = computeNextEmployeeId([]);
          setValue("EmployeeID", fallbackId, {
            shouldDirty: true,
            shouldValidate: true,
          });
          setEmployeeIdAutoGenerated(true);
        }
      } finally {
        if (!cancelled) {
          setIsEmployeeIdGenerating(false);
        }
      }
    };

    generateId();

    return () => {
      cancelled = true;
    };
  }, [
    employeeIdAutoGenerated,
    initialUser,
    setValue,
    showRoleFields,
    userTypeID,
  ]);

  // When creating a new teacher, default JoiningDate to today if not provided
  useEffect(() => {
    try {
      if (String(userTypeID) === "2" && showRoleFields && !initialUser) {
        const current =
          (watch && typeof watch === "function" && watch("JoiningDate")) || "";
        if (!current) {
          const d = new Date();
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          const today = `${yyyy}-${mm}-${dd}`;
          setValue("JoiningDate", today, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }
    } catch (e) {
      // swallow — non-critical
    }
    // only run when these change
  }, [userTypeID, showRoleFields, initialUser, setValue, watch]);
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
        const all = teacherId
          ? await getTeacherCourses(teacherId)
          : await getAllCourses();
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
        // Prefix student ID with 'S' (e.g. S001) as requested
        const numeric = String(next).padStart(3, "0");
        const nextId = `S${numeric}`;
        setValue("IDNumber", nextId, { shouldValidate: true });
        // store RollNumber with same format (keeps S prefix)
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
    // sanitize/trims: remove accidental whitespace from key text fields
    data = {
      ...(data || {}),
      Username: (data?.Username || "").trim(),
      Email: (data?.Email || "").trim(),
      FirstName: (data?.FirstName || "").trim(),
      LastName: (data?.LastName || "").trim(),
      EmployeeID: (data?.EmployeeID || "").trim(),
      Department: (data?.Department || "").trim(),
      Qualification: (data?.Qualification || "").trim(),
      Bio: (data?.Bio || "").trim(),
    };
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
      ProfilePicture: (() => {
        const value =
          typeof synthesized.ProfilePicture === "string" &&
          synthesized.ProfilePicture.length
            ? synthesized.ProfilePicture
            : typeof photoPreview === "string" && photoPreview.length
            ? photoPreview
            : "";
        return value || null;
      })(),
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
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6 sm:space-y-7"
    >
      {/* User Type selector (only in core step). In role-only step, rely on forceUserType. */}
      {showCoreFields && (
        <div>
          <label
            htmlFor="UserTypeID"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            User Type
          </label>
          {forceUserType || initialUser ? (
            <div className="mt-1">
              <input
                type="hidden"
                defaultValue={
                  forceUserType
                    ? String(forceUserType)
                    : String(
                        initialUser?.UserTypeID ?? initialUser?.userTypeID ?? ""
                      )
                }
                {...register("UserTypeID", {
                  required: "User type is required",
                })}
              />
              <div className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200">
                {String(
                  forceUserType ||
                    (initialUser?.UserTypeID ?? initialUser?.userTypeID)
                ) === "1"
                  ? "Admin"
                  : String(
                      forceUserType ||
                        (initialUser?.UserTypeID ?? initialUser?.userTypeID)
                    ) === "2"
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
        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 sm:p-6">
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
                {...register("Username", {
                  required: "Username is required",
                  minLength: {
                    value: 3,
                    message: "Username must be at least 3 characters",
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9._-]+$/,
                    message:
                      "Username can contain letters, numbers, dot, underscore or hyphen",
                  },
                  validate: isUsernameUnique,
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.Username && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.Username.message}
                </p>
              )}
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
                  validate: isEmailUnique,
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.Email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.Email.message}
                </p>
              )}
            </div>
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

          {renderPhotoField()}
        </div>
      )}

      {/* Student fields split into core (step 1) and role-specific (step 2) */}
      {userTypeID === "3" && (
        <>
          {showCoreFields && (
            <div className="space-y-5 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 sm:p-6">
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      minLength: {
                        value: 3,
                        message: "Username must be at least 3 characters",
                      },
                      pattern: {
                        value: /^[a-zA-Z0-9._-]+$/,
                        message:
                          "Username can contain letters, numbers, dot, underscore or hyphen",
                      },
                      validate: isUsernameUnique,
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {errors.Username && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.Username.message}
                    </p>
                  )}
                </div>

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
                      validate: isEmailUnique,
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

              {renderPhotoField()}
            </div>
          )}

          {showRoleFields && (
            <div className="space-y-5 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* ID Number field intentionally hidden for now
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
                        loadingStudents
                          ? "Generating ID..."
                          : "Auto-generated ID"
                      }
                      readOnly={false}
                      {...register("IDNumber", {
                        required: "ID number is required",
                        pattern: {
                          value: /^S\d{3,}$/i,
                          message: "Use format S001, S002...",
                        },
                      })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Format: S001, S002, S003...
                  </p>
                  {errors.IDNumber && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.IDNumber.message}
                    </p>
                  )}
                </div>
                */}

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

                <div>
                  <label
                    htmlFor="GuardianName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Guardian's Name
                  </label>
                  <input
                    id="GuardianName"
                    type="text"
                    {...register("GuardianName")}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {errors.GuardianName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.GuardianName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="GuardianPhone"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Guardian's Phone
                  </label>
                  <input
                    id="GuardianPhone"
                    type="tel"
                    placeholder="(+947) 456-7890"
                    {...register("GuardianPhone", {
                      validate: (v) =>
                        !v ||
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

              {initialUser && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enrolled Courses
                  </label>
                  <div className="mt-2 rounded-md border border-gray-200 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/70">
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
                              className="inline-flex items-center gap-2 rounded bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-200"
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
                        className="w-full justify-center sm:w-auto"
                      >
                        Manage Enrolled Courses
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* CurrentGrade / RollNumber legacy inputs removed — use Class and IDNumber instead */}

      {userTypeID === "2" && showRoleFields && (
        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  validate: (v) =>
                    !v ||
                    /^EMP?\d+$/i.test(String(v)) ||
                    "Employee ID should be numeric or like 'EMP001'",
                })}
                disabled={isEmployeeIdGenerating}
                placeholder={
                  isEmployeeIdGenerating ? "Generating..." : undefined
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {isEmployeeIdGenerating && (
                <p className="mt-1 text-sm text-gray-500">
                  Generating the next employee ID...
                </p>
              )}
              {errors.EmployeeID && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.EmployeeID.message}
                </p>
              )}
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
                {...register("JoiningDate", {
                  required:
                    String(userTypeID) === "2"
                      ? "Joining date is required"
                      : false,
                  validate: (v) =>
                    !v ||
                    new Date(v) <= new Date() ||
                    "Joining date can't be in the future",
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.JoiningDate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.JoiningDate.message}
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
                {...register("Bio", {
                  maxLength: {
                    value: 1000,
                    message: "Bio must be under 1000 characters",
                  },
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.Bio && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.Bio.message}
                </p>
              )}
            </div>

            {userTypeID === "2" && showRoleFields && initialUser ? (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Assigned Courses
                </label>
                <div className="mt-2 rounded-md border border-gray-200 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/70">
                  {selectedCourseIds.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {selectedCourseIds.map((cid) => {
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
                            className="inline-flex items-center gap-2 rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
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

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowTeacherCoursePicker(true)}
                      className="w-full justify-center sm:w-auto"
                    >
                      Manage Courses
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowCourseModal(true)}
                      className="w-full justify-center sm:w-auto"
                    >
                      + Add New Course
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
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
              // If a teacherId was provided to this form, ensure the
              // created course is associated with that teacher.
              const payload = teacherId
                ? { ...data, TeacherID: teacherId, teacherId }
                : data;
              const newCourse = await createCourse(payload);
              // ensure id is represented as string
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

      <Modal
        isOpen={isPhotoEditorOpen}
        onClose={() => {
          if (!isSavingCrop) {
            handlePhotoEditorClose();
          }
        }}
        title="Adjust Profile Photo"
        size="xl"
      >
        <div className="space-y-4">
          <div className="relative h-64 w-full overflow-hidden rounded-md bg-gray-900">
            {rawPhoto && (
              <Cropper
                image={rawPhoto}
                crop={crop}
                zoom={zoom}
                aspect={PROFILE_PHOTO_ASPECT_RATIO}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zoom
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={handleZoomChange}
              className="flex-1 accent-indigo-600"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {zoom.toFixed(1)}x
            </span>
          </div>
          {editorError && <p className="text-sm text-red-600">{editorError}</p>}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePhotoEditorClose}
              disabled={isSavingCrop}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmCrop}
              disabled={isSavingCrop}
            >
              {isSavingCrop ? "Saving..." : "Save Crop"}
            </Button>
          </div>
        </div>
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
        teacherId={teacherId}
      />

      <CoursePickerModal
        isOpen={showStudentCoursePicker}
        onClose={() => setShowStudentCoursePicker(false)}
        initialSelected={studentSelectedCourseIds}
        onProceed={async (ids) => {
          const dedupeIds = (list) =>
            Array.from(
              new Set(
                (list || [])
                  .map((value) => String(value))
                  .map((value) => value.trim())
                  .filter(Boolean)
              )
            );

          const previousSelection = studentSelectedCourseIds;
          const normalizedSelection = dedupeIds(ids);

          let accepted = true;
          let finalSelection = normalizedSelection;

          if (typeof onStudentCourseSelectionChange === "function") {
            try {
              const result = await onStudentCourseSelectionChange(
                [...normalizedSelection],
                [...previousSelection]
              );

              if (Array.isArray(result)) {
                finalSelection = dedupeIds(result);
              } else if (result && typeof result === "object") {
                if (result.accepted === false) {
                  accepted = false;
                }
                if (Array.isArray(result.finalIds)) {
                  finalSelection = dedupeIds(result.finalIds);
                }
              } else if (result === false) {
                accepted = false;
              }
            } catch (handlerError) {
              console.error(
                "Student course selection handler failed",
                handlerError
              );
              accepted = false;
            }
          }

          if (!accepted) {
            setStudentSelectedCourseIds([...(previousSelection || [])]);
            setShowStudentCoursePicker(false);
            return;
          }

          setStudentSelectedCourseIds(finalSelection);
          setShowStudentCoursePicker(false);
        }}
        title="Enroll Student in Courses"
        description="Select courses for the student to be enrolled in."
        multiSelect={true}
        allowCreate={false}
        teacherId={teacherId}
      />

      {showRoleFields
        ? typeof additionalRoleContent === "function"
          ? additionalRoleContent({
              userTypeID,
              showCoreFields,
              showRoleFields,
            })
          : additionalRoleContent || null
        : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        {/* Reset button commented out per request; replaced with Back when provided */}
        {false && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => reset()}
            className="w-full justify-center sm:w-auto"
          >
            Reset
          </Button>
        )}
        {onBack ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onBack()}
            className="w-full justify-center sm:w-auto"
          >
            Back
          </Button>
        ) : null}
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onCancel()}
            className="w-full justify-center sm:w-auto"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="w-full justify-center sm:w-auto"
        >
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
