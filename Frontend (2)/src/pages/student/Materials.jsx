import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getCourseDetails } from "../../services/courseService";
import {
  getCourseMaterials,
  getStudentMaterials,
} from "../../services/materialService";
import { getStudentCourses } from "../../services/courseService";
import MaterialList from "../../components/materials/MaterialList";
import Loader from "../../components/common/Loader";
import MaterialForm from "../../components/materials/MaterialForm";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import {
  ArrowUpTrayIcon,
  FunnelIcon,
  TrashIcon,
  PlusIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const StudentMaterials = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [groupedMaterials, setGroupedMaterials] = useState([]); // [{ course, materials: [] }]
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const [materialsData, courseData] = await Promise.all([
            getCourseMaterials(id),
            getCourseDetails(id),
          ]);
          setMaterials(materialsData);
          setCourse(courseData);
        } else {
          // No specific course id: load materials grouped by the logged-in student's courses
          const studentId =
            user?.StudentID ??
            user?.studentID ??
            user?.studentId ??
            user?.UserID ??
            user?.userID ??
            user?.userId ??
            user?.id ??
            null;

          if (studentId) {
            // Try to get enrolled courses first
            const courses = await getStudentCourses(studentId);

            if (Array.isArray(courses) && courses.length) {
              // Initialize grouped state to show skeletons and allow per-course loading
              setGroupedMaterials(
                courses.map((c) => ({
                  course: c,
                  materials: [],
                  loading: true,
                  expanded: false,
                }))
              );

              // Fetch materials per-course and update state as they resolve
              courses.forEach(async (c) => {
                try {
                  const mats = await getCourseMaterials(
                    c.id ?? c.CourseID ?? c.courseId
                  );
                  setGroupedMaterials((prev) =>
                    prev.map((g) =>
                      String(
                        g.course?.id ?? g.course?.CourseID ?? g.course?.courseId
                      ) === String(c.id ?? c.CourseID ?? c.courseId)
                        ? {
                            ...g,
                            materials: Array.isArray(mats) ? mats : [],
                            loading: false,
                          }
                        : g
                    )
                  );
                } catch (e) {
                  setGroupedMaterials((prev) =>
                    prev.map((g) =>
                      String(
                        g.course?.id ?? g.course?.CourseID ?? g.course?.courseId
                      ) === String(c.id ?? c.CourseID ?? c.courseId)
                        ? { ...g, materials: [], loading: false }
                        : g
                    )
                  );
                }
              });

              // Clear flat materials and course detail
              setMaterials([]);
              setCourse(null);
            } else {
              // Fallback: fetch student materials if courses cannot be determined
              const studentMats = await getStudentMaterials(studentId);
              setMaterials(Array.isArray(studentMats) ? studentMats : []);
              setGroupedMaterials([]);
              setCourse(null);
            }
          } else {
            setMaterials([]);
            setGroupedMaterials([]);
            setCourse(null);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handleMaterialSubmit = (newMaterial) => {
    setMaterials((prev) => [newMaterial, ...prev]);
    setShowUploadModal(false);
  };

  const handleFilterClick = () => {
    console.info("Filter action clicked - hook up filter logic here.");
    setFabOpen(false);
  };

  const handleBulkDelete = () => {
    console.info("Bulk delete action clicked - hook up delete logic here.");
    setFabOpen(false);
  };

  const ActionIconButton = ({
    icon: Icon,
    label,
    onClick,
    intent = "default",
  }) => {
    const baseStyles =
      "h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2";
    const palette = {
      default:
        "bg-white text-gray-700 hover:bg-gray-100 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
      primary:
        "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
      danger:
        "bg-white text-red-600 hover:bg-red-50 focus:ring-red-500 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700",
    };

    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={onClick}
        className={`${baseStyles} ${palette[intent] || palette.default}`}
      >
        <Icon className="h-6 w-6" />
      </button>
    );
  };

  if (loading) {
    return <Loader className="py-12" />;
  }

  // if (!id) {
  //   return (
  //     <div className="space-y-6">
  //       <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
  //         Study Materials
  //       </h1>
  //       <EmptyState
  //         title="Select a course"
  //         description="Please select a course to view study materials."
  //       />
  //     </div>
  //   )
  // }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-indigo-500 font-semibold">
          Study Hub
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {id
            ? `Materials for ${course?.name ?? "Selected Course"}`
            : "Your Study Materials"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Access shared resources, download attachments, and stay up to date.
        </p>
      </header>

      <section className="relative rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-6 py-8 sm:px-10 sm:py-12 shadow-sm transition">
        {id ? (
          materials.length > 0 ? (
            <MaterialList materials={materials} className="bg-transparent" />
          ) : (
            <EmptyState
              title="No Materials Available"
              description={
                "There are no study materials available for this course yet."
              }
            />
          )
        ) : groupedMaterials.length ? (
          // Render grouped materials by course (collapsible cards)
          <div className="space-y-6">
            {groupedMaterials.map(
              ({ course: c, materials: mats, loading, expanded }) => {
                const key =
                  c?.id ?? c?.CourseID ?? c?.courseId ?? Math.random();
                const courseTitle =
                  c?.name ?? c?.CourseName ?? "Untitled Course";
                const courseSubtitle =
                  c?.subject ||
                  c?.subjectDetails?.name ||
                  c?.code ||
                  "Course materials";
                const teacherName =
                  c?.teacher?.firstName || c?.teacher?.lastName
                    ? `${c?.teacher?.firstName ?? ""} ${
                        c?.teacher?.lastName ?? ""
                      }`.trim()
                    : null;

                return (
                  <div
                    key={key}
                    className="rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="px-4 py-3 sm:px-6 flex items-center justify-between">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {courseTitle}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {courseSubtitle}
                          {teacherName ? ` • ${teacherName}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {loading
                            ? "Loading…"
                            : `${mats.length} ${
                                mats.length === 1 ? "material" : "materials"
                              }`}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setGroupedMaterials((prev) =>
                              prev.map((g) =>
                                String(
                                  g.course?.id ??
                                    g.course?.CourseID ??
                                    g.course?.courseId
                                ) ===
                                String(c?.id ?? c?.CourseID ?? c?.courseId)
                                  ? { ...g, expanded: !g.expanded }
                                  : g
                              )
                            )
                          }
                          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-expanded={expanded}
                          aria-label={
                            expanded
                              ? `Collapse ${courseTitle}`
                              : `Expand ${courseTitle}`
                          }
                        >
                          <ChevronDownIcon
                            className={`h-5 w-5 transform transition-transform ${
                              expanded ? "rotate-180" : "rotate-0"
                            } text-gray-600 dark:text-gray-300`}
                          />
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="px-4 pb-4 sm:px-6">
                        {loading ? (
                          <div className="py-6 flex justify-center">
                            <Loader />
                          </div>
                        ) : (
                          <MaterialList materials={mats} compact={true} />
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        ) : materials.length > 0 ? (
          // Fallback: flat list of student materials
          <MaterialList materials={materials} className="bg-transparent" />
        ) : (
          <EmptyState
            title="No Materials Available"
            description={
              "There are no study materials available for your courses yet."
            }
          />
        )}

        {/* Students shouldn't upload materials; show FAB only when viewing a specific course */}
        {id && (
          <div className="absolute bottom-0 right-0 flex items-center">
            <div
              className={`flex items-center gap-3 mr-3 transition-all duration-200 ease-out transform origin-right ${
                fabOpen
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-4 pointer-events-none"
              }`}
            >
              <ActionIconButton
                icon={TrashIcon}
                label="Bulk delete materials"
                onClick={handleBulkDelete}
                intent="danger"
              />
              <ActionIconButton
                icon={ArrowUpTrayIcon}
                label="Upload new material"
                onClick={() => {
                  setShowUploadModal(true);
                  setFabOpen(false);
                }}
                intent="primary"
              />
              <ActionIconButton
                icon={FunnelIcon}
                label="Filter materials"
                onClick={handleFilterClick}
              />
            </div>

            <button
              type="button"
              aria-label={fabOpen ? "Close actions" : "Open actions"}
              onClick={() => setFabOpen((s) => !s)}
              className="h-14 w-14 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <PlusIcon
                className={`h-6 w-6 transform transition-transform ${
                  fabOpen ? "rotate-45" : "rotate-0"
                }`}
              />
            </button>
          </div>
        )}
      </section>

      {id && (
        <Modal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title="Upload Study Material"
        >
          <MaterialForm
            courseId={id}
            onSuccess={handleMaterialSubmit}
            onCancel={() => setShowUploadModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default StudentMaterials;
