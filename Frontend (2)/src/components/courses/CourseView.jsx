import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getCourseDetails } from "../../services/courseService";
import { getCourseMaterials } from "../../services/materialService";
import { getCourseAttendance } from "../../services/attendanceService";
import MaterialList from "../materials/MaterialList";
import AttendanceList from "../attendance/AttendanceList";
import Modal from "../common/Modal";
import MaterialForm from "../materials/MaterialForm";
import QRGenerator from "../attendance/QRGenerator";
import Loader from "../common/Loader";
import Button from "../common/Button";
import { useEffect } from "react";
import UserCard from "../users/UserCard";
import Toast from "../common/Toast";

const CourseView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [toast, setToast] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseData, materialsData, attendanceData, studentsData] =
          await Promise.all([
            getCourseDetails(id),
            getCourseMaterials(id),
            getCourseAttendance(id),
            // lazy import service to avoid circulars
            (
              await import("../../services/courseService")
            ).getCourseStudents(id),
          ]);

        setCourse(courseData);
        setMaterials(materialsData);
        setAttendance(attendanceData);
        setStudents(studentsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleMaterialSubmit = (newMaterial) => {
    setMaterials([newMaterial, ...materials]);
    setShowMaterialModal(false);
  };

  const today = new Date().toISOString().slice(0, 10);

  // From the students list, follow the same flow as Attendance Records: open the QR generator
  const handleTakeAttendance = () => {
    setShowQRModal(true)
  }

  const openStudent = (s) => {
    setSelectedStudent(s);
    setShowStudentModal(true);
  };

  if (loading || !course) {
    return <Loader className="py-12" />;
  }

  const todaysCount = attendance.filter((a) => a.date === today).length;
  const totalCount = attendance.length;

  // pagination
  const totalStudents = students.length;
  const totalPages = Math.max(1, Math.ceil(totalStudents / rowsPerPage));
  const currentPage = Math.min(page, totalPages - 1);
  const startIndex = currentPage * rowsPerPage;
  const pagedStudents = students.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="space-y-6">
      {/* Attendance statistics banner */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded shadow p-6">
        <h3 className="text-xl font-semibold">Attendance Statistics</h3>
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div className="bg-blue-400 bg-opacity-30 rounded p-6 text-center">
            <div className="text-4xl font-bold">{todaysCount}</div>
            <div className="mt-2 text-sm">Today's Attendance</div>
            <div className="text-xs mt-1">
              {new Date().toLocaleDateString()}
            </div>
          </div>
          <div className="bg-blue-400 bg-opacity-30 rounded p-6 text-center">
            <div className="text-4xl font-bold">{totalCount}</div>
            <div className="mt-2 text-sm">Total Attendance</div>
            <div className="text-xs mt-1">All Time</div>
          </div>
        </div>
      </div>

      <h2 className="text-3xl font-bold text-center text-blue-600">
        Class Details
      </h2>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Students List
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-black text-white dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Student Number
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {pagedStudents.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                    {s.rollNumber || s.rollNo || s.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openStudent(s)}
                        className="bg-indigo-800 text-white px-4 py-2 rounded"
                      >
                        VIEW
                      </button>
                      <button
                        onClick={() => handleTakeAttendance()}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                      >
                        TAKE ATTENDANCE
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap justify-end items-center text-sm text-gray-500 dark:text-gray-400 gap-3">
          <label className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              className="border rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </label>
          <div>
            {startIndex + 1}–{Math.min(startIndex + rowsPerPage, totalStudents)}{" "}
            of {totalStudents}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 border rounded disabled:opacity-50 dark:border-gray-700"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              aria-label="Previous page"
            >
              ‹
            </button>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50 dark:border-gray-700"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Keep materials and attendance sections below */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Study Materials
        </h3>
        {user.userType === "teacher" && (
          <Button variant="primary" onClick={() => setShowMaterialModal(true)}>
            Upload Material
          </Button>
        )}
      </div>
      <MaterialList materials={materials} />

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Attendance Records
        </h3>
        {user.userType === "teacher" && (
          <Button variant="primary" onClick={() => setShowQRModal(true)}>
            Take Attendance
          </Button>
        )}
      </div>
  <AttendanceList attendance={attendance} students={students} />

      <Modal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        title="Upload Study Material"
      >
        <MaterialForm
          courseId={id}
          onSuccess={handleMaterialSubmit}
          onCancel={() => setShowMaterialModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Generate QR Code for Attendance"
        size="lg"
      >
        <QRGenerator courseId={id} />
      </Modal>

      {/* Student view modal */}
      <Modal
        isOpen={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        title="Student Details"
      >
        {selectedStudent && <UserCard user={selectedStudent} />}
      </Modal>

      {/* Toast */}
      <Toast message={toast} onClose={() => setToast("")} type="success" />
    </div>
  );
};

export default CourseView;
