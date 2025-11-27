using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using ClassSystemAPI.Models;

namespace ClassSystemAPI.Controllers
{
    public class SubjectsController : ApiController
    {
        private ClassSystemContext db = new ClassSystemContext();

        // GET: api/Subjects
        public IEnumerable<Subject> GetSubjects()
        {
            return db.Subjects.ToList();
        }

        // GET: api/Subjects/LatestId
        [HttpGet]
        [Route("api/Subjects/LatestId")]
        public IHttpActionResult GetLatestSubjectId()
        {
            // Order by SubjectID descending and take the first ID.
            // If there are no subjects, return an object with a null value so the frontend can handle it gracefully.
            var latestId = db.Subjects
                             .OrderByDescending(s => s.SubjectID)
                             .Select(s => s.SubjectID)
                             .FirstOrDefault();

            // FirstOrDefault returns 0 when sequence is empty (SubjectID is assumed to be positive).
            if (latestId == 0)
                return Ok(new { latestSubjectId = (int?)null });

            return Ok(new { latestSubjectId = latestId });
        }

        // GET: api/Subjects/5
        public IHttpActionResult GetSubject(int id)
        {
            var subject = db.Subjects.Find(id);
            if (subject == null)
                return NotFound();

            return Ok(subject);
        }

        // POST: api/Subjects
        public IHttpActionResult PostSubject(Subject subject)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            db.Subjects.Add(subject);
            db.SaveChanges();

            return CreatedAtRoute("DefaultApi", new { id = subject.SubjectID }, subject);
        }

        // PUT: api/Subjects/5
        public IHttpActionResult PutSubject(int id, Subject subject)
        {
            if (!ModelState.IsValid || id != subject.SubjectID)
                return BadRequest();

            db.Entry(subject).State = System.Data.Entity.EntityState.Modified;
            db.SaveChanges();

            return StatusCode(System.Net.HttpStatusCode.NoContent);
        }

        // DELETE: api/Subjects/5
        public IHttpActionResult DeleteSubject(int id)
        {
            var subject = db.Subjects.Find(id);
            if (subject == null)
                return NotFound();

            db.Subjects.Remove(subject);
            db.SaveChanges();

            return Ok(subject);
        }

        [HttpGet]
        [Route("api/Subjects/StudentsBySubject/{subjectId}")]
        public IHttpActionResult GetStudentsBySubject(int subjectId)
        {
            var result = (from a in db.Enrollments
                          join b in db.Courses on a.CourseID equals b.CourseID
                          join c in db.Subjects on a.SubjectID equals c.SubjectID
                          join d in db.Users on a.StudentID equals d.UserID
                          where a.SubjectID == subjectId  
                          orderby a.SubjectID ascending
                          select new
                          {
                              a.EnrollmentID,
                              CourseID = a.CourseID,
                              b.CourseName,
                              SubjectID = a.SubjectID,
                              c.SubjectName,
                              a.StudentID,
                              d.Username,
                              d.FirstName,
                              d.LastName,
                              a.EnrollmentDate,
                              a.IsActive
                          }).ToList();
            return Ok(result);
        }
    }
}



