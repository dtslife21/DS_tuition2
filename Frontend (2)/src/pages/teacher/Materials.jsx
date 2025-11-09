import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCourseDetails,
  getTeacherCourses,
} from "../../services/courseService";
import { getCourseMaterials } from "../../services/materialService";
import MaterialList from "../../components/materials/MaterialList";
import Modal from "../../components/common/Modal";
import MaterialForm from "../../components/materials/MaterialForm";
import EmptyState from "../../components/common/EmptyState";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

const TeacherMaterials = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalCourseId, setModalCourseId] = useState(null);
  const [coursesWithMaterials, setCoursesWithMaterials] = useState([]);
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [courseLoading, setCourseLoading] = useState({});

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
          // No specific course - load teacher's courses and their materials
          const teacherId =
            user?.TeacherID ??
            user?.teacherID ??
            user?.teacherId ??
            user?.UserID ??
            user?.userID ??
            user?.userId ??
            user?.id ??
            null;

          if (teacherId) {
            const courses = await getTeacherCourses(teacherId);

            // Do not eagerly load all materials - render collapsible cards and fetch per-course when expanded
            const grouped = (courses || []).map((c) => ({
              course: c,
              materials: null, // null means not loaded yet
              materialsCount: null, // will be populated with the count when available
            }));
            setCoursesWithMaterials(grouped || []);
            // Kick off lightweight count requests so headers can show material counts immediately
            (grouped || []).forEach(async (entry) => {
              const cid = String(
                entry.course.id ??
                  entry.course.CourseID ??
                  entry.course.CourseId ??
                  entry.course.courseId ??
                  ""
              );
              try {
                const mats = await getCourseMaterials(cid);
                setCoursesWithMaterials((prev) =>
                  prev.map((e) => {
                    const idStr = String(
                      e.course.id ??
                        e.course.CourseID ??
                        e.course.courseId ??
                        ""
                    );
                    if (idStr === cid) {
                      // Only set the count here; keep materials null so toggle still triggers detailed load
                      return {
                        ...e,
                        materialsCount: Array.isArray(mats) ? mats.length : 0,
                      };
                    }
                    return e;
                  })
                );
              } catch (err) {
                // ignore individual failures; count will remain null
                // console.debug(`Failed to fetch count for course ${cid}`, err);
              }
            });
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleMaterialSubmit = (newMaterial) => {
    if (id) {
      setMaterials([newMaterial, ...materials]);
    } else if (modalCourseId) {
      setCoursesWithMaterials((prev) =>
        prev.map((entry) => {
          const cid = String(
            entry.course.id ??
              entry.course.CourseID ??
              entry.course.CourseId ??
              entry.course.courseId ??
              ""
          );
          if (cid === String(modalCourseId)) {
            const prevCount =
              entry.materialsCount != null
                ? entry.materialsCount
                : Array.isArray(entry.materials)
                ? entry.materials.length
                : 0;
            return {
              ...entry,
              materials: [newMaterial, ...(entry.materials || [])],
              materialsCount: prevCount + 1,
            };
          }
          return entry;
        })
      );
    }
    setShowModal(false);
  };

  const toggleCourse = async (courseEntry) => {
    const cid = String(
      courseEntry.course.id ??
        courseEntry.course.CourseID ??
        courseEntry.course.CourseId ??
        courseEntry.course.courseId ??
        ""
    );

    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });

    // If materials not loaded yet, fetch them
    if (!courseEntry.materials || courseEntry.materials === null) {
      setCourseLoading((s) => ({ ...s, [cid]: true }));
      try {
        const mats = await getCourseMaterials(cid);
        setCoursesWithMaterials((prev) =>
          prev.map((entry) => {
            const idStr = String(
              entry.course.id ??
                entry.course.CourseID ??
                entry.course.courseId ??
                ""
            );
            if (idStr === cid) {
              return {
                ...entry,
                materials: Array.isArray(mats) ? mats : [],
                materialsCount: Array.isArray(mats) ? mats.length : 0,
              };
            }
            return entry;
          })
        );
      } catch (e) {
        console.error(`Failed to load materials for course ${cid}`, e);
      } finally {
        setCourseLoading((s) => ({ ...s, [cid]: false }));
      }
    }
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
  //         description="Please select a course to view or upload materials."
  //       />
  //     </div>
  //   )
  // }

  return (
    <div className="space-y-8">
      {id ? (
        <>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white border-l-4 border-indigo-500/60 dark:border-indigo-400/60 pl-3">
              Materials for {course?.name}
            </h1>
            <Button
              variant="primary"
              onClick={() => {
                setModalCourseId(id);
                setShowModal(true);
              }}
            >
              Upload Material
            </Button>
          </div>

          <div className="bg-gradient-to-br from-white to-indigo-50/70 dark:from-gray-900/70 dark:to-indigo-950/20 backdrop-blur shadow-lg ring-1 ring-indigo-100 dark:ring-indigo-800 rounded-2xl p-4 sm:p-6">
            <MaterialList materials={materials} />
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white border-l-4 border-indigo-500/60 dark:border-indigo-400/60 pl-3">
              Your Courses & Materials
            </h1>
          </div>

          <div className="space-y-6">
            {coursesWithMaterials && coursesWithMaterials.length ? (
              coursesWithMaterials.map(
                ({ course: c, materials: mats, materialsCount: count }) => {
                  const cid = String(
                    c.id ?? c.CourseID ?? c.CourseId ?? c.courseId ?? ""
                  );
                  const isExpanded = expandedCourses.has(cid);
                  const isLoading = Boolean(courseLoading[cid]);
                  return (
                    <div
                      key={cid}
                      className="bg-gradient-to-br from-white to-indigo-50/70 dark:from-gray-900/70 dark:to-indigo-950/20 backdrop-blur shadow-lg ring-1 ring-indigo-100 dark:ring-indigo-800 rounded-2xl p-4 sm:p-6"
                    >
                      <div className="flex items-start justify-between mb-4 gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            toggleCourse({ course: c, materials: mats })
                          }
                          className="flex items-center gap-3 text-left focus:outline-none"
                        >
                          <ChevronDownIcon
                            className={`h-5 w-5 text-indigo-600 transform transition-transform ${
                              isExpanded ? "-rotate-180" : "rotate-0"
                            }`}
                          />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {c.name || c.CourseName || `Course ${cid}`}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {c.subject ||
                                c.subjectDetails?.name ||
                                "Course materials"}
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-3">
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {count !== null && count !== undefined
                              ? `${count} material${count === 1 ? "" : "s"}`
                              : Array.isArray(mats)
                              ? `${mats.length} material${
                                  mats.length === 1 ? "" : "s"
                                }`
                              : "—"}
                          </div>
                          <Button
                            onClick={() => {
                              setModalCourseId(cid);
                              setShowModal(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white"
                          >
                            Upload for this course
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div>
                          {isLoading ? (
                            <div className="py-6">
                              <Loader />
                            </div>
                          ) : (
                            <MaterialList materials={mats || []} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )
            ) : (
              <EmptyState
                title="No courses found"
                description="You don't have any courses yet. Create a course to add materials."
              />
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setModalCourseId(null);
        }}
        title="Upload Study Material"
      >
        <MaterialForm
          courseId={modalCourseId}
          onSuccess={handleMaterialSubmit}
          onCancel={() => {
            setShowModal(false);
            setModalCourseId(null);
          }}
        />
      </Modal>
    </div>
  );
};

export default TeacherMaterials;
