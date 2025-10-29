import { useEffect, useState } from "react";
import {
  getAllSubjects,
  createSubject,
  deleteSubject,
  getSubjectById,
  updateSubject,
} from "../../services/subjectService";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Card from "../../components/common/Card";
import SubjectForm from "../../components/admin/SubjectForm";
import Loader from "../../components/common/Loader";

const AdminSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewSubject, setViewSubject] = useState(null);
  const [editSubject, setEditSubject] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const all = await getAllSubjects();
      setSubjects(all || []);
    } catch (err) {
      console.error("AdminSubjects.load:", err);
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
      console.error("AdminSubjects.create:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this subject?")) return;
    try {
      const ok = await deleteSubject(id);
      if (ok) setSubjects((s) => s.filter((x) => String(x.id) !== String(id)));
    } catch (err) {
      console.error("AdminSubjects.delete:", err);
    }
  };

  // Open edit modal. Accept either the subject object or an id.
  const openEdit = async (idOrSubject) => {
    const subject = typeof idOrSubject === "object" ? idOrSubject : null;
    const id = subject ? subject.id : idOrSubject;

    // If no id available, use the subject object if provided and skip backend fetch
    if (id === null || id === undefined || String(id).trim() === "") {
      setEditSubject(subject || { id });
      return;
    }

    try {
      // try to fetch canonical record from backend
      const details = await getSubjectById(id);
      setEditSubject(details || subject || { id });
    } catch (err) {
      console.error("AdminSubjects.openEdit:", err);
      setEditSubject(subject || { id });
    }
  };

  const handleUpdate = async (data) => {
    try {
      const id = data.id ?? editSubject?.id;
      if (!id) throw new Error("Missing subject id");
      const updated = await updateSubject(id, data);
      setSubjects((list) =>
        (list || []).map((s) =>
          String(s.id) === String(id) ? { ...s, ...updated } : s
        )
      );
      setEditSubject(null);
    } catch (err) {
      console.error("AdminSubjects.update:", err);
    }
  };

  // Open view modal. Accept the subject object from the list and only call backend when id looks valid.
  const openView = async (subject) => {
    if (!subject) return;

    // show immediate list data
    setViewSubject(subject);

    const id = subject.id;
    if (id === null || id === undefined || String(id).trim() === "") {
      console.debug(
        "AdminSubjects.openView: skipping backend fetch for empty id",
        subject
      );
      return;
    }

    try {
      setViewLoading(true);
      const details = await getSubjectById(id);
      if (details) setViewSubject(details);
    } catch (err) {
      console.error("AdminSubjects.openView:", err);
    } finally {
      setViewLoading(false);
    }
  };

  if (loading) return (<Loader size="md" className="py-2" />);

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
            <Card
              key={s.id}
              className="p-4 cursor-pointer hover:shadow-lg"
              onClick={() => openView(s)}
            >
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
                  <Button
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(s);
                    }}
                  >
                    Edit
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(s.id);
                    }}
                  >
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
              <strong>ID:</strong> {viewSubject.id ?? "-"}
            </div>
            <div>
              <strong>Code:</strong> {viewSubject.subjectCode ?? "-"}
            </div>
            <div>
              <strong>Name:</strong> {viewSubject.name}
            </div>
            <div>
              <strong>Course:</strong> {viewSubject.courseName ?? "-"}
            </div>
            <div>
              <strong>Description:</strong> {viewSubject.description ?? "-"}
            </div>
            
          </div>
        ) : (
          viewLoading && <Loader size="sm" className="py-2" />
        )}
      </Modal>

      <Modal
        isOpen={!!editSubject}
        onClose={() => setEditSubject(null)}
        title={`Edit Subject`}
      >
        {editSubject ? (
          <SubjectForm
            initial={editSubject}
            onSubmit={handleUpdate}
            onCancel={() => setEditSubject(null)}
          />
        ) : (
          viewLoading && <Loader size="sm" className="py-2" />
        )}
      </Modal>
    </div>
  );
};

export default AdminSubjects;
