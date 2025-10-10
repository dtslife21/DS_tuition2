import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getCourseDetails } from '../../services/courseService'
import { getCourseMaterials } from '../../services/materialService'
import { getCourseAttendance } from '../../services/attendanceService'
import MaterialList from '../materials/MaterialList'
import AttendanceList from '../attendance/AttendanceList'
import Modal from '../common/Modal'
import MaterialForm from '../materials/MaterialForm'
import QRGenerator from '../attendance/QRGenerator'
import Loader from '../common/Loader'
import Button from '../common/Button'
import { useEffect } from 'react';

const CourseView = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [materials, setMaterials] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseData, materialsData, attendanceData] = await Promise.all([
          getCourseDetails(id),
          getCourseMaterials(id),
          getCourseAttendance(id)
        ])
        setCourse(courseData)
        setMaterials(materialsData)
        setAttendance(attendanceData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleMaterialSubmit = (newMaterial) => {
    setMaterials([newMaterial, ...materials])
    setShowMaterialModal(false)
  }

  if (loading || !course) {
    return <Loader className="py-12" />
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {course.name}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              {course.code} - {course.subject}
            </p>
          </div>
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
            Active
          </span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-gray-700">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Description
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {course.description}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Academic Year
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {course.academicYear}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Study Materials
        </h3>
        {user.userType === 'teacher' && (
          <Button
            variant="primary"
            onClick={() => setShowMaterialModal(true)}
          >
            Upload Material
          </Button>
        )}
      </div>
      <MaterialList materials={materials} />

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Attendance Records
        </h3>
        {user.userType === 'teacher' && (
          <Button
            variant="primary"
            onClick={() => setShowQRModal(true)}
          >
            Take Attendance
          </Button>
        )}
      </div>
      <AttendanceList attendance={attendance} />

      <Modal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        title="Upload Study Material"
      >
        <MaterialForm
          courseId={id}
          onSuccess={handleMaterialSubmit}
          onCancel={() => setShowMaterialModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Generate QR Code for Attendance"
        size="lg"
      >
        <QRGenerator courseId={id} />
      </Modal>
    </div>
  )
}

export default CourseView