import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getTeacherStudents, getCourseDetails } from '../../services/courseService'
import UserList from '../../components/users/UserList'
import EmptyState from '../../components/common/EmptyState'
import Loader from '../../components/common/Loader'

const TeacherStudents = () => {
  const { id } = useParams()
  const [students, setStudents] = useState([])
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const [studentsData, courseData] = await Promise.all([
            getTeacherStudents(id),
            getCourseDetails(id)
          ])
          setStudents(studentsData)
          setCourse(courseData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) {
    return <Loader className="py-12" />
  }

  if (!id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Students
        </h1>
        <EmptyState
          title="Select a course"
          description="Please select a course to view enrolled students."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Students in {course?.name}
      </h1>

      <UserList users={students} />
    </div>
  )
}

export default TeacherStudents