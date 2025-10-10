import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./layouts/AdminLayout";
import TeacherLayout from "./layouts/TeacherLayout";
import StudentLayout from "./layouts/StudentLayout";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCourses from "./pages/admin/Courses";
import AdminUsers from "./pages/admin/Users";
import AdminSettings from "./pages/admin/Settings";
import TeacherDashboard from "./pages/teacher/Dashboard";
import TeacherCourses from "./pages/teacher/Courses";
import TeacherAttendance from "./pages/teacher/Attendance";
import TeacherMaterials from "./pages/teacher/Materials";
import TeacherStudents from "./pages/teacher/Students";
import StudentDashboard from "./pages/student/Dashboard";
import StudentCourses from "./pages/student/Courses";
import StudentAttendance from "./pages/student/Attendance";
import StudentMaterials from "./pages/student/Materials";
import StudentComplaints from "./pages/student/Complaints";
import NotFound from "./pages/404";
import UserDetailsPage from "./pages/admin/UserDetailsPage";

const RoutesConfig = () => {
  const { user, isAuthenticated } = useAuth();

  const ProtectedRoute = ({ children, roles }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (roles && !roles.includes(user.userType)) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<UserDetailsPage />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Teacher Routes */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute roles={["teacher"]}>
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="courses" element={<TeacherCourses />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="materials" element={<TeacherMaterials />} />
        <Route path="students" element={<TeacherStudents />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="courses" element={<StudentCourses />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="materials" element={<StudentMaterials />} />
        <Route path="complaints" element={<StudentComplaints />} />
      </Route>

      {/* Root Redirect */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {user?.userType === "admin" ? (
              <Navigate to="/admin" replace />
            ) : user?.userType === "teacher" ? (
              <Navigate to="/teacher" replace />
            ) : (
              <Navigate to="/student" replace />
            )}
          </ProtectedRoute>
        }
      />

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesConfig;
