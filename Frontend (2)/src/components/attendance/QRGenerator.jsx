import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../common/Button'

const QRGenerator = ({ courseId }) => {
  const { user } = useAuth()
  const [qrCode, setQrCode] = useState('')
  const [session, setSession] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  const generateQR = async () => {
    try {
      // In a real app, this would call your backend API
      const sessionData = {
        id: Math.random().toString(36).substring(7),
        courseId,
        teacherId: user.id,
        sessionDate: new Date().toISOString(),
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        QRCodeData: `session-${Math.random().toString(36).substring(7)}`,
      }
      
      setSession(sessionData)
      setIsActive(true)
      setTimeLeft(15 * 60) // 15 minutes in seconds

      // Generate QR code image
      const url = `${window.location.origin}/attendance/scan/${sessionData.id}`
      const qrImage = await QRCode.toDataURL(url)
      setQrCode(qrImage)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const stopSession = () => {
    setIsActive(false)
    setSession(null)
    setQrCode('')
    setTimeLeft(0)
  }

  useEffect(() => {
    let timer
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isActive) {
      stopSession()
    }
    return () => clearInterval(timer)
  }, [isActive, timeLeft])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        Generate Attendance QR Code
      </h3>
      
      {isActive ? (
        <>
          <div className="p-4 bg-white rounded border border-gray-200">
            <img src={qrCode} alt="QR Code" className="w-64 h-64" />
          </div>
          <div className="text-lg font-medium text-gray-900 dark:text-white">
            Time remaining: {formatTime(timeLeft)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Session ID: {session?.id}
          </div>
          <Button onClick={stopSession} variant="danger">
            Stop Session
          </Button>
        </>
      ) : (
        <>
          <p className="text-gray-600 dark:text-gray-300 text-center">
            Click the button below to generate a QR code for attendance. 
            Students will scan this code to mark their attendance.
          </p>
          <Button onClick={generateQR} variant="primary">
            Generate QR Code
          </Button>
        </>
      )}
    </div>
  )
}

export default QRGenerator