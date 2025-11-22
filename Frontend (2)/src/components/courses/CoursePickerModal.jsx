import { useEffect, useMemo, useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import CourseForm from "./CourseForm";
import {
  getAllCourses,
  getTeacherCourses,
  createCourse,
} from "../../services/courseService";

const CoursePickerModal = ({
  isOpen,
  onClose,
  initialSelected = [],
  onProceed,
  title = "Select Courses",
  description = "Choose one or more courses.",
  multiSelect = true,
  // allowCreate: when false, hide the + Add New Course button (useful for student enrollment)
  allowCreate = true,
  // excludedIds: array of course ids (string/number) to hide from the picker (remaining courses logic)
  excludedIds = [],
  // saving: when true, disable actions while the parent finalizes the choice
  saving = false,
  // proceedLabel: customize the primary button label for different flows
  proceedLabel = "Proceed",
  // errorMessage: optional text rendered below the helper description
  errorMessage = "",
  // courseFormDefaults: default values passed to CourseForm when creating a course inline
  courseFormDefaults = null,
  // When provided, only show courses for this teacher and when creating a new
  // course from the picker, attach the teacher id so the new course is scoped
  // to that teacher. Set `scopeToTeacher` to false when you want the picker to
  // show all existing courses (useful for assigning existing courses to a
  // newly-created teacher).
  teacherId = null,
  scopeToTeacher = true,
  // when true, hide existing course list and only show inline CourseForm for creating
  // a new course. After creation the picker will call `onProceed` with the created id.
  onlyCreate = false,
}) => {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourseIds, setSelectedCourseIds] = useState(
    (initialSelected || []).map((c) => String(c))
  );
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoadingCourses(true);

        // If this picker is only for creating a new course, skip loading
        // existing courses to save work and avoid showing the list.
        if (onlyCreate) {
          if (!mounted) return;
          setCourses([]);
          setLoadingCourses(false);
          return;
        }

        // Determine whether to scope to teacher courses or show all courses.
        // By default we prefer teacher-scoped courses when a teacherId is
        // provided, but callers can set `scopeToTeacher=false` to show all
        // courses (for example, when assigning existing system courses to a
        // newly-created teacher).
        const all =
          teacherId && scopeToTeacher
            ? await getTeacherCourses(teacherId)
            : await getAllCourses();

        if (!mounted) return;
        setCourses(all || []);
        setLoadingCourses(false);
      } catch (err) {
        console.error("Failed to load courses for picker", err);
        if (mounted) setLoadingCourses(false);
      }
    };

    if (isOpen) load();
    return () => {
      mounted = false;
    };
  }, [isOpen, teacherId, scopeToTeacher, onlyCreate]);

  useEffect(() => {
    setSelectedCourseIds((initialSelected || []).map((c) => String(c)));
  }, [initialSelected]);

  const filtered = useMemo(() => {
    const q = String(query || "")
      .toLowerCase()
      .trim();
    // compute base list by excluding any provided ids
    const excludeSet = new Set((excludedIds || []).map((id) => String(id)));
    const base = (courses || []).filter((c) => {
      const cid = String(c.id ?? c.CourseID ?? c.CourseId ?? c.courseId ?? "");
      return !excludeSet.has(cid);
    });

    if (!q) return base || [];
    return (base || []).filter((c) => {
      const name = (
        c.name ||
        c.CourseName ||
        c.title ||
        c.courseName ||
        ""
      ).toLowerCase();
      const desc = (c.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [courses, query]);

  const toggle = (cid) => {
    if (multiSelect) {
      setSelectedCourseIds((prev) =>
        prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
      );
    } else {
      setSelectedCourseIds((prev) => (prev.includes(cid) ? [] : [cid]));
    }
  };

  const clearSearch = () => setQuery("");

  const handleProceed = () => {
    if (saving) return;
    onProceed(selectedCourseIds);
  };

  // If this picker is used only to create a new course for a new teacher,
  // render CourseForm directly and short-circuit the normal list UI. After
  // successful creation call `onProceed` with the new course id and close.
  if (onlyCreate) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div className="space-y-4">
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
          <CourseForm
            onSubmit={async (data) => {
              try {
                const payload = teacherId
                  ? { ...data, TeacherID: teacherId, teacherId }
                  : data;
                const newCourse = await createCourse(payload);
                const newId = String(
                  newCourse.id ?? newCourse.CourseID ?? newCourse.CourseId ?? ""
                );
                // Inform parent immediately with the created course id
                try {
                  onProceed([newId]);
                } catch (e) {
                  // parent may expect async handling
                }
                onClose();
              } catch (err) {
                console.error(
                  "Failed to create course from picker (onlyCreate)",
                  err
                );
              }
            }}
            onCancel={onClose}
            initialData={courseFormDefaults || {}}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="relative">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses by name or description..."
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {query && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {description && (
              <p className="mt-2 text-xs text-gray-500">{description}</p>
            )}
            {errorMessage ? (
              <p className="mt-2 text-xs text-red-500">{errorMessage}</p>
            ) : null}
          </div>

          <div className="flex-shrink-0">
            <div className="text-right text-sm text-gray-600">
              <div className="font-medium text-gray-900 dark:text-gray-200">
                {selectedCourseIds.length}
              </div>
              <div className="text-xs text-gray-500">selected</div>
            </div>
          </div>
        </div>

        <div>
          {loadingCourses ? (
            <div className="py-6 text-center text-sm text-gray-500">
              Loading courses…
            </div>
          ) : filtered && filtered.length > 0 ? (
            <TableView
              items={filtered}
              selected={selectedCourseIds}
              onToggle={toggle}
            />
          ) : (
            <div className="py-6 text-center text-sm text-gray-500">
              No courses found. You can add a new course.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t dark:border-gray-700">
          <div>
            {allowCreate && (
              <Button
                variant="secondary"
                onClick={() => setShowCourseModal(true)}
                disabled={saving}
              >
                + Add New Course
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleProceed} disabled={saving}>
              {saving ? "Saving..." : proceedLabel}
            </Button>
          </div>
        </div>

        <Modal
          isOpen={showCourseModal}
          onClose={() => setShowCourseModal(false)}
          title="Add New Course"
        >
          <CourseForm
            onSubmit={async (data) => {
              try {
                const payload = teacherId
                  ? { ...data, TeacherID: teacherId, teacherId }
                  : data;
                const newCourse = await createCourse(payload);
                const newId = String(
                  newCourse.id ?? newCourse.CourseID ?? newCourse.CourseId ?? ""
                );
                setCourses((prev) => [newCourse, ...(prev || [])]);
                setSelectedCourseIds((prev) =>
                  Array.from(new Set([...(prev || []), newId]))
                );
                setShowCourseModal(false);
              } catch (err) {
                console.error("Failed to create course from picker", err);
              }
            }}
            onCancel={() => setShowCourseModal(false)}
            initialData={courseFormDefaults || {}}
          />
        </Modal>
      </div>
    </Modal>
  );
};

export default CoursePickerModal;

// --- Internal TableView component ---
const TableView = ({ items = [], selected = [], onToggle }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const pageCount = Math.max(1, Math.ceil(items.length / rowsPerPage));

  const paged = items.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  useEffect(() => {
    if (page >= pageCount) setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsPerPage, pageCount]);

  const handleChoose = (id) => {
    // toggle selection (kept name for compatibility)
    onToggle(id);
  };

  return (
    <div>
      <div className="overflow-hidden rounded-md border">
        <div className="bg-black text-white text-sm px-4 py-2 font-semibold">
          Course Name
        </div>
        <div>
          {paged.map((c) => {
            const cid = String(
              c.id ?? c.CourseID ?? c.CourseId ?? c.courseId ?? ""
            );
            const isSelected = selected.includes(cid);
            return (
              <div
                key={cid}
                className="flex items-center justify-between px-4 py-4 border-b bg-white dark:bg-gray-900"
              >
                <div className="text-sm text-gray-700 dark:text-gray-200">
                  {c.name || c.CourseName || c.title || c.courseName}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleChoose(cid)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      aria-label={`Select course ${
                        c.name || c.CourseName || c.title || c.courseName
                      }`}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {isSelected ? "Selected" : "Select"}
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          Rows per page:
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="ml-1 text-sm bg-white dark:bg-gray-800 border rounded px-2 py-1"
          >
            {[5, 10, 25].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          {page * rowsPerPage + 1}-
          {Math.min((page + 1) * rowsPerPage, items.length)} of {items.length}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
          >
            ◀
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
};
