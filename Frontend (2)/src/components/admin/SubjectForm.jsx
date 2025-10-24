import { useState } from "react";
import Button from "../common/Button";

const SubjectForm = ({ onSubmit, onCancel, initial = {} }) => {
  // Accept both possible initial shapes: id or SubjectID
  const [subjectId] = useState(
    initial.id ?? initial.id ?? initial.SubjectID ?? initial.subjectId ?? ""
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    // build payload including both common keys to improve backend compatibility
    const payload = {
      // include id when editing
      ...(subjectId ? { id: subjectId } : {}),
      name: name.trim(),
      subjectName: name.trim(),
      subjectCode: subjectCode.trim(),
      description: description.trim(),
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {subjectId ? (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Subject ID
          </label>
          <input
            value={subjectId}
            readOnly
            className="mt-1 block w-full rounded-md border-gray-200 bg-gray-700 p-2 text-gray-700"
          />
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
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Subject Code
        </label>
        <input
          value={subjectCode}
          onChange={(e) => setSubjectCode(e.target.value)}
          placeholder="e.g. MATH101"
          className="mt-1 block w-full rounded-md dark:bg-gray-700  border-gray-300 p-2"
        />
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
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </div>
    </form>
  );
};

export default SubjectForm;
