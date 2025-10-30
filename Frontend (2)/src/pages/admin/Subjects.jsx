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
import CoursePickerModal from "../../components/courses/CoursePickerModal";
import { getCourseDetails } from "../../services/courseService";

const AdminSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewSubject, setViewSubject] = useState(null);
  const [editSubject, setEditSubject] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [subjectDraftData, setSubjectDraftData] = useState(null);
  const [subjectInProgress, setSubjectInProgress] = useState(null);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [linkingCourse, setLinkingCourse] = useState(false);
  const [courseStepError, setCourseStepError] = useState("");

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

  const handleSubjectDetailsSubmit = async (data) => {
    setCreatingSubject(true);
    try {
      const created = await createSubject(data);
      const createdId =
        created?.id ??
        created?.SubjectID ??
        created?.subjectId ??
        data?.id ??
        data?.SubjectID ??
        data?.subjectId ??
        null;

      const payloadWithIds = {
        ...data,
        ...(createdId !== null && createdId !== undefined
          ? {
              id: createdId,
              SubjectID: createdId,
              subjectId: createdId,
            }
          : {}),
      };

      setSubjectDraftData(payloadWithIds);
      setSubjectInProgress(created);
      setSelectedCourseIds([]);
      setCourseStepError("");
      setShowAdd(false);
      setShowCoursePicker(true);
    } catch (err) {
      console.error("AdminSubjects.create:", err);
    } finally {
      setCreatingSubject(false);
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

  const handleLinkCourse = async (selectedIds) => {
    if (!subjectInProgress) {
      setCourseStepError("Subject details are missing. Please start again.");
      return;
    }

    const normalizedSelection = Array.isArray(selectedIds)
      ? selectedIds.map((value) => String(value))
      : [String(selectedIds || "")];

    const chosenId = normalizedSelection.find((value) => value.trim().length);
    if (!chosenId) {
      setSelectedCourseIds([]);
      setCourseStepError("Select a course or add a new one to continue.");
      return;
    }

    setSelectedCourseIds(normalizedSelection);
    setCourseStepError("");
    setLinkingCourse(true);

    try {
      let courseDetails = null;
      try {
        courseDetails = await getCourseDetails(chosenId);
      } catch (courseErr) {
        console.warn("AdminSubjects.linkCourse:getCourseDetails", courseErr);
      }

      const courseIdValue =
        courseDetails?.id ??
        courseDetails?.CourseID ??
        courseDetails?.courseId ??
        chosenId;
      const courseNameValue =
        courseDetails?.name ??
        courseDetails?.courseName ??
        courseDetails?.CourseName ??
        "";
      const courseCodeValue =
        courseDetails?.code ??
        courseDetails?.courseCode ??
        courseDetails?.CourseCode ??
        "";

      const subjectIdValue =
        subjectInProgress?.id ??
        subjectDraftData?.id ??
        subjectDraftData?.SubjectID ??
        subjectDraftData?.subjectId ??
        null;

      if (subjectIdValue === null || subjectIdValue === undefined) {
        setLinkingCourse(false);
        setCourseStepError(
          "Subject could not be saved. Please try adding it again."
        );
        return;
      }

      const updatePayload = {
        ...(subjectDraftData || {}),
        id: subjectIdValue,
        SubjectID: subjectIdValue,
        subjectId: subjectIdValue,
        name:
          subjectDraftData?.name ??
          subjectDraftData?.subjectName ??
          subjectInProgress?.name ??
          "",
        subjectName:
          subjectDraftData?.subjectName ??
          subjectDraftData?.name ??
          subjectInProgress?.name ??
          "",
        SubjectName:
          subjectDraftData?.SubjectName ??
          subjectDraftData?.subjectName ??
          subjectDraftData?.name ??
          subjectInProgress?.name ??
          "",
        subjectCode:
          subjectDraftData?.subjectCode ??
          subjectDraftData?.SubjectCode ??
          subjectInProgress?.subjectCode ??
          "",
        SubjectCode:
          subjectDraftData?.SubjectCode ??
          subjectDraftData?.subjectCode ??
          subjectInProgress?.subjectCode ??
          "",
        description:
          subjectDraftData?.description ??
          subjectDraftData?.Description ??
          subjectInProgress?.description ??
          "",
        Description:
          subjectDraftData?.Description ??
          subjectDraftData?.description ??
          subjectInProgress?.description ??
          "",
        courseId: courseIdValue,
        CourseID: courseIdValue,
        CourseId: courseIdValue,
        courseID: courseIdValue,
        courseName: courseNameValue,
        CourseName: courseNameValue,
        courseCode: courseCodeValue,
        CourseCode: courseCodeValue,
      };

      const updated = await updateSubject(subjectIdValue, updatePayload);
      const normalized = {
        ...updated,
        courseName: updated?.courseName ?? courseNameValue,
      };

      setSubjects((list) => {
        const filtered = (list || []).filter(
          (s) =>
            String(s.id ?? s.SubjectID ?? s.subjectId ?? "") !==
            String(subjectIdValue ?? "")
        );
        return [normalized, ...filtered];
      });

      setShowCoursePicker(false);
      setSubjectInProgress(null);
      setSubjectDraftData(null);
      setSelectedCourseIds([]);
      setCourseStepError("");
    } catch (err) {
      console.error("AdminSubjects.linkCourse:", err);
      setCourseStepError(
        "Unable to link the subject to the course. Please try again."
      );
    } finally {
      setLinkingCourse(false);
    }
  };

  const handleCoursePickerClose = async () => {
    if (linkingCourse) return;
    setShowCoursePicker(false);
    if (subjectInProgress?.id) {
      try {
        await deleteSubject(subjectInProgress.id);
      } catch (err) {
        console.warn("AdminSubjects.cancelNewSubject:", err);
      }
    }
    setSubjectInProgress(null);
    setSubjectDraftData(null);
    setSelectedCourseIds([]);
    setCourseStepError("");
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

  const courseFormSubjectId =
    subjectInProgress?.id ??
    subjectDraftData?.id ??
    subjectDraftData?.SubjectID ??
    subjectDraftData?.subjectId ??
    "";

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
          <Button
            onClick={() => {
              setSubjectDraftData(null);
              setSubjectInProgress(null);
              setSelectedCourseIds([]);
              setCourseStepError("");
              setShowCoursePicker(false);
              setShowAdd(true);
            }}
            variant="primary"
          >
            Add Subject
          </Button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Create subjects and assign them to courses so teachers and students can find them."
          action={
            <Button
              variant="primary"
              onClick={() => {
                setSubjectDraftData(null);
                setSubjectInProgress(null);
                setSelectedCourseIds([]);
                setCourseStepError("");
                setShowCoursePicker(false);
                setShowAdd(true);
              }}
            >
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
        onClose={() => {
          if (creatingSubject) return;
          setShowAdd(false);
          setSubjectDraftData(null);
        }}
        title="Step 1 of 2 — Add Subject"
      >
        <SubjectForm
          step={1}
          onSubmit={handleSubjectDetailsSubmit}
          onCancel={() => {
            if (creatingSubject) return;
            setShowAdd(false);
            setSubjectDraftData(null);
          }}
          loading={creatingSubject}
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

      <CoursePickerModal
        isOpen={showCoursePicker}
        onClose={handleCoursePickerClose}
        initialSelected={selectedCourseIds}
        onProceed={handleLinkCourse}
        title="Step 2 of 2 — Assign Course"
        description="Select an existing course to link with this subject or add a new one."
        multiSelect={false}
        saving={linkingCourse}
        proceedLabel="Link Course"
        errorMessage={courseStepError}
        courseFormDefaults={
          courseFormSubjectId
            ? { subjectId: String(courseFormSubjectId) }
            : { subjectId: "" }
        }
      />
    </div>
  );
};

export default AdminSubjects;
