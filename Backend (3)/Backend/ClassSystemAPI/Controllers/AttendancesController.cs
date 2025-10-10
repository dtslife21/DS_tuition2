using System;
using System.Data.Entity;
using System.Data.Entity.Spatial;
using System.Linq;
using System.Net;
using System.Web.Http;
using ClassSystemAPI.Models;

namespace ClassSystemAPI.Controllers
{
    public class AttendancesController : ApiController
    {
        private ClassSystemContext db = new ClassSystemContext();

        // GET: api/Attendances
        public IHttpActionResult GetAttendances()
        {
            var attendances = db.Attendances
                .Include(a => a.QRSession)
                .Include(a => a.Student)
                .ToList();
            return Ok(attendances);
        }

        // GET: api/Attendances/5
        public IHttpActionResult GetAttendance(int id)
        {
            var attendance = db.Attendances
                .Include(a => a.QRSession)
                .Include(a => a.Student)
                .FirstOrDefault(a => a.AttendanceID == id);

            if (attendance == null)
            {
                return NotFound();
            }

            return Ok(attendance);
        }

        // POST: api/Attendances
        public IHttpActionResult PostAttendance(Attendance attendance)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Verify the QR session is valid and active
            var session = db.QRSessions.Find(attendance.SessionID);
            if (session == null || !session.IsActive || DateTime.Now > session.ExpiryTime)
            {
                return BadRequest("Invalid or expired QR session");
            }

            // Set default values
            attendance.ScanTime = DateTime.Now;
            attendance.Status = "Present"; // Default status

            db.Attendances.Add(attendance);
            db.SaveChanges();

            return CreatedAtRoute("DefaultApi", new { id = attendance.AttendanceID }, attendance);
        }

        // POST: api/Attendances/Record - Record attendance via QR code
        [Route("api/Attendances/Record")]
        public IHttpActionResult RecordAttendance(RecordAttendanceRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Find the active session
            var session = db.QRSessions
                .FirstOrDefault(q => q.QRCodeData == request.QRCodeData &&
                                   q.IsActive &&
                                   DateTime.Now >= q.StartTime &&
                                   DateTime.Now <= q.ExpiryTime);

            if (session == null)
            {
                return BadRequest("Invalid or expired QR session");
            }

            // Check if attendance already recorded
            var existingAttendance = db.Attendances
                .FirstOrDefault(a => a.SessionID == session.SessionID &&
                                   a.StudentID == request.StudentID);

            if (existingAttendance != null)
            {
                return BadRequest("Attendance already recorded for this session");
            }

            // Create new attendance record
            var attendance = new Attendance
            {
                SessionID = session.SessionID,
                StudentID = request.StudentID,
                ScanTime = DateTime.Now,
                DeviceInfo = request.DeviceInfo,
                IPAddress = request.IPAddress,
                Location = request.Location,
                Status = DateTime.Now > session.EndTime ? "Late" : "Present"
            };

            db.Attendances.Add(attendance);
            db.SaveChanges();

            return Ok(attendance);
        }

        // GET: api/Attendances/Session/5 - Get attendances for a session
        [Route("api/Attendances/Session/{sessionId}")]
        public IHttpActionResult GetAttendancesBySession(int sessionId)
        {
            var attendances = db.Attendances
                .Where(a => a.SessionID == sessionId)
                .Include(a => a.Student)
                .ToList();

            return Ok(attendances);
        }

        // GET: api/Attendances/Student/5 - Get attendances for a student
        [Route("api/Attendances/Student/{studentId}")]
        public IHttpActionResult GetAttendancesByStudent(int studentId)
        {
            var attendances = db.Attendances
                .Where(a => a.StudentID == studentId)
                .Include(a => a.QRSession)
                .Include(a => a.QRSession.Course)
                .ToList();

            return Ok(attendances);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
        }
    }

    // Request model for recording attendance
    public class RecordAttendanceRequest
    {
        public string QRCodeData { get; set; }
        public int StudentID { get; set; }
        public string DeviceInfo { get; set; }
        public string IPAddress { get; set; }
        public DbGeography Location { get; set; }
    }
}