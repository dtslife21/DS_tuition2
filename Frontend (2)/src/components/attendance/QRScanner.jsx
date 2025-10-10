// src/components/attendance/QRScanner.jsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { recordAttendance } from '../../services/attendanceService'
import Button from '../common/Button'

const QRScanner = () => {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const handleScan = async () => {
    try {
      setStatus('loading')
      await recordAttendance(sessionId, user.id)
      setStatus('success')
      setMessage('Attendance recorded successfully!')
    } catch (error) {
      setStatus('error')
      setMessage('Failed to record attendance')
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Scan QR Code</h2>
      
      {/* QR Scanner Placeholder */}
      <div className="bg-gray-200 dark:bg-gray-700 h-64 w-full mb-4 flex items-center justify-center">
        <p>QR Scanner UI will appear here</p>
      </div>

      <Button onClick={handleScan} disabled={status === 'loading'}>
        {status === 'loading' ? 'Processing...' : 'Simulate Scan'}
      </Button>

      {status === 'success' && (
        <p className="mt-4 text-green-600 dark:text-green-400">{message}</p>
      )}

      {status === 'error' && (
        <p className="mt-4 text-red-600 dark:text-red-400">{message}</p>
      )}
    </div>
  )
}

export default QRScanner