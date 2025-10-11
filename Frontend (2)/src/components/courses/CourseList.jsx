import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import EmptyState from "../common/EmptyState";

const CourseList = ({ courses }) => {
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(0); // zero-based

  const total = courses.length;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

  const visibleCourses = useMemo(() => {
    const start = page * rowsPerPage;
    return courses.slice(start, start + rowsPerPage);
  }, [courses, page, rowsPerPage]);

  const handleRowsChange = (e) => {
    const value = Number(e.target.value);
    setRowsPerPage(value);
    setPage(0);
  };

  const handlePrevious = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <div>
      {courses.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 shadow sm:rounded-md">
          <div className="px-4 py-4 sm:px-6">
            <h3 className="sr-only">Students</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-black dark:bg-gray-900">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-white text-lg"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-white text-lg"
                    >
                      Student Number
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-right text-white text-lg"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {visibleCourses.map((course) => (
                    <tr key={course.id} className="bg-gray-50 dark:bg-gray-700">
                      <td className="px-6 py-6 text-sm text-gray-900 dark:text-gray-100">
                        {course.name}
                      </td>
                      <td className="px-6 py-6 text-sm text-gray-900 dark:text-gray-100">
                        {course.rollNumber ?? course.id}
                      </td>
                      <td className="px-6 py-6 text-sm text-right">
                        <div className="inline-flex items-center space-x-3 justify-end">
                          <Link
                            to={`/teacher/courses/${course.id}`}
                            className="px-4 py-2 bg-[#0f1233] dark:bg-[#0b0d28] text-white rounded-md shadow text-sm font-semibold"
                          >
                            VIEW
                          </Link>

                          <button
                            type="button"
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-md shadow text-sm font-semibold"
                          >
                            TAKE ATTENDANCE
                          </button>

                          <button
                            type="button"
                            className="ml-0 w-10 h-10 bg-black dark:bg-gray-700 text-white rounded-md shadow flex items-center justify-center"
                            aria-label="more"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M5.23 7.21a1.5 1.5 0 112.12-2.12 1.5 1.5 0 01-2.12 2.12zM10 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm4.65-1.29a1.5 1.5 0 11-2.12 2.12 1.5 1.5 0 012.12-2.12z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination area (static placeholder matching design) */}
            <div className="mt-6 flex items-center justify-end space-x-6 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center space-x-2">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={handleRowsChange}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-200"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>
              <div>
                {total === 0
                  ? "0–0 of 0"
                  : `${page * rowsPerPage + 1}–${Math.min(
                      (page + 1) * rowsPerPage,
                      total
                    )} of ${total}`}
              </div>
              <div className="flex items-center space-x-2 text-gray-400 dark:text-gray-300">
                <button
                  aria-label="previous"
                  onClick={handlePrevious}
                  className="p-1"
                  disabled={page === 0}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  aria-label="next"
                  onClick={handleNext}
                  className="p-1"
                  disabled={page >= totalPages - 1}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No courses found"
          description="You don't have any courses yet."
          action={
            <Link
              to="/teacher/courses/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create New Course
            </Link>
          }
        />
      )}
    </div>
  );
};

export default CourseList;
