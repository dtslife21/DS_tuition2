import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getCourseDetails } from "../../services/courseService";
import { getCourseMaterials } from "../../services/materialService";
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
} from "@heroicons/react/24/outline";

const USE_MOCK_DATA = true;

const mockCourse = {
  id: "mock-course-1",
  name: "Advanced Algebra",
  description:
    "Deep dive into algebraic structures, equations, and problem-solving techniques.",
};


const StudentMaterials = () => {
  const { id } = useParams();
  const [materials, setMaterials] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (USE_MOCK_DATA) {
          setMaterials(mockMaterials);
          setCourse(mockCourse);
          return;
        }

        if (id) {
          const [materialsData, courseData] = await Promise.all([
            getCourseMaterials(id),
            getCourseDetails(id),
          ]);
          setMaterials(materialsData);
          setCourse(courseData);
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
          Materials for {course?.name}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Access shared resources, download attachments, and stay up to date.
        </p>
      </header>

      <section className="relative rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-6 py-8 sm:px-10 sm:py-12 shadow-sm transition">
        {materials.length > 0 ? (
          <MaterialList materials={materials} className="bg-transparent" />
        ) : (
          <EmptyState
            title="No Materials Available"
            description="There are no study materials available at this time. Upload an attachment to get started."
          />
        )}

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
      </section>

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Study Material"
      >
        <MaterialForm
          courseId={id || mockCourse.id}
          onSuccess={handleMaterialSubmit}
          onCancel={() => setShowUploadModal(false)}
        />
      </Modal>
    </div>
  );
};

export default StudentMaterials;
