using System.Linq;
using System.Net;
using System.Web.Http;
using System.Data.Entity;
using ClassSystemAPI.Models;

namespace ClassSystemAPI.Controllers
{
    public class AnnouncementsController : ApiController
    {
        private ClassSystemContext db = new ClassSystemContext();

        // GET: api/Announcements
        public IQueryable<Announcement> GetAnnouncements()
        {
            return db.Announcements.Include(a => a.Course).Include(a => a.Teacher);
        }

        // GET: api/Announcements/5
        public IHttpActionResult GetAnnouncement(int id)
        {
            var announcement = db.Announcements.Find(id);
            if (announcement == null)
                return NotFound();

            return Ok(announcement);
        }

        // POST: api/Announcements
        public IHttpActionResult PostAnnouncement(Announcement announcement)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            db.Announcements.Add(announcement);
            db.SaveChanges();

            return CreatedAtRoute("DefaultApi", new { id = announcement.AnnouncementID }, announcement);
        }

        // PUT: api/Announcements/5
        public IHttpActionResult PutAnnouncement(int id, Announcement announcement)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (id != announcement.AnnouncementID)
                return BadRequest();

            db.Entry(announcement).State = EntityState.Modified;
            db.SaveChanges();

            return StatusCode(HttpStatusCode.NoContent);
        }

        // DELETE: api/Announcements/5
        public IHttpActionResult DeleteAnnouncement(int id)
        {
            var announcement = db.Announcements.Find(id);
            if (announcement == null)
                return NotFound();

            db.Announcements.Remove(announcement);
            db.SaveChanges();

            return Ok(announcement);
        }
    }
}
