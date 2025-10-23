import { useEffect, useState } from "react";
import {
  getAllSubjects,
  createSubject,
  deleteSubject,
  getSubjectById,
} from "../../services/subjectService";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Card from "../../components/common/Card";
import SubjectForm from "../../components/admin/SubjectForm";

const AdminSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewSubject, setViewSubject] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const all = await getAllSubjects();
      setSubjects(all || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (data) => {
    try {
      const created = await createSubject(data);
      setSubjects((s) => [created, ...(s || [])]);
      setShowAdd(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this subject?")) return;
    try {
      const ok = await deleteSubject(id);
      if (ok) setSubjects((s) => s.filter((x) => String(x.id) !== String(id)));
    } catch (err) {
      console.error(err);
    }
  };

  const openView = async (id) => {
    try {
      const details = await getSubjectById(id);
      setViewSubject(details);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Subjects</h1>
          <p className="text-sm text-gray-500">
            Manage subjects and link them to courses
          </p>
        </div>
        <div>
          <Button onClick={() => setShowAdd(true)} variant="primary">
            Add Subject
          </Button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Create subjects and assign them to courses so teachers and students can find them."
          action={
            <Button variant="primary" onClick={() => setShowAdd(true)}>
              Add Subject
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {s.name}
                  </h3>
                  {s.courseName && (
                    <div className="text-sm text-gray-500">
                      Course: {s.courseName}
                    </div>
                  )}
                  {s.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {s.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button variant="primary" onClick={() => openView(s.id)}>
                    View
                  </Button>
                  <Button variant="secondary" onClick={() => handleDelete(s.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Subject"
      >
        <SubjectForm
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal
        isOpen={!!viewSubject}
        onClose={() => setViewSubject(null)}
        title={viewSubject?.name || "Subject Details"}
      >
        {viewSubject ? (
          <div className="space-y-2">
            <div>
              <strong>Name:</strong> {viewSubject.name}
            </div>
            <div>
              <strong>Course:</strong> {viewSubject.courseName || "-"}
            </div>
            <div>
              <strong>Description:</strong> {viewSubject.description || "-"}
            </div>
          </div>
        ) : (
          <div>Loading...</div>
        )}
      </Modal>
    </div>
  );
};

export default AdminSubjects;
