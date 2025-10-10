import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import Avatar from './Avatar'
import Dropdown from './Dropdown'
const Navbar = () => {
 const { user, logout } = useAuth()
 const { theme, toggleTheme } = useTheme()
 const userNavigation = [
   { name: 'Your Profile', href: '#' },
   { name: 'Settings', href: '#' },
   { name: 'Sign out', onClick: logout },
 ]
 return (
   <header className="bg-white dark:bg-gray-800 shadow-sm">
     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       <div className="flex justify-between h-16">
         <div className="flex items-center">
           <Link
             to="/"
             className="text-xl font-bold text-gray-900 dark:text-white"
           >
             ClassManager
           </Link>
         </div>
         <div className="flex items-center space-x-4">
           <button
             onClick={toggleTheme}
             className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
           >
             {theme === 'dark' ? (
               <svg
                 className="h-6 w-6"
                 fill="none"
                 viewBox="0 0 24 24"
                 stroke="currentColor"
               >
                 <path
                   strokeLinecap="round"
                   strokeLinejoin="round"
                   strokeWidth={2}
                   d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                 />
               </svg>
             ) : (
               <svg
                 className="h-6 w-6"
                 fill="none"
                 viewBox="0 0 24 24"
                 stroke="currentColor"
               >
                 <path
                   strokeLinecap="round"
                   strokeLinejoin="round"
                   strokeWidth={2}
                   d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                 />
               </svg>
             )}
           </button>
           <Dropdown
             button={
               <div className="flex items-center space-x-2">
                 <span className="hidden md:inline-block text-sm font-medium text-gray-700 dark:text-gray-300">
                   {user?.firstName} {user?.lastName}
                 </span>
                 <Avatar
                   name={`${user?.firstName} ${user?.lastName}`}
                   size="sm"
                 />
               </div>
             }
             items={userNavigation}
           />
         </div>
       </div>
     </div>
   </header>
 )
}
export default Navbar