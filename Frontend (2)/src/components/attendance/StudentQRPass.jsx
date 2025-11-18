import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "../../contexts/AuthContext";
import { getStudentCourses } from "../../services/courseService";
import { collectCourseIdsForStudent } from "../../utils/helpers";

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

  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      if (!studentId) {
        if (!cancelled) {
          setQrImage("");
          setError("Missing student identifier. Contact support.");
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setIsLoading(true);
        setError("");
      }

      try {
        let courses = [];

        try {
          const fetched = await getStudentCourses(studentId);
          courses = Array.isArray(fetched) ? fetched : [];
        } catch (fetchError) {
          console.error("Failed to load courses for student QR", fetchError);
        }

        const courseIds = collectCourseIdsForStudent(courses, courseId);

        const payload = {
          studentId: String(studentId),
          courseIds,
        };

        const data = await QRCode.toDataURL(JSON.stringify(payload));

        if (!cancelled) {
          setQrImage(data);
          setError("");
        }
      } catch (e) {
        console.error("Failed to build student QR", e);
        if (!cancelled) {
          setQrImage("");
          setError(
            "Unable to create your QR code. Please refresh and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [courseId, studentId]);

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
