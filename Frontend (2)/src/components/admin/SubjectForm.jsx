import { useState } from "react";
import Button from "../common/Button";
import { getAllSubjects } from "../../services/subjectService";

const SubjectForm = ({
  onSubmit,
  onCancel,
  initial = {},
  loading = false,
  step,
}) => {
  // Accept both possible initial shapes: id or SubjectID
  const [subjectId] = useState(
    initial.id ?? initial.SubjectID ?? initial.subjectId ?? ""
  );
  const [name, setName] = useState(
    initial.name || initial.subjectName || initial.SubjectName || ""
  );
  const [subjectCode, setSubjectCode] = useState(
    initial.subjectCode || initial.SubjectCode || ""
  );
  const [description, setDescription] = useState(
    initial.description || initial.Description || ""
  );

  const [formError, setFormError] = useState("");
  const [checking, setChecking] = useState(false);
  const [subjectCodeError, setSubjectCodeError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubjectCodeError("");
    const trimmedName = name.trim();
    const trimmedCode = subjectCode.trim();
    const trimmedDescription = description.trim();

    // Validate both fields and show both errors at once if missing
    let hasError = false;
    if (!trimmedName) {
      setFormError("Subject name is required");
      hasError = true;
    }
    if (!trimmedCode) {
      setSubjectCodeError("Subject code is required");
      hasError = true;
    }
    if (hasError) return;

    // build payload including both common keys to improve backend compatibility
    const payload = {
      // include id when editing (cover multiple naming conventions)
      ...(subjectId
        ? {
            id: subjectId,
            SubjectID: subjectId,
            subjectId: subjectId,
          }
        : {}),
      name: trimmedName,
      subjectName: trimmedName,
      SubjectName: trimmedName,
      subjectCode: trimmedCode,
      SubjectCode: trimmedCode,
      description: trimmedDescription,
      Description: trimmedDescription,
      // include courseName if provided initially so duplicate checks can scope to a course
      ...(initial.courseName
        ? {
            courseName: initial.courseName,
            CourseName: initial.courseName,
          }
        : {}),
    };

    // Prevent adding the same subject to the same course
    setChecking(true);
    try {
      const subjects = await getAllSubjects();
      const lowerName = trimmedName.toLowerCase();
      const courseName = (initial.courseName || "")
        .toString()
        .trim()
        .toLowerCase();

      const lowerCode = trimmedCode.toLowerCase();
      const duplicate = subjects.find((s) => {
        const sName = (s.name || s.subjectName || "")
          .toString()
          .trim()
          .toLowerCase();
        const sCode = (s.code || s.subjectCode || "")
          .toString()
          .trim()
          .toLowerCase();
        const sCourse = (s.courseName || "").toString().trim().toLowerCase();
        // consider duplicate if name or code matches within same course scope (if provided)
        if (courseName) {
          return (
            (sName === lowerName && sCourse === courseName) ||
            (sCode && sCode === lowerCode && sCourse === courseName)
          );
        }
        return sName === lowerName || (sCode && sCode === lowerCode);
      });

      if (duplicate) {
        // allow edit of the same record (same id)
        const dupId =
          duplicate.id ?? duplicate.SubjectID ?? duplicate.subjectId ?? "";
        if (subjectId && String(dupId) === String(subjectId)) {
          // it's the same record; allow
        } else {
          // prefer a code-specific message if codes match
          const dupCode = (duplicate.code ?? duplicate.subjectCode ?? "")
            .toString()
            .trim()
            .toLowerCase();
          if (dupCode && dupCode === trimmedCode.toLowerCase()) {
            setFormError(
              courseName
                ? "A subject with this code already exists for the selected course."
                : "A subject with this code already exists."
            );
          } else {
            setFormError(
              courseName
                ? "This subject already exists for the selected course."
                : "A subject with this name already exists."
            );
          }
          setChecking(false);
          return;
        }
      }
    } catch (err) {
      // If subject list fetch fails, allow submission but warn in console
      console.warn("Could not validate duplicates from backend:", err);
    } finally {
      setChecking(false);
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {step ? (
        <div className="text-sm font-medium text-indigo-600">
          Step {step} of 2
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Subject Name <span className="text-red-500">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mathematics"
          className="mt-1 block w-full rounded-md dark:bg-gray-700 border-gray-300 p-2"
        />
        {formError ? (
          <p className="mt-1 text-sm text-red-600">{formError}</p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Subject Code <span className="text-red-500">*</span>
        </label>
        <input
          value={subjectCode}
          onChange={(e) => {
            setSubjectCode(e.target.value);
            setSubjectCodeError("");
          }}
          placeholder="e.g. MATH101"
          className="mt-1 block w-full rounded-md dark:bg-gray-700  border-gray-300 p-2"
        />
        {subjectCodeError ? (
          <p className="mt-1 text-sm text-red-600">{subjectCodeError}</p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md dark:bg-gray-700 border-gray-300 p-2"
          placeholder="Brief description (optional)"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading || checking}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading || checking}>
          {loading || checking ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
};

export default SubjectForm;
