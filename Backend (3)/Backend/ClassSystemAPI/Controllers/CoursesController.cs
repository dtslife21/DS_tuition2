using System.Linq;
using System.Net;
using System.Web.Http;
using System.Data.Entity;
using ClassSystemAPI.Models;

namespace ClassSystemAPI.Controllers
{
    public class CoursesController : ApiController
    {
        private ClassSystemContext db = new ClassSystemContext();

        // GET: api/Courses
        // Returns courses with their subject (projected to avoid lazy-loading / reference loops)
        public IHttpActionResult GetCourses()
        {
            var courses = db.Courses
                .Include(c => c.Subject)
                .Include(c => c.Teacher)
                .Select(c => new
                {
                    c.CourseID,
                    c.CourseName,
                    c.CourseCode,
                    c.AcademicYear,
                    c.Description,
                    c.IsActive,
                    Subject = c.Subject == null ? null : new
                    {
                        c.Subject.SubjectID,
                        c.Subject.SubjectName,
                        c.Subject.SubjectCode
                    },
                    Teacher = c.Teacher == null ? null : new
                    {
                        c.Teacher.TeacherID,
                        // include basic teacher/user info if desired
                        User = c.Teacher.User == null ? null : new
                        {
                            c.Teacher.User.UserID,
                            c.Teacher.User.Username,
                            c.Teacher.User.FirstName,
                            c.Teacher.User.LastName
                        }
                    }
                })
                .ToList();

            return Ok(courses);
        }

        // GET: api/Courses/5
        public IHttpActionResult GetCourse(int id)
        {
            var course = db.Courses
                .Where(c => c.CourseID == id)
                .Include(c => c.Subject)
                .Include(c => c.Teacher)
                .Select(c => new
                {
                    c.CourseID,
                    c.CourseName,
                    c.CourseCode,
                    c.AcademicYear,
                    c.Description,
                    c.IsActive,
                    Subject = c.Subject == null ? null : new
                    {
                        c.Subject.SubjectID,
                        c.Subject.SubjectName,
                        c.Subject.SubjectCode
                    },
                    Teacher = c.Teacher == null ? null : new
                    {
                        c.Teacher.TeacherID,
                        User = c.Teacher.User == null ? null : new
                        {
                            c.Teacher.User.UserID,
                            c.Teacher.User.Username,
                            c.Teacher.User.FirstName,
                            c.Teacher.User.LastName
                        }
                    }
                })
                .FirstOrDefault();

            if (course == null)
                return NotFound();

            return Ok(course);
        }

        // POST: api/Courses
        public IHttpActionResult PostCourse(Course course)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            db.Courses.Add(course);
            db.SaveChanges();

            return CreatedAtRoute("DefaultApi", new { id = course.CourseID }, course);
        }

        // PUT: api/Courses/5
        public IHttpActionResult PutCourse(int id, Course course)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (id != course.CourseID)
                return BadRequest();

            db.Entry(course).State = EntityState.Modified;

            try
            {
                db.SaveChanges();
            }
            catch
            {
                return NotFound();
            }

            return StatusCode(HttpStatusCode.NoContent);
        }

        // DELETE: api/Courses/5
        public IHttpActionResult DeleteCourse(int id)
        {
            var course = db.Courses.Find(id);
            if (course == null)
                return NotFound();

            db.Courses.Remove(course);
            db.SaveChanges();

            return Ok(course);
        }
    }
}
