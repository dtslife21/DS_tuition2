import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getTeacherCourses, getTeacherStudents } from '../../services/courseService'
import { getRecentMaterials } from '../../services/materialService'
import CourseCard from '../courses/CourseCard'
import StudentCard from '../users/UserCard'
import MaterialCard from '../materials/MaterialCard'
import Card from '../common/Card'
import Loader from '../common/Loader'

const TeacherDashboard = () => {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesData, studentsData, materialsData] = await Promise.all([
          getTeacherCourses(user.id),
          getTeacherStudents(user.id),
          getRecentMaterials(user.id)
        ])
        setCourses(coursesData)
        setStudents(studentsData)
        setMaterials(materialsData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user.id])

  if (loading) {
    return <Loader className="py-12" />
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card title="Total Courses" value={courses.length} icon="📚" />
        <Card title="Total Students" value={students.length} icon="👨‍🎓" />
        <Card title="Uploaded Materials" value={materials.length} icon="📄" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Courses
          </h3>
          <div className="space-y-4">
            {courses.slice(0, 3).map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Students
          </h3>
          <div className="space-y-4">
            {students.slice(0, 5).map(student => (
              <StudentCard key={student.id} user={student} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Recent Materials
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.slice(0, 3).map(material => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard