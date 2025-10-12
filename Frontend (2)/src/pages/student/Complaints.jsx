import { useEffect, useState } from "react";
import ComplaintForm from "../../components/complaints/ComplaintForm";
import { getAllCourses } from "../../services/courseService";
import { createComplaint } from "../../services/complaintService";
import { useAuth } from "../../contexts/AuthContext";

const StudentComplaints = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const list = await getAllCourses();
      setCourses(list);
      // Do not auto-select a course; require explicit student selection
    })();
  }, []);

  const handleAdd = async (payload) => {
    if (!courseId) {
      setError("Please select a course before submitting your complaint.");
      return;
    }
    setError("");
    await createComplaint({
      courseId: Number(courseId),
      studentId: user.id,
      date: payload.date,
      message: payload.message,
    });
    alert("Complaint submitted");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Complaints
      </h1>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Course <span className="text-red-500">*</span>
        </label>
        <select
          className={`mt-1 block w-full rounded-md border shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            error ? "border-red-500" : "border-gray-300"
          }`}
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            if (e.target.value) setError("");
          }}
          required
        >
          <option value="" disabled>
            Select a course
          </option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <ComplaintForm onAdd={handleAdd} />
    </div>
  );
};

export default StudentComplaints;
