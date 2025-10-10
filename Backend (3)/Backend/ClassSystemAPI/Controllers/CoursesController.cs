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
        public IQueryable<Course> GetCourses()
        {
            return db.Courses.Include(c => c.Subject).Include(c => c.Teacher);
        }

        // GET: api/Courses/5
        public IHttpActionResult GetCourse(int id)
        {
            var course = db.Courses.Find(id);
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
