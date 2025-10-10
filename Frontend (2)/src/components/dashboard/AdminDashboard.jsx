import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getAllUsers, getStudents } from '../../services/userService'
import { getAllCourses } from '../../services/courseService'
import Card from '../common/Card'
import EmptyState from '../common/EmptyState'
import Loader from '../common/Loader'
import Avatar from '../common/Avatar'

const AdminDashboard = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, studentsData, coursesData] = await Promise.all([
          getAllUsers(),
          getStudents(),
          getAllCourses()
        ])
        setUsers(usersData)
        setStudents(studentsData)
        setCourses(coursesData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <Loader className="py-12" />
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card title="Total Users" value={users.length} icon="👥" />
        <Card title="Total Students" value={students.length} icon="👨‍🎓" />
        <Card title="Total Courses" value={courses.length} icon="📚" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Users
          </h3>
          {users.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.slice(0, 5).map((user) => (
                  <li key={user.id}>
                    <div className="px-4 py-4 flex items-center sm:px-6">
                      <div className="min-w-0 flex-1 flex items-center">
                        <div className="flex-shrink-0">
                          <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
                        </div>
                        <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                          <div>
                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <span className="truncate">{user.email}</span>
                            </p>
                          </div>
                          <div className="hidden md:block">
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white">
                                Role: {user.userType}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              title="No users found"
              description="There are currently no users in the system."
            />
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Courses
          </h3>
          {courses.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {courses.slice(0, 5).map((course) => (
                  <li key={course.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                          {course.name}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {course.code}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            {course.subject}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                          <p>{course.academicYear}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              title="No courses found"
              description="There are currently no courses in the system."
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard