import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Avatar from "../components/common/Avatar";
import QRCode from "qrcode";
import { getStudentCourses } from "../services/courseService";
import { collectCourseIdsForStudent } from "../utils/helpers";

// Simple inline SVG icons (no external deps)
const Icon = ({ name, className = "w-5 h-5" }) => {
  switch (name) {
    case "user":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.5 20.25a8.25 8.25 0 1115 0v.75H4.5v-.75z"
          />
        </svg>
      );
    case "mail":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21.75 7.5v9a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 16.5v-9A2.25 2.25 0 014.5 5.25h15A2.25 2.25 0 0121.75 7.5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7.5l8.25 5.25L19.5 7.5"
          />
        </svg>
      );
    case "badge":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7.5 4.5h9a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0116.5 19.5h-9A2.25 2.25 0 015.25 17.25V6.75A2.25 2.25 0 017.5 4.5z"
          />
        </svg>
      );
    case "phone":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.25 6.75A2.25 2.25 0 014.5 4.5h3a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 004.5 12v0c0 4.556 3.694 8.25 8.25 8.25v0a2.25 2.25 0 002.25-2.25v-1.5A2.25 2.25 0 0012.75 14.25H11.25A2.25 2.25 0 019 12v0"
          />
        </svg>
      );
    case "school":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 3l8.25 4.5L12 12 3.75 7.5 12 3z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3.75 12L12 16.5 20.25 12"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 12v9"
          />
        </svg>
      );
    default:
      return null;
  }
};

const Profile = () => {
  const { user } = useAuth();

  const role = user?.userType || user?.role || "student";
  const [studentQR, setStudentQR] = useState("");
  const studentId = useMemo(() => {
    return (
      user?.StudentID ??
      user?.studentID ??
      user?.studentId ??
      user?.UserID ??
      user?.userID ??
      user?.userId ??
      user?.id ??
      user?.Id ??
      null
    );
  }, [user]);
  const displayRole =
    role === "admin"
      ? "Administrator"
      : role === "teacher"
      ? "Teacher"
      : "Student";

  // Robust fallbacks so the profile shows the logged-in user's actual data
  const rawName = (
    user?.name ||
    user?.fullName ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    ""
  ).trim();
  const email = user?.email || user?.Email || user?.username || "-";
  const emailLocal = email && email !== "-" ? String(email).split("@")[0] : "";
  const fullName = (
    rawName ||
    emailLocal ||
    user?.username ||
    user?.userName ||
    ""
  ).trim();
  const capitalize = (s) =>
    String(s || "")
      .trim()
      .replace(/\b\w/, (c) => c.toUpperCase());
  const displayName = capitalize(fullName) || "User";
  const phone =
    user?.phone ||
    user?.PhoneNumber ||
    user?.phoneNumber ||
    user?.mobile ||
    "-";

  // Pick fields by role without changing the underlying data
  const fields = useMemo(() => {
    const base = [
      {
        key: "Full Name",
        value: fullName || "-",
        icon: "user",
      },
      { key: "Email", value: email || "-", icon: "mail" },
      {
        key: "Phone",
        value: phone || "-",
        icon: "phone",
      },
    ];

    if (role === "admin") {
      return [
        ...base,
        { key: "Role", value: "Administrator", icon: "badge" },
        {
          key: "Department",
          value: user?.department || "Administration",
          icon: "school",
        },
      ];
    }
    if (role === "teacher") {
      return [
        ...base,
        { key: "Role", value: "Teacher", icon: "badge" },
        {
          key: "Subject",
          value: user?.subject || user?.specialty || "-",
          icon: "school",
        },
      ];
    }
    // default student
    return [
      ...base,
      { key: "Role", value: "Student", icon: "badge" },
      {
        key: "Grade/Year",
        value: user?.grade || user?.year || "-",
        icon: "school",
      },
    ];
  }, [role, user]);

  // Generate a QR for students only
  useEffect(() => {
    let cancelled = false;

    const generateStudentQR = async () => {
      if (role !== "student") {
        if (!cancelled) {
          setStudentQR("");
        }
        return;
      }

      if (!studentId) {
        if (!cancelled) {
          setStudentQR("");
        }
        return;
      }

      try {
        let courses = [];

        try {
          const fetched = await getStudentCourses(studentId);
          courses = Array.isArray(fetched) ? fetched : [];
        } catch (fetchError) {
          console.error("Failed to load courses for profile QR", fetchError);
        }

        const courseIds = collectCourseIdsForStudent(courses);

        const payload = JSON.stringify({
          studentId: String(studentId),
          courseIds,
        });

        const dataUrl = await QRCode.toDataURL(payload);

        if (!cancelled) {
          setStudentQR(dataUrl);
        }
      } catch (e) {
        console.error("Failed to generate student QR", e);
        if (!cancelled) {
          setStudentQR("");
        }
      }
    };

    generateStudentQR();

    return () => {
      cancelled = true;
    };
  }, [role, studentId]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4">
        <Avatar
          name={displayName}
          user={user}
          src={user?.ProfilePicture || user?.profilePicture}
          size="lg"
          className="h-16 w-16 ring-2 ring-white/60 dark:ring-gray-900/60 shadow-lg bg-gradient-to-br from-indigo-500 to-violet-600"
        />
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {displayName}
        </h1>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          {displayRole}
        </p>

        {role === "student" && (
          <div className="flex flex-col items-center gap-3 mt-2">
            {studentQR ? (
              <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 shadow">
                <img
                  src={studentQR}
                  alt="Student QR"
                  className="w-[80px] h-[80px]"
                />
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Generating QR...
              </div>
            )}
            {studentQR && (
              <a
                href={studentQR}
                download={`student-${
                  user?.id || user?.studentId || user?.StudentID || "qr"
                }.png`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md shadow-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                  />
                </svg>
                Download QR Code
              </a>
            )}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-white to-indigo-50/70 dark:from-gray-900/70 dark:to-indigo-950/20 backdrop-blur shadow-lg ring-1 ring-indigo-100 dark:ring-indigo-800 rounded-2xl p-6">
        <dl className="divide-y divide-gray-100 dark:divide-gray-800">
          {fields.map((f) => (
            <div key={f.key} className="py-4 grid grid-cols-3 gap-4">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <Icon
                  name={f.icon}
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                />
                {f.key}
              </dt>
              <dd className="col-span-2 text-sm text-gray-900 dark:text-white break-words">
                {String(f.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default Profile;
