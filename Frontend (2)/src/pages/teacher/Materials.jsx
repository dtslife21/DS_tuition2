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

const TeacherMaterials = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalCourseId, setModalCourseId] = useState(null);
  const [coursesWithMaterials, setCoursesWithMaterials] = useState([]);

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
            const grouped = await Promise.all(
              (courses || []).map(async (c) => {
                const cid = c.id ?? c.CourseID ?? c.CourseId ?? c.courseId;
                const mats = cid ? await getCourseMaterials(cid) : [];
                return { course: c, materials: mats };
              })
            );
            setCoursesWithMaterials(grouped || []);
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
            return {
              ...entry,
              materials: [newMaterial, ...(entry.materials || [])],
            };
          }
          return entry;
        })
      );
    }
    setShowModal(false);
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
              coursesWithMaterials.map(({ course: c, materials: mats }) => {
                const cid = String(
                  c.id ?? c.CourseID ?? c.CourseId ?? c.courseId ?? ""
                );
                return (
                  <div
                    key={cid}
                    className="bg-gradient-to-br from-white to-indigo-50/70 dark:from-gray-900/70 dark:to-indigo-950/20 backdrop-blur shadow-lg ring-1 ring-indigo-100 dark:ring-indigo-800 rounded-2xl p-4 sm:p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {c.name || c.CourseName || `Course ${cid}`}
                      </h2>
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
                    <MaterialList materials={mats || []} />
                  </div>
                );
              })
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
