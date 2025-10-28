using ClassSystemAPI.Models;
using System;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Web.Http;
using System.Web.Http.Cors;

namespace ClassSystemAPI.Controllers
{
    public class UsersController : ApiController
    {
        private ClassSystemContext db = new ClassSystemContext();


        [EnableCors(origins: "http://localhost:3000", headers: "*", methods: "*")]
        // Helper method to add logs
        private void AddLog(int? userId, string action, string details = null)
        {
            var log = new SystemLog
            {
                UserID = userId,
                Action = action,
                Details = details,
                IPAddress = GetClientIpAddress(),
                LogTime = DateTime.Now
            };
            db.SystemLogs.Add(log);
            db.SaveChanges();
        }

        private string GetClientIpAddress()
        {
            if (System.Web.HttpContext.Current == null)
                return null;

            var request = System.Web.HttpContext.Current.Request;

            var ipAddress = request.ServerVariables["HTTP_X_FORWARDED_FOR"];

            if (string.IsNullOrEmpty(ipAddress))
                return request.ServerVariables["REMOTE_ADDR"];

            var addresses = ipAddress.Split(',');
            if (addresses.Length != 0)
                return addresses[0];

            return request.ServerVariables["REMOTE_ADDR"];
        }

        //login
        [HttpPost]
        [Route("api/Users/Login")]
        public IHttpActionResult Login(LoginRequest request)
        {
            if (!ModelState.IsValid)
            {
                AddLog(null, "LoginFailed", "Invalid request model");
                return BadRequest(ModelState);
            }

            var user = db.Users
                         .Include(u => u.UserType)
                         .FirstOrDefault(u => u.Username == request.Username && u.PasswordHash == request.Password); 

            if (user == null)
            {
                AddLog(null, "LoginFailed", $"Invalid credentials for username: {request.Username}");
                return Unauthorized();  
            }

            AddLog(user.UserID, "LoginSuccess", $"User '{request.Username}' logged in successfully");

            return Ok(new
            {
                user.UserID,
                user.Username,
                user.UserTypeID,
                UserTypeName = user.UserType?.TypeName
            });
        }
        // GET: api/Users
        public IHttpActionResult GetUsers()
        {
            var users = db.Users.Include("UserType").ToList();
            AddLog(null, "GetAllUsers", $"Retrieved {users.Count} users");
            return Ok(users);
        }

        // GET: api/Users/5
        public IHttpActionResult GetUser(int id)
        {
            var user = db.Users.Find(id);
            if (user == null)
            {
                AddLog(null, "GetUserFailed", $"User with ID {id} not found");
                return NotFound();
            }

            AddLog(null, "GetUser", $"Retrieved user with ID {id}");
            return Ok(user);
        }

        // POST: api/Users
        public IHttpActionResult PostUser(User user)
        {
            if (!ModelState.IsValid)
            {
                AddLog(null, "CreateUserFailed", "Invalid model state");
                return BadRequest(ModelState);
            }

            db.Users.Add(user);
            db.SaveChanges();

            AddLog(null, "UserCreated", $"Created new user with ID {user.UserID}");
            return CreatedAtRoute("DefaultApi", new { id = user.UserID }, user);
        }

        // PUT: api/Users/5
        public IHttpActionResult PutUser(int id, User user)
        {
            if (!ModelState.IsValid)
            {
                AddLog(null, "UpdateUserFailed", "Invalid model state");
                return BadRequest(ModelState);
            }

            if (id != user.UserID)
            {
                AddLog(null, "UpdateUserFailed", "ID mismatch");
                return BadRequest();
            }

            db.Entry(user).State = EntityState.Modified;

            try
            {
                db.SaveChanges();
                AddLog(user.UserID, "UserUpdated", $"User with ID {id} updated");
            }
            catch (Exception ex)
            {
                if (!UserExists(id))
                {
                    AddLog(null, "UpdateUserFailed", $"User with ID {id} not found");
                    return NotFound();
                }
                else
                {
                    AddLog(null, "UpdateUserError", ex.Message);
                    throw;
                }
            }

            return StatusCode(HttpStatusCode.NoContent);
        }

        // DELETE: api/Users/5
        public IHttpActionResult DeleteUser(int id)
        {
            var user = db.Users.Find(id);
            if (user == null) return NotFound();

            var student = db.Students.Find(id);
            if (student != null)
            {
                var enrollments = db.Enrollments.Where(e => e.StudentID == id).ToList();
                if (enrollments.Any())
                    db.Enrollments.RemoveRange(enrollments);

                db.Students.Remove(student);
            }

            var teacher = db.Teachers.Find(id);
            if (teacher != null) db.Teachers.Remove(teacher);

            db.SystemLogs.Where(l => l.UserID == id).ToList().ForEach(l => l.UserID = null);
            db.SaveChanges();

            db.Users.Remove(user);
            db.SaveChanges();

            AddLog(null, "UserDeleted", $"User with ID {id} deleted");
            return Ok(user);
        }

        private bool UserExists(int id)
        {
            return db.Users.Count(e => e.UserID == id) > 0;
        }

        //protected override void Dispose(bool disposing)
        //{
        //    if (disposing)
        //    {
        //        db.Dispose();
        //    }
        //    base.Dispose(disposing);
        //}
    }
}