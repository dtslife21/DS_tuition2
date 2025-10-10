using System.Linq;
using System.Net;
using System.Web.Http;
using System.Data.Entity;
using ClassSystemAPI.Models;

namespace ClassSystemAPI.Controllers
{
    public class EnrollmentsController : ApiController
    {
        private ClassSystemContext db = new ClassSystemContext();

        // GET: api/Enrollments
        public IQueryable<Enrollment> GetEnrollments()
        {
            return db.Enrollments.Include(e => e.Course).Include(e => e.Student);
        }

        // GET: api/Enrollments/5
        public IHttpActionResult GetEnrollment(int id)
        {
            var enrollment = db.Enrollments.Find(id);
            if (enrollment == null)
                return NotFound();

            return Ok(enrollment);
        }

        // POST: api/Enrollments
        public IHttpActionResult PostEnrollment(Enrollment enrollment)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            db.Enrollments.Add(enrollment);
            db.SaveChanges();

            return CreatedAtRoute("DefaultApi", new { id = enrollment.EnrollmentID }, enrollment);
        }

        // PUT: api/Enrollments/5
        public IHttpActionResult PutEnrollment(int id, Enrollment enrollment)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (id != enrollment.EnrollmentID)
                return BadRequest();

            db.Entry(enrollment).State = EntityState.Modified;
            db.SaveChanges();

            return StatusCode(HttpStatusCode.NoContent);
        }

        // DELETE: api/Enrollments/5
        public IHttpActionResult DeleteEnrollment(int id)
        {
            var enrollment = db.Enrollments.Find(id);
            if (enrollment == null)
                return NotFound();

            db.Enrollments.Remove(enrollment);
            db.SaveChanges();

            return Ok(enrollment);
        }
    }
}
