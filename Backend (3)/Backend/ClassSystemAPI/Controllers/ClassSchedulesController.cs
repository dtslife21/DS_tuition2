using System.Linq;
using System.Net;
using System.Web.Http;
using System.Data.Entity;
using ClassSystemAPI.Models;

namespace ClassSystemAPI.Controllers
{
    public class ClassSchedulesController : ApiController
    {
        private ClassSystemContext db = new ClassSystemContext();

        // GET: api/ClassSchedules
        public IQueryable<ClassSchedule> GetClassSchedules()
        {
            return db.ClassSchedules.Include(cs => cs.Course);
        }

        // GET: api/ClassSchedules/5
        public IHttpActionResult GetClassSchedule(int id)
        {
            var schedule = db.ClassSchedules.Find(id);
            if (schedule == null)
                return NotFound();

            return Ok(schedule);
        }

        // POST: api/ClassSchedules
        public IHttpActionResult PostClassSchedule(ClassSchedule classSchedule)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            db.ClassSchedules.Add(classSchedule);
            db.SaveChanges();

            return CreatedAtRoute("DefaultApi", new { id = classSchedule.ScheduleID }, classSchedule);
        }

        // PUT: api/ClassSchedules/5
        public IHttpActionResult PutClassSchedule(int id, ClassSchedule classSchedule)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (id != classSchedule.ScheduleID)
                return BadRequest();

            db.Entry(classSchedule).State = EntityState.Modified;

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

        // DELETE: api/ClassSchedules/5
        public IHttpActionResult DeleteClassSchedule(int id)
        {
            var schedule = db.ClassSchedules.Find(id);
            if (schedule == null)
                return NotFound();

            db.ClassSchedules.Remove(schedule);
            db.SaveChanges();

            return Ok(schedule);
        }
    }
}
