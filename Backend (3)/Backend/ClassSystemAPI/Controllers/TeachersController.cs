using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using ClassSystemAPI.Models;
using System.Data.Entity; // added

namespace ClassSystemAPI.Controllers
{

    public class TeachersController : ApiController
    {
        private ClassSystemContext db = new ClassSystemContext();

        //GET: api/Teachers
        [HttpGet]
        public IHttpActionResult GetTeachers()
        {
            var teachers = db.Teachers.Include("User").ToList();
            return Ok(teachers);
        }

        //GET: api/Teachers/5
        [HttpGet]
        public IHttpActionResult GetTeacher(int id)
        {
            var teacher = db.Teachers.Include("User").FirstOrDefault(t => t.TeacherID == id);
            if (teacher == null) return NotFound();
            return Ok(teacher);
        }
        //POST: api/Teachers
        [HttpPost]
        public IHttpActionResult PostTeacher(Teacher teacher)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            db.Teachers.Add(teacher);
            db.SaveChanges();
            return Ok(teacher);
        }

        // GET: api/Teachers/{teacherId}/Courses/Students
        // Returns all courses for the teacher, each with enrolled students
        [HttpGet]
        [Route("api/Teachers/{teacherId}/Courses/Students")]
        public IHttpActionResult GetTeacherCoursesWithStudents(int teacherId)
        {
            var teacherExists = db.Teachers.Any(t => t.TeacherID == teacherId);
            if (!teacherExists) return NotFound();

            var data = db.Courses
                .Where(c => c.TeacherID == teacherId /* && c.IsActive */)
                .Select(c => new
                {
                    c.CourseID,
                    c.CourseName,
                    c.CourseCode,
                    c.AcademicYear,
                    c.Description,
                    Students = db.Enrollments
                        .Where(e => e.CourseID == c.CourseID && e.IsActive)
                        .Select(e => new
                        {
                            e.EnrollmentID,
                            e.EnrollmentDate,
                            Student = new
                            {
                                e.Student.StudentID,
                                e.Student.RollNumber,
                                User = new
                                {
                                    e.Student.User.UserID,
                                    e.Student.User.Username,
                                    e.Student.User.FirstName,
                                    e.Student.User.LastName,
                                    e.Student.User.Email
                                }
                            }
                        })
                        .ToList()
                })
                .ToList();

            return Ok(data);
        }

        // GET: api/Teachers/{teacherId}/Courses/{courseId}/Students
        // Returns enrolled students for a specific course ensuring it belongs to the teacher
        [HttpGet]
        [Route("api/Teachers/{teacherId}/Courses/{courseId}/Students")]
        public IHttpActionResult GetCourseStudentsForTeacher(int teacherId, int courseId)
        {
            var course = db.Courses.FirstOrDefault(c => c.CourseID == courseId && c.TeacherID == teacherId);
            if (course == null) return NotFound();

            var students = db.Enrollments
                .Where(e => e.CourseID == courseId && e.IsActive)
                .Select(e => new
                {
                    e.EnrollmentID,
                    e.EnrollmentDate,
                    Student = new
                    {
                        e.Student.StudentID,
                        e.Student.RollNumber,
                        User = new
                        {
                            e.Student.User.UserID,
                            e.Student.User.Username,
                            e.Student.User.FirstName,
                            e.Student.User.LastName,
                            e.Student.User.Email
                        }
                    }
                })
                .ToList();

            return Ok(new
            {
                course.CourseID,
                course.CourseName,
                course.CourseCode,
                course.AcademicYear,
                Students = students
            });
        }
    }
}