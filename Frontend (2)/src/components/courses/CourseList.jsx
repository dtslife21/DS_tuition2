import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../common/EmptyState";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A to Z" },
  { value: "name-desc", label: "Name Z to A" },
];

const parseTimestamp = (value) => {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (value > 1e12) return value; // already in milliseconds
    if (value > 1e9) return value * 1000; // likely in seconds
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return parsed;

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      if (numeric > 1e12) return numeric;
      if (numeric > 1e9) return numeric * 1000;
      return numeric;
    }
  }

  return null;
};

const resolveCourseTimestamp = (course) => {
  if (!course) return 0;

  const candidates = [
    course.createdTimestamp,
    course.createdAt,
    course.CreatedAt,
    course.created_at,
    course.createdOn,
    course.CreatedOn,
    course.creationDate,
    course.CreationDate,
    course.dateCreated,
    course.DateCreated,
    course.updatedAt,
    course.UpdatedAt,
  ];

  for (const candidate of candidates) {
    const parsed = parseTimestamp(candidate);
    if (parsed !== null) return parsed;
  }

  const idCandidate =
    course.id ?? course.CourseID ?? course.courseId ?? course.CourseId ?? null;

  const parsedId = parseTimestamp(idCandidate);
  if (parsedId !== null) return parsedId;

  return 0;
};

const CourseList = ({
  courses = [],
  basePath = "/teacher/courses",
  emptyState,
  defaultSort = "newest",
}) => {
  const [sortOrder, setSortOrder] = useState(defaultSort);

  const sortedCourses = useMemo(() => {
    if (!Array.isArray(courses)) return [];

    const decorated = courses.map((course, index) => ({
      course,
      index,
      timestamp: resolveCourseTimestamp(course),
      name: String(
        course?.name ?? course?.courseName ?? course?.CourseName ?? ""
      ),
    }));

    const compareByName = (a, b) => {
      const localeCompare = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
        numeric: true,
      });
      if (localeCompare !== 0) return localeCompare;
      return a.index - b.index;
    };

    const compare = (a, b) => {
      switch (sortOrder) {
        case "oldest":
          if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
          return a.index - b.index;
        case "name-asc":
          return compareByName(a, b);
        case "name-desc":
          return compareByName(b, a);
        case "newest":
        default: {
          if (a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
          return b.index - a.index;
        }
      }
    };

    return decorated.sort(compare).map((entry) => entry.course);
  }, [courses, sortOrder]);

  const hasCourses = sortedCourses.length > 0;
  const showSortControls = sortedCourses.length > 1;

  return (
    <div>
      {hasCourses ? (
        <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur shadow-lg ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden rounded-xl transition-colors">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 sm:px-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Showing {sortedCourses.length}{" "}
              {sortedCourses.length === 1 ? "course" : "courses"}
            </p>
            {showSortControls && (
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Sort by:</span>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <ul className="divide-y divide-gray-100 dark:divide-gray-800 stagger-children">
            {sortedCourses.map((course) => (
              <li key={course.id}>
                <Link
                  to={`${basePath}/${course.id}`}
                  className="block group transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {course.name}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className="px-2.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60 dark:bg-indigo-900/40 dark:text-indigo-300 dark:ring-indigo-800">
                          {course.code}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          {course.subject}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-300 sm:mt-0">
                        <p>{course.academicYear}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        emptyState ?? (
          <EmptyState
            title="No courses found"
            description="You don't have any courses yet."
          />
        )
      )}
    </div>
  );
};

export default CourseList;
