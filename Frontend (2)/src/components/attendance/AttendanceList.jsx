import { useMemo } from "react";
import { formatDate } from "../../utils/helpers";
import EmptyState from "../common/EmptyState";

// Props:
// - attendance: Array<{ id, studentId, date, status }>
// - students?: Array<{ id, firstName, lastName, rollNumber }>
const AttendanceList = ({ attendance, students = [] }) => {
  const studentMap = useMemo(() => {
    const map = {};
    for (const s of students) {
      map[String(s.id)] = s;
    }
    return map;
  }, [students]);

  return (
    <div>
      {attendance.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {attendance.map((record) => (
              <li key={record.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                        {formatDate(record.date)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        {studentMap[String(record.studentId)]
                          ? `${
                              studentMap[String(record.studentId)].firstName
                            } ${studentMap[String(record.studentId)].lastName}`
                          : `Student #${record.studentId}`}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.status === "Present"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : record.status === "Late"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {record.status}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          title="No attendance records"
          description="There are no attendance records for this course yet."
        />
      )}
    </div>
  );
};

export default AttendanceList;
