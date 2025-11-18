import { formatDate } from "../../utils/helpers";
import EmptyState from "../common/EmptyState";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

const MaterialList = ({
  materials = [],
  className = "",
  compact = false,
  renderActions,
}) => {
  const containerCls = compact
    ? "bg-transparent"
    : "bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md";

  const items = Array.isArray(materials) ? materials : [];

  return (
    <div className={className}>
      {items.length > 0 ? (
        <div className={containerCls}>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 stagger-children">
            {items.map((material) => {
              const extraActions =
                typeof renderActions === "function"
                  ? renderActions(material)
                  : null;

              return (
                <li key={material.id}>
                  <div
                    className={`${compact ? "px-2 py-2" : "px-4 py-4 sm:px-6"}`}
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={`${
                            compact ? "text-sm" : "text-sm font-medium"
                          } text-indigo-600 dark:text-indigo-400 sm:truncate`}
                        >
                          {material.title}
                        </p>
                        <p
                          className={`mt-1 ${
                            compact ? "text-xs" : "text-sm"
                          } text-gray-500 dark:text-gray-400 sm:truncate`}
                        >
                          {material.description || "No description"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
                        <p
                          className={`${
                            compact
                              ? "text-xs"
                              : "px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                          } bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200`}
                        >
                          {formatDate(material.uploadDate)}
                        </p>
                        <a
                          href={material.filePath}
                          download
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                          <span className="sr-only">Download</span>
                        </a>
                        {extraActions}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <EmptyState
          title="No materials found"
          description="There are no study materials for this course yet."
        />
      )}
    </div>
  );
};

export default MaterialList;
