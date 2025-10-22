import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getCourseDetails } from '../../services/courseService'
import { getCourseAttendance } from '../../services/attendanceService'
import AttendanceList from '../../components/attendance/AttendanceList'
import QRGenerator from '../../components/attendance/QRGenerator'
import EmptyState from '../../components/common/EmptyState'
import Loader from '../../components/common/Loader'
import QRScanner from '../../components/attendance/QRScanner'

const TeacherAttendance = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const [attendanceData, courseData] = await Promise.all([
            getCourseAttendance(id),
            getCourseDetails(id)
          ])
          setAttendance(attendanceData)
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

  // if (!id) {
  //   return (
  //     <div className="space-y-6">
  //       <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
  //         Attendance
  //       </h1>
  //       <EmptyState
  //         title="Select a course"
  //         description="Please select a course to view or take attendance."
  //       />
  //     </div>
  //   )
  // }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Attendance for {course?.name}
        </h1>
      </div>

      <QRScanner />

      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        Attendance Records
      </h2>
      <AttendanceList attendance={attendance} />
    </div>
  )
}

export default TeacherAttendance