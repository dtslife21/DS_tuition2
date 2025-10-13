import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../../components/common/Avatar";
import QRCode from "qrcode";
import Button from "../../components/common/Button";
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

const StudentProfile = () => {
  const { user } = useAuth();
  const [qrImage, setQrImage] = useState("");
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let mounted = true;
    const generate = async () => {
      try {
        // Create a QR payload that identifies the student. Adjust format as needed.
        const payload = JSON.stringify({ type: "student", id: user?.id });
        const dataUrl = await QRCode.toDataURL(payload);
        if (mounted) setQrImage(dataUrl);
      } catch (err) {
        console.error("Failed to generate QR", err);
      }
    };
    if (user) generate();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id && !user?.userID) return;
      setLoadingProfile(true);
      setProfileError("");
      try {
        const full = await getUserById(user.id || user.userID);
        setProfile(full);
      } catch (e) {
        console.error("Failed to load user profile", e);
        setProfileError("Failed to load profile");
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [user]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <div className="p-8 text-center bg-gradient-to-r from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
          <div className="flex justify-center">
            <Avatar
              name={(() => {
                const first =
                  profile?.FirstName ||
                  profile?.firstName ||
                  user.firstName ||
                  "";
                const last =
                  profile?.LastName || profile?.lastName || user.lastName || "";
                const full = `${first} ${last}`.trim();
                return full || profile?.Username || user.username || "";
              })()}
              size="xl"
            />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
            {(() => {
              const first =
                profile?.FirstName ||
                profile?.firstName ||
                user.firstName ||
                "";
              const last =
                profile?.LastName || profile?.lastName || user.lastName || "";
              const full = `${first} ${last}`.trim();
              return full || profile?.Username || user.username || "";
            })()}
          </h2>
          <div className="mt-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {user?.userType
                ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1)
                : profile?.UserTypeName || ""}
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-md">
              {qrImage ? (
                <img src={qrImage} alt="QR Code" className="w-56 h-56" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-sm text-gray-500">
                  Generating QR...
                </div>
              )}
            </div>
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={() => {
                  if (!qrImage) return;
                  const a = document.createElement("a");
                  a.href = qrImage;
                  a.download = `${user?.firstName || "student"}_${
                    user?.lastName || "profile"
                  }_qr.png`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }}
              >
                Download QR Code
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {profileError && (
            <div className="text-sm text-red-600">{profileError}</div>
          )}
          <InfoRow
            label="Username:"
            value={profile?.Username || user.username}
          />
          <InfoRow
            label="Student No:"
            value={
              profile?.RollNumber || profile?.rollNumber || user.rollNumber
            }
          />
          <InfoRow
            label="Class:"
            value={
              profile?.Class ||
              profile?.ClassName ||
              profile?.Grade ||
              user.className ||
              user.grade ||
              ""
            }
          />
          <InfoRow
            label="School:"
            value={profile?.School || user.school || ""}
          />
          <InfoRow
            label="Address:"
            value={profile?.Address || user.address || ""}
          />
          <InfoRow
            label="Phone:"
            value={
              profile?.Phone ||
              profile?.PhoneNumber ||
              profile?.Mobile ||
              user.phone ||
              user.mobile ||
              ""
            }
          />
          <InfoRow
            label="Emergency Contact:"
            value={
              profile?.EmergencyContact ||
              profile?.EmergencyPhone ||
              user.emergencyContact ||
              ""
            }
          />
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
