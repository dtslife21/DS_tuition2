import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../../components/common/Avatar";
import { getUserById } from "../../services/userService";

const InfoRow = ({ label, value }) => (
  <div className="flex items-start gap-4">
    <div className="w-36 text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
    </div>
    <div className="text-sm text-gray-900 dark:text-gray-100">
      {value || "-"}
    </div>
  </div>
);

const TeacherProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.id && !user?.userID) return;
        const full = await getUserById(user.id || user.userID);
        setProfile(full);
      } catch (e) {
        console.error("Failed to load teacher profile", e);
        setError("Failed to load profile");
      }
    };
    load();
  }, [user]);

  const fullName = (() => {
    const first = profile?.FirstName || profile?.firstName || "";
    const last = profile?.LastName || profile?.lastName || "";
    const fallback = user?.username || profile?.Username || "";
    const name = `${first} ${last}`.trim();
    return name || fallback;
  })();

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <div className="p-8 text-center bg-gradient-to-r from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
          <div className="flex justify-center">
            <Avatar name={fullName} size="xl" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
            {fullName}
          </h2>
          <div className="mt-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Teacher
            </span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <InfoRow
            label="Username:"
            value={profile?.Username || user?.username}
          />
          <InfoRow
            label="Teacher ID:"
            value={profile?.EmployeeID || profile?.employeeID || ""}
          />
          <InfoRow
            label="Email:"
            value={profile?.Email || profile?.email || ""}
          />
          <InfoRow
            label="Phone:"
            value={profile?.Phone || profile?.PhoneNumber || ""}
          />
          <InfoRow label="Address:" value={profile?.Address || ""} />
          <InfoRow label="Department:" value={profile?.Department || ""} />
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;
