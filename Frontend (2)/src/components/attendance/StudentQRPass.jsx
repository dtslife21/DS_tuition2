import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "../../contexts/AuthContext";

const StudentQRPass = ({ courseId }) => {
  const { user } = useAuth();
  const [qrImage, setQrImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
      ""
    );
  }, [user]);

  const studentName = useMemo(() => {
    const first =
      user?.firstName ??
      user?.FirstName ??
      user?.givenName ??
      user?.GivenName ??
      "";
    const last =
      user?.lastName ??
      user?.LastName ??
      user?.familyName ??
      user?.FamilyName ??
      "";
    const combined = `${first} ${last}`.trim();

    if (combined.length) {
      return combined;
    }

    return user?.username ?? user?.Username ?? user?.email ?? "";
  }, [user]);

  useEffect(() => {
    const generate = async () => {
      if (!studentId) {
        setQrImage("");
        setError("Missing student identifier. Contact support.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const payload = {
          type: "student-attendance",
          studentId: String(studentId),
          courseId: courseId ? String(courseId) : null,
          code: `STD-${studentId}-${courseId ?? "ALL"}`,
          name: studentName,
          version: 1,
        };

        const data = await QRCode.toDataURL(JSON.stringify(payload));
        setQrImage(data);
      } catch (e) {
        console.error("Failed to build student QR", e);
        setQrImage("");
        setError(
          "Unable to create your QR code. Please refresh and try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    generate();
  }, [courseId, studentId, studentName]);

  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        Your Attendance QR Code
      </h3>

      {isLoading && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Preparing your unique code...
        </div>
      )}

      {!isLoading && error && (
        <div className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      )}

      {!isLoading && !error && qrImage && (
        <>
          <div className="p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <img
              src={qrImage}
              alt="Student attendance QR"
              className="w-48 h-48"
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Show this code to your teacher&apos;s scanner to mark attendance.
          </p>
          <a
            href={qrImage}
            download={`student-${studentId || "qr"}.png`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md shadow text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Download QR Code
          </a>
        </>
      )}
    </div>
  );
};

export default StudentQRPass;
