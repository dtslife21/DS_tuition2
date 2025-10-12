import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCourseDetails,
  getCourseStudents,
} from "../../services/courseService";
import { getCourseMaterials } from "../../services/materialService";
import { getCourseAttendance } from "../../services/attendanceService";
import {
  getCourseComplaints,
  createComplaint,
  updateComplaint,
  deleteComplaint,
} from "../../services/complaintService";
import AttendanceList from "../attendance/AttendanceList";
import MaterialList from "../materials/MaterialList";
import MaterialForm from "../materials/MaterialForm";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Loader from "../common/Loader";
import EmptyState from "../common/EmptyState";
import UserCard from "../users/UserCard";
import QRGenerator from "../attendance/QRGenerator";
import ComplaintForm from "../complaints/ComplaintForm";

const Stat = ({
  label,
  value,
  color = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
}) => (
  <div className={`rounded-lg p-4 ${color}`}>
    <div className="text-sm opacity-80">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
);

export default function CourseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const courseId = String(id || "");
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [showMaterialModal, setShowMaterialModal] = useState(false);

  // Students table state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [viewUser, setViewUser] = useState(null);

  // Attendance QR modal
  const [showQR, setShowQR] = useState(false);
  const [qrStudent, setQrStudent] = useState(null);

  // Complaints state
  const [complaints, setComplaints] = useState([]);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    Promise.all([
      getCourseDetails(courseId),
      getCourseStudents(courseId),
      getCourseMaterials(courseId),
      getCourseAttendance(courseId),
      getCourseComplaints(courseId),
    ])
      .then(([c, s, m, a, comp]) => {
        if (!mounted) return;
        setCourse(c);
        setStudents(s || []);
        setMaterials(m || []);
        setAttendance(a || []);
        setComplaints(comp || []);
      })
      .catch((e) => {
        console.error(e);
        if (!mounted) return;
        setError("Failed to load course");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [courseId]);

  const totalSessions = attendance.length;
  const presentCount = useMemo(
    () => attendance.filter((r) => r.status === "Present").length,
    [attendance]
  );
  const absentCount = useMemo(
    () => attendance.filter((r) => r.status === "Absent").length,
    [attendance]
  );

  const pagedStudents = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return students.slice(start, start + rowsPerPage);
  }, [students, page, rowsPerPage]);

  const totalPages = Math.max(
    1,
    Math.ceil((students.length || 0) / rowsPerPage)
  );

  const handleOpenQR = (student) => {
    setQrStudent(student || null);
    setShowQR(true);
  };

  const handleCloseQR = () => {
    setQrStudent(null);
    setShowQR(false);
  };

  const handleEditComplaint = (c) => {
    setEditingComplaint(c);
    setShowComplaintModal(true);
  };

  const handleDeleteComplaint = async (complaintId) => {
    try {
      await deleteComplaint(complaintId);
      setComplaints((prev) =>
        prev.filter((x) => String(x.id) !== String(complaintId))
      );
    } catch (e) {
      console.error(e);
      alert("Failed to delete complaint");
    }
  };

  const handleSaveComplaint = async (data) => {
    try {
      if (editingComplaint) {
        const updated = await updateComplaint(editingComplaint.id, data);
        setComplaints((prev) =>
          prev.map((c) => (String(c.id) === String(updated.id) ? updated : c))
        );
      } else {
        const created = await createComplaint({ ...data, courseId: courseId });
        setComplaints((prev) => [created, ...prev]);
      }
      setShowComplaintModal(false);
      setEditingComplaint(null);
    } catch (e) {
      console.error(e);
      alert("Failed to save complaint");
    }
  };

  if (loading)
    return (
      <div className="p-6">
        <Loader />
      </div>
    );
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!course)
    return (
      <div className="p-6">
        <EmptyState title="Course not found" />
      </div>
    );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {course.name || course.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {course.description || "No description"}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Students" value={students.length} />
        <Stat
          label="Materials"
          value={materials.length}
          color="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        />
        <Stat
          label="Sessions"
          value={totalSessions}
          color="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        />
        <Stat
          label="Present/Absent"
          value={`${presentCount}/${absentCount}`}
          color="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
        />
      </div>

      {/* Students */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Students</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400">
              Rows:
            </label>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="border dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-800"
            >
              {[5, 10, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {pagedStudents.map((stu) => (
                <tr
                  key={stu.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-2">
                    {stu.firstName
                      ? `${stu.firstName} ${stu.lastName || ""}`.trim()
                      : stu.name}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                    {stu.email || "-"}
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    <Button size="sm" onClick={() => setViewUser(stu)}>
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenQR(stu)}
                    >
                      Take Attendance
                    </Button>
                  </td>
                </tr>
              ))}
              {pagedStudents.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-4 py-6">
                    <EmptyState title="No students" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Materials */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Materials</h2>
          {user?.userType === "teacher" && (
            <Button
              variant="primary"
              onClick={() => setShowMaterialModal(true)}
            >
              Add Material
            </Button>
          )}
        </div>
        <MaterialList materials={materials} onDownload={() => {}} />
        {materials.length === 0 && (
          <div className="pt-2">
            <EmptyState title="No materials yet" />
          </div>
        )}
      </div>

      {/* Attendance Records */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Attendance Records</h2>
          <Button onClick={() => handleOpenQR(null)}>Take Attendance</Button>
        </div>
        <AttendanceList attendance={attendance} students={students} />
        {attendance.length === 0 && (
          <div className="pt-2">
            <EmptyState title="No attendance records" />
          </div>
        )}
      </div>

      {/* Complaints */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Complaints</h2>
          {/* <Button
            onClick={() => {
              setEditingComplaint(null);
              setShowComplaintModal(true);
            }}
          >
            Add Complaint
          </Button> */}
        </div>
        {complaints.length === 0 ? (
          <EmptyState title="No complaints" />
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="border dark:border-gray-700 rounded p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{c.title || "Complaint"}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                      {c.message || c.description}
                    </div>
                    {c.studentId && (
                      <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                        By:{" "}
                        {students.find(
                          (s) => String(s.id) === String(c.studentId)
                        )?.firstName ||
                          students.find(
                            (s) => String(s.id) === String(c.studentId)
                          )?.name ||
                          "Unknown"}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEditComplaint(c)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteComplaint(c.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View User Modal */}
      <Modal
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
        title="Student Info"
      >
        {viewUser && <UserCard user={viewUser} />}
      </Modal>

      {/* QR Modal */}
      <Modal
        isOpen={showQR}
        onClose={handleCloseQR}
        title="Take Attendance via QR"
      >
        <div className="space-y-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {qrStudent
              ? `Generate/scan for ${
                  qrStudent.firstName
                    ? `${qrStudent.firstName} ${
                        qrStudent.lastName || ""
                      }`.trim()
                    : qrStudent.name
                }`
              : "Generate a QR for this course and let students scan to mark attendance."}
          </div>
          <QRGenerator courseId={courseId} />
        </div>
      </Modal>

      {/* Complaint Modal */}
      <Modal
        isOpen={showComplaintModal}
        onClose={() => {
          setShowComplaintModal(false);
          setEditingComplaint(null);
        }}
        title={editingComplaint ? "Edit Complaint" : "Add Complaint"}
      >
        <ComplaintForm
          initialData={editingComplaint || {}}
          onAdd={handleSaveComplaint}
          onCancel={() => {
            setShowComplaintModal(false);
            setEditingComplaint(null);
          }}
        />
      </Modal>

      {/* Add Material Modal */}
      <Modal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        title="Add Study Material"
      >
        <MaterialForm
          courseId={courseId}
          onSuccess={(newMaterial) => {
            setMaterials((prev) => [newMaterial, ...prev]);
            setShowMaterialModal(false);
          }}
          onCancel={() => setShowMaterialModal(false)}
        />
      </Modal>
    </div>
  );
}
