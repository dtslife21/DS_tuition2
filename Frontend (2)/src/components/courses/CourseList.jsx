import { Link } from "react-router-dom";
import EmptyState from "../common/EmptyState";

const CourseList = ({ courses, basePath = "/teacher/courses", emptyState }) => {
  return (
    <div>
      {courses.length > 0 ? (
        <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur shadow-lg ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden rounded-xl transition-colors">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 stagger-children">
            {courses.map((course) => (
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
