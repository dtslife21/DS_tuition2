import { formatDate } from '../../utils/helpers'
import { getFileType } from '../../utils/helpers'

const MaterialCard = ({ material }) => {
  const fileType = getFileType(material.filePath)

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            {material.title}
          </h3>
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
            {fileType}
          </span>
        </div>
        <div className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          {formatDate(material.uploadDate)}
        </div>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
        <dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-gray-700">
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Description
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
              {material.description || 'No description provided'}
            </dd>
          </div>
        </dl>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6 text-right">
        <a
          href={material.filePath}
          download
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Download
        </a>
      </div>
    </div>
  )
}

export default MaterialCard