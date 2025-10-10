import { Outlet } from 'react-router-dom'
import Sidebar from '../components/common/Sidebar'
import Navbar from '../components/common/Navbar'
import { useAuth } from '../contexts/AuthContext'

const MainLayout = () => {
  const { user } = useAuth()

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout