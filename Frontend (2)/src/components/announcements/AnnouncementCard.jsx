import { formatDate } from '../../utils/helpers'

const AnnouncementCard = ({ announcement }) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            {announcement.title}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {formatDate(announcement.postDate)}
          </p>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {announcement.content}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AnnouncementCard