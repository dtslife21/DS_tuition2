import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getTeacherCourses, getCourseDetails } from '../../services/courseService'
import CourseList from '../../components/courses/CourseList'
import CourseView from '../../components/courses/CourseView'
import EmptyState from '../../components/common/EmptyState'
import Loader from '../../components/common/Loader'

const TeacherCourses = () => {
  const { user } = useAuth()
  const { id } = useParams()
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await getTeacherCourses(user.id)
        setCourses(data)
        
        if (id) {
          const course = await getCourseDetails(id)
          setSelectedCourse(course)
        }
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [user.id, id])

  if (loading) {
    return <Loader className="py-12" />
  }

  if (id && selectedCourse) {
    return <CourseView course={selectedCourse} />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        My Courses
      </h1>
      
      {courses.length > 0 ? (
        <CourseList courses={courses} />
      ) : (
        <EmptyState
          title="No courses assigned"
          description="You don't have any courses assigned to you yet."
          action={
            <Link
              to="/teacher/courses/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Request New Course
            </Link>
          }
        />
      )}
    </div>
  )
}

export default TeacherCourses