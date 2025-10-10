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
    }
}