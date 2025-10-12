import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getCourseDetails } from "../../services/courseService";
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
    setMaterials([newMaterial, ...materials]);
    setShowModal(false);
  };

  if (loading) {
    return <Loader className="py-12" />;
  }

  if (!id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Study Materials
        </h1>
        <EmptyState
          title="Select a course"
          description="Please select a course to view or upload materials."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Materials for {course?.name}
        </h1>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Add Material
        </Button>
      </div>

      <MaterialList materials={materials} />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Study Material"
      >
        <MaterialForm
          courseId={id}
          onSuccess={handleMaterialSubmit}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};

export default TeacherMaterials;
