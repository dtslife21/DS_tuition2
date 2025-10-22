import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getTeacherStudents,
  getCourseDetails,
  getTeacherCourseStudents,
} from "../../services/courseService";
import UserList from "../../components/users/UserList";
import UserFormDialog from "../../components/common/UserFormDialog";
import {
  createUser,
  updateUser,
  deleteUser,
  getUserById,
} from "../../services/userService";
import {
  createStudent,
  updateStudent,
  deleteStudent as deleteStudentRecord,
  getStudentById,
} from "../../services/studentService";
import Loader from "../../components/common/Loader";

const resolveTeacherId = (user) => {
  if (!user || typeof user !== "object") {
    return null;
  }

  return (
    user.TeacherID ??
    user.teacherID ??
    user.teacherId ??
    user.UserID ??
    user.userID ??
    user.userId ??
    user.id ??
    null
  );
};

const TeacherStudents = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [isEditOpen, setEditOpen] = useState(false);
  const teacherId = resolveTeacherId(user);
  const courseId = id ? String(id).trim() : null;

  const refreshStudents = async () => {
    if (!teacherId) {
      setStudents([]);
      return;
    }

    try {
      if (courseId) {
        try {
          const { course: scopedCourse, students: scopedStudents } =
            await getTeacherCourseStudents(teacherId, courseId);
          setStudents(scopedStudents);
          if (scopedCourse) {
            setCourse(scopedCourse);
          }
        } catch (error) {
          console.error(
            "Error refreshing course students via teacher route:",
            error
          );
          const fallbackStudents = await getTeacherStudents(courseId, {
            scope: "course",
          });
          setStudents(fallbackStudents);
        }
      } else {
        const updatedStudents = await getTeacherStudents(teacherId);
        setStudents(updatedStudents);
        setCourse(null);
      }
    } catch (error) {
      console.error("Error refreshing students:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!teacherId) {
        setStudents([]);
        setCourse(null);
        setLoading(false);
        return;
      }

      try {
        if (courseId) {
          try {
            const { course: scopedCourse, students: scopedStudents } =
              await getTeacherCourseStudents(teacherId, courseId);
            setStudents(scopedStudents);
            setCourse(
              scopedCourse || (await getCourseDetails(courseId)) || null
            );
          } catch (error) {
            console.error(
              "Error fetching course students via teacher route:",
              error
            );
            const [studentsData, courseData] = await Promise.all([
              getTeacherStudents(courseId, { scope: "course" }),
              getCourseDetails(courseId),
            ]);
            setStudents(studentsData);
            setCourse(courseData);
          }
        } else {
          const studentsData = await getTeacherStudents(teacherId);
          setStudents(studentsData);
          setCourse(null);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teacherId, courseId]);

  if (loading) {
    return <Loader className="py-12" />;
  }

  // if (!id) {
  //   return (
  //     <div className="space-y-6">
  //       <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
  //         Students
  //       </h1>
  //       <EmptyState
  //         title="Select a course"
  //         description="Please select a course to view enrolled students."
  //       />
  //     </div>
  //   )
  // }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white border-l-4 border-indigo-500/60 dark:border-indigo-400/60 pl-3">
        {course
          ? `Students in ${
              course.name ?? course.CourseName ?? course.courseName ?? ""
            }`
          : "My Students"}
      </h1>

      <div className="flex justify-end">
        <UserFormDialog
          triggerButton={
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
              Add New Student
            </button>
          }
          forceUserType={3}
          onSave={async (formData) => {
            try {
              const newUser = await createUser({
                ...formData,
                UserTypeID: 3,
                IsActive: true,
                ProfilePicture: null,
              });
              await createStudent({
                UserID: newUser.UserID || newUser.id,
                RollNumber: formData.RollNumber,
                EnrollmentDate: formData.EnrollmentDate,
                CurrentGrade: formData.CurrentGrade,
                ParentName: formData.ParentName,
                ParentContact: formData.ParentContact,
              });
              await refreshStudents();
            } catch (err) {
              console.error("Error creating student record:", err);
              setStudents((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  UserID: Date.now(),
                  ...formData,
                  UserTypeID: 3,
                },
              ]);
            }
          }}
        />
      </div>

      <div className="bg-gradient-to-br from-white to-indigo-50/70 dark:from-gray-900/70 dark:to-indigo-950/20 backdrop-blur shadow-lg ring-1 ring-indigo-100 dark:ring-indigo-800 rounded-2xl p-4 sm:p-6">
        <UserList
          users={students}
          onAddStudent={async (formData) => {
            try {
              const newUser = await createUser({
                ...formData,
                UserTypeID: 3,
                IsActive: true,
                ProfilePicture: null,
              });
              await createStudent({
                UserID: newUser.UserID || newUser.id,
                RollNumber: formData.RollNumber,
                EnrollmentDate: formData.EnrollmentDate,
                CurrentGrade: formData.CurrentGrade,
                ParentName: formData.ParentName,
                ParentContact: formData.ParentContact,
              });
              await refreshStudents();
            } catch (err) {
              console.error("Error creating student record:", err);
              setStudents((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  UserID: Date.now(),
                  ...formData,
                  UserTypeID: 3,
                },
              ]);
            }
          }}
          onEdit={async (userId) => {
            try {
              const [userData, studentData] = await Promise.all([
                getUserById(userId),
                getStudentById(userId),
              ]);
              setEditUser(
                studentData ? { ...userData, ...studentData } : userData
              );
            } catch (_) {
              const fallback = students.find(
                (s) => (s.UserID || s.id) === userId
              );
              setEditUser(fallback || null);
            }
            setEditOpen(true);
          }}
          onDelete={async (userId) => {
            const confirmed = window.confirm("Delete this student?");
            if (!confirmed) return;
            try {
              await deleteStudentRecord(userId);
            } catch (studentError) {
              console.warn("Failed to delete student record:", studentError);
            }

            try {
              await deleteUser(userId);
            } catch (userError) {
              console.warn("Failed to delete user record:", userError);
            }

            await refreshStudents();
            setStudents((prev) =>
              prev.filter((s) => (s.UserID || s.id) !== userId)
            );
          }}
        />
      </div>

      {/* Edit Student Popup */}
      {isEditOpen && (
        <UserFormDialog
          initialData={editUser || {}}
          forceUserType={3}
          onSave={async (formData) => {
            const uid = editUser?.UserID || editUser?.id;
            try {
              await updateUser(uid, {
                ...formData,
                UserTypeID: 3,
              });
              await updateStudent(uid, {
                StudentID: uid,
                RollNumber: formData.RollNumber,
                EnrollmentDate: formData.EnrollmentDate,
                CurrentGrade: formData.CurrentGrade,
                ParentName: formData.ParentName,
                ParentContact: formData.ParentContact,
              });
              await refreshStudents();
            } catch (error) {
              console.error("Error updating student:", error);
              setStudents((prev) =>
                prev.map((s) =>
                  (s.UserID || s.id) === uid ? { ...s, ...formData } : s
                )
              );
            }
            setEditOpen(false);
            setEditUser(null);
          }}
          triggerButton={null}
        />
      )}
    </div>
  );
};

export default TeacherStudents;
