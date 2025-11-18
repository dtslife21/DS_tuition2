import { Outlet } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";

const TeacherLayout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Navbar />
        <main className="flex-1 min-h-0 w-full overflow-y-auto scrollbar-hide p-4 md:p-6 page-enter overscroll-contain">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
