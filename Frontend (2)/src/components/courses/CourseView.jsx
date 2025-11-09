import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getCourseDetails, updateCourse } from "../../services/courseService";
import { getCourseMaterials } from "../../services/materialService";
import { getCourseAttendance } from "../../services/attendanceService";
import { getUserById } from "../../services/userService";
import MaterialList from "../materials/MaterialList";
import AttendanceList from "../attendance/AttendanceList";
import Modal from "../common/Modal";
import CourseForm from "./CourseForm";
import MaterialForm from "../materials/MaterialForm";
import QRGenerator from "../attendance/QRGenerator";
import Loader from "../common/Loader";
import Button from "../common/Button";
import {
  createSubject,
  updateSubject,
  getAllSubjects,
} from "../../services/subjectService";

const CourseView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [teacher, setTeacher] = useState(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseData, materialsData, attendanceData] = await Promise.all([
          getCourseDetails(id),
          getCourseMaterials(id),
          getCourseAttendance(id),
        ]);
        setCourse(courseData);
        setMaterials(materialsData);
        setAttendance(attendanceData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    const teacherId = course?.teacherId;

    if (
      teacherId === undefined ||
      teacherId === null ||
      String(teacherId).trim() === ""
    ) {
      setTeacher(null);
      setTeacherError(null);
      return;
    }

    let isActive = true;

    const fetchTeacher = async () => {
      setTeacherLoading(true);
      setTeacherError(null);
      try {
        const data = await getUserById(teacherId);
        if (!isActive) return;
        setTeacher(data);
      } catch (error) {
        if (!isActive) return;
        console.error("Error fetching teacher details:", error);
        setTeacher(null);
        setTeacherError("Unable to load teacher information.");
      } finally {
        if (isActive) {
          setTeacherLoading(false);
        }
      }
    };

    fetchTeacher();

    return () => {
      isActive = false;
    };
  }, [course?.teacherId]);

  const handleMaterialSubmit = (newMaterial) => {
    setMaterials([newMaterial, ...materials]);
    setShowMaterialModal(false);
  };

  if (loading || !course) {
    return <Loader className="py-12" />;
  }

  const subjects = Array.isArray(course.subjects)
    ? course.subjects
    : course.subject
    ? [course.subject]
    : [];

  const formattedSubjects = subjects.join(", ");
  const courseTeacherId = course?.teacherId;
  const hasTeacherAssignment =
    courseTeacherId !== undefined &&
    courseTeacherId !== null &&
    String(courseTeacherId).trim() !== "";
  const teacherDisplayName = teacher
    ? [teacher.firstName, teacher.lastName].filter(Boolean).join(" ").trim() ||
      teacher.username ||
      teacher.email
    : "";
  const teacherProfileId =
    teacher?.userID ??
    teacher?.UserID ??
    teacher?.id ??
    teacher?.userId ??
    courseTeacherId ??
    null;
  const isAdmin = user?.userType === "admin";

  return (
    <div className="space-y-8">
      <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden rounded-2xl">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {course.name}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              {course.code}
              {formattedSubjects ? ` - ${formattedSubjects}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Edit
              </button>
            )}
            <span className="px-3 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800">
              Active
            </span>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-100 dark:sm:divide-gray-800">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Description
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {course.description}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Subjects Included
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {subjects.length ? (
                  <ul className="list-disc list-inside space-y-1">
                    {subjects.map((subjectName) => (
                      <li key={subjectName}>
                        <Link
                          to={`/subjects/${encodeURIComponent(subjectName)}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-700"
                        >
                          {subjectName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">
                    No subjects assigned yet.
                  </span>
                )}
                {/* Subjects can be managed in the Edit Course form (open Edit) */}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Assigned Teacher
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {teacherLoading ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    Fetching teacher information...
                  </span>
                ) : hasTeacherAssignment ? (
                  teacher ? (
                    <div className="space-y-1">
                      <p className="font-medium">
                        {isAdmin && teacherProfileId ? (
                          <Link
                            to={`/admin/users/${teacherProfileId}`}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {teacherDisplayName ||
                              `Teacher #${courseTeacherId}`}
                          </Link>
                        ) : (
                          teacherDisplayName || `Teacher #${courseTeacherId}`
                        )}
                      </p>
                      {teacher.email && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {teacher.email}
                        </p>
                      )}
                      {teacher.phone && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {teacher.phone}
                        </p>
                      )}
                    </div>
                  ) : teacherError ? (
                    <span className="text-red-500 dark:text-red-400">
                      {teacherError}
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">
                      Teacher record not available.
                    </span>
                  )
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">
                    No teacher assigned yet.
                  </span>
                )}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Academic Year
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {course.academicYear}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
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
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Attendance Records
        </h3>
        {user.userType === "teacher" && (
          <Button
            variant="primary"
            onClick={() => navigate(`/teacher/attendance/${id}`)}
          >
            Take Attendance
          </Button>
        )}
      </div>
      <AttendanceList attendance={attendance} />

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
      {/* Edit Course Modal (admin) */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit course — ${course.name}`}
        size="lg"
      >
        <CourseForm
          initialData={{
            name: course.name,
            code: course.code,
            description: course.description,
            academicYear: course.academicYear,
            subjectId: course.subjectId,
            subjects: Array.isArray(course.subjects)
              ? course.subjects
              : course.subject
              ? [course.subject]
              : [],
            teacherId: course.teacherId,
          }}
          onCancel={() => setShowEditModal(false)}
          loading={savingEdit}
          onSubmit={async (values) => {
            setSavingEdit(true);
            try {
              const subjectsList = Array.isArray(values.subjects)
                ? values.subjects
                : [];

              const courseIdValue = course?.id ?? course?.CourseID ?? id;
              const courseNameValue = course?.name ?? course?.CourseName ?? "";
              const courseCodeValue = course?.code ?? course?.CourseCode ?? "";

              const normalizeValue = (value) => String(value ?? "").trim();
              const normalizeKey = (value) =>
                normalizeValue(value).toLowerCase();

              const subjectsByName = new Map();
              const subjectsById = new Map();

              const registerSubjectLookup = (subject) => {
                if (!subject) return;
                const idCandidate =
                  subject?.id ??
                  subject?.SubjectID ??
                  subject?.subjectId ??
                  subject?.subjectID ??
                  null;
                const nameKey = normalizeKey(
                  subject?.name ??
                    subject?.subjectName ??
                    subject?.SubjectName ??
                    subject?.title ??
                    subject?.Title
                );
                if (idCandidate !== null && idCandidate !== undefined) {
                  const idKey = String(idCandidate);
                  if (!subjectsById.has(idKey)) {
                    subjectsById.set(idKey, subject);
                  }
                }
                if (nameKey && !subjectsByName.has(nameKey)) {
                  subjectsByName.set(nameKey, subject);
                }
              };

              try {
                const existingSubjects = await getAllSubjects();
                for (const entry of existingSubjects || []) {
                  registerSubjectLookup(entry);
                }
              } catch (lookupError) {
                console.warn(
                  "Unable to prefetch subjects before course update",
                  lookupError
                );
              }

              let primarySubjectId =
                values.subjectId ??
                values.SubjectID ??
                values.subjectID ??
                course?.subjectId ??
                course?.SubjectID ??
                null;

              for (const [index, subjectEntry] of subjectsList.entries()) {
                try {
                  const nameRaw =
                    typeof subjectEntry === "string"
                      ? subjectEntry
                      : subjectEntry?.name ??
                        subjectEntry?.subjectName ??
                        subjectEntry?.SubjectName ??
                        "";
                  const trimmedName = normalizeValue(nameRaw);
                  if (!trimmedName) continue;

                  let subjectId =
                    subjectEntry?.id ??
                    subjectEntry?.SubjectID ??
                    subjectEntry?.subjectId ??
                    subjectEntry?.subjectID ??
                    subjectEntry?.draft?.id ??
                    subjectEntry?.draft?.SubjectID ??
                    subjectEntry?.draft?.subjectId ??
                    null;

                  let subjectRecord = null;
                  if (subjectId !== null && subjectId !== undefined) {
                    subjectRecord =
                      subjectsById.get(String(subjectId)) ??
                      subjectEntry?.draft ??
                      null;
                  }

                  if (!subjectRecord) {
                    const match = subjectsByName.get(normalizeKey(trimmedName));
                    if (match) {
                      subjectRecord = match;
                      if (subjectId === null || subjectId === undefined) {
                        subjectId =
                          match?.id ??
                          match?.SubjectID ??
                          match?.subjectId ??
                          match?.subjectID ??
                          null;
                      }
                    }
                  }

                  const baseSource =
                    subjectRecord ?? subjectEntry?.draft ?? subjectEntry;

                  if (subjectId === null || subjectId === undefined) {
                    const creationPayload = {
                      name: trimmedName,
                      subjectName: trimmedName,
                    };
                    const codeCandidate =
                      baseSource?.subjectCode ??
                      baseSource?.SubjectCode ??
                      baseSource?.code ??
                      baseSource?.Code;
                    if (codeCandidate) {
                      creationPayload.subjectCode = codeCandidate;
                    }
                    const descriptionCandidate =
                      baseSource?.description ?? baseSource?.Description;
                    if (descriptionCandidate) {
                      creationPayload.description = descriptionCandidate;
                    }

                    const created = await createSubject(creationPayload);
                    subjectId =
                      created?.id ??
                      created?.SubjectID ??
                      created?.subjectId ??
                      created?.subjectID ??
                      null;
                    subjectRecord = {
                      ...creationPayload,
                      ...created,
                      id: subjectId,
                      name: created?.name ?? trimmedName,
                    };
                    registerSubjectLookup(subjectRecord);
                  }

                  if (subjectId !== null && subjectId !== undefined) {
                    const payload = {
                      name:
                        baseSource?.name ??
                        baseSource?.subjectName ??
                        baseSource?.SubjectName ??
                        trimmedName,
                      subjectName:
                        baseSource?.subjectName ??
                        baseSource?.SubjectName ??
                        baseSource?.name ??
                        trimmedName,
                      SubjectName:
                        baseSource?.subjectName ??
                        baseSource?.SubjectName ??
                        baseSource?.name ??
                        trimmedName,
                      subjectCode:
                        baseSource?.subjectCode ??
                        baseSource?.SubjectCode ??
                        baseSource?.code ??
                        baseSource?.Code ??
                        subjectRecord?.subjectCode ??
                        subjectRecord?.SubjectCode ??
                        subjectRecord?.code ??
                        subjectRecord?.Code,
                      SubjectCode:
                        baseSource?.subjectCode ??
                        baseSource?.SubjectCode ??
                        baseSource?.code ??
                        baseSource?.Code ??
                        subjectRecord?.subjectCode ??
                        subjectRecord?.SubjectCode ??
                        subjectRecord?.code ??
                        subjectRecord?.Code,
                      description:
                        baseSource?.description ??
                        baseSource?.Description ??
                        subjectRecord?.description ??
                        subjectRecord?.Description,
                      Description:
                        baseSource?.description ??
                        baseSource?.Description ??
                        subjectRecord?.description ??
                        subjectRecord?.Description,
                      courseId: courseIdValue,
                      CourseID: courseIdValue,
                      CourseId: courseIdValue,
                      courseName: courseNameValue,
                      CourseName: courseNameValue,
                      courseCode: courseCodeValue,
                      CourseCode: courseCodeValue,
                    };

                    await updateSubject(subjectId, payload);

                    registerSubjectLookup({
                      ...subjectRecord,
                      id: subjectId,
                      name: trimmedName,
                    });

                    if (index === 0 && !primarySubjectId) {
                      primarySubjectId = subjectId;
                    }
                  }
                } catch (innerErr) {
                  console.error(
                    "Failed to synchronise subject during course edit:",
                    innerErr
                  );
                }
              }

              const { subjects, ...courseValues } = values;
              if (primarySubjectId !== null && primarySubjectId !== undefined) {
                courseValues.subjectId = primarySubjectId;
                courseValues.SubjectID = primarySubjectId;
              }

              const updated = await updateCourse(id, courseValues);
              setCourse(updated);
              setShowEditModal(false);
            } catch (err) {
              console.error("Failed to update course:", err);
            } finally {
              setSavingEdit(false);
            }
          }}
        />
      </Modal>
    </div>
  );
};

export default CourseView;
