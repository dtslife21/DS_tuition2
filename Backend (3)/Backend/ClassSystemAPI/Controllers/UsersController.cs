using ClassSystemAPI.Models;
using System;
using System.Data.Entity;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Hosting;
using System.Web.Http;
using System.Web.Http.Cors;
using Newtonsoft.Json;

namespace ClassSystemAPI.Controllers
{
    [EnableCors(origins: "http://localhost:3000", headers: "*", methods: "*")]
    public class UsersController : ApiController
    {
        private ClassSystemContext db = new ClassSystemContext();


        
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

        // login
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

            // Prevent login if user is inactive — return structured JSON + 403
            if (!user.IsActive)
            {
                AddLog(user.UserID, "LoginBlockedInactive", $"Attempt to login by inactive user: {request.Username}");

                var responseObj = new
                {
                    error = "AccountInactive",
                    message = "Your account is inactive. Please contact the administrator to reactivate your account."
                };

                return Content(HttpStatusCode.Forbidden, responseObj);
            }

            // Update last login time
            user.LastLogin = DateTime.Now;
            db.SaveChanges();

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

        // POST: api/Users/UploadProfile
        [HttpPost]
        [Route("api/Users/UploadProfile")]
        public IHttpActionResult UploadProfilePhoto()
        {
            var httpRequest = HttpContext.Current.Request;

            if (httpRequest == null)
            {
                AddLog(null, "UploadProfileFailed", "No http request available");
                return BadRequest("Invalid request");
            }

            // Expect a form field named "userId" (or "UserID")
            var userIdStr = httpRequest.Form["userId"] ?? httpRequest.Form["UserID"];
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
            {
                AddLog(null, "UploadProfileFailed", "Missing or invalid 'userId'");
                return BadRequest("'userId' form field is required.");
            }

            var user = db.Users.Find(userId);
            if (user == null)
            {
                AddLog(null, "UploadProfileFailed", $"User with ID {userId} not found");
                return NotFound();
            }

            if (httpRequest.Files == null || httpRequest.Files.Count == 0)
            {
                AddLog(userId, "UploadProfileFailed", "No file provided");
                return BadRequest("No file uploaded");
            }

            var postedFile = httpRequest.Files[0];

            // Validate file extension
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
            var fileExt = Path.GetExtension(postedFile.FileName)?.ToLowerInvariant();
            if (string.IsNullOrEmpty(fileExt) || !allowedExtensions.Contains(fileExt))
            {
                AddLog(userId, "UploadProfileFailed", $"Invalid file type: {postedFile.FileName}");
                return BadRequest("Invalid file type. Allowed: .jpg, .jpeg, .png, .gif");
            }

            // Max 5 MB example
            const int maxBytes = 5 * 1024 * 1024;
            if (postedFile.ContentLength > maxBytes)
            {
                AddLog(userId, "UploadProfileFailed", $"File too large: {postedFile.ContentLength} bytes");
                return BadRequest("File size exceeds limit (5 MB).");
            }

            var uploadsVirtualFolder = "/Uploads/ProfilePhotos";
            var uploadsPath = HostingEnvironment.MapPath("~" + uploadsVirtualFolder);
            if (uploadsPath == null)
            {
                AddLog(userId, "UploadProfileFailed", "Unable to resolve uploads path");
                return InternalServerError(new Exception("Unable to resolve uploads path"));
            }

            Directory.CreateDirectory(uploadsPath);

            var fileName = Guid.NewGuid().ToString("N") + fileExt;
            var physicalFilePath = Path.Combine(uploadsPath, fileName);

            try
            {
                postedFile.SaveAs(physicalFilePath);
            }
            catch (Exception ex)
            {
                AddLog(userId, "UploadProfileFailed", "Error saving file: " + ex.Message);
                return InternalServerError(ex);
            }

            // Save virtual path in DB: e.g. "/Uploads/ProfilePhotos/{fileName}"
            user.ProfilePicture = uploadsVirtualFolder + "/" + fileName;

            try
            {
                db.Entry(user).State = EntityState.Modified;
                db.SaveChanges();
                AddLog(userId, "ProfilePhotoUploaded", $"Updated ProfilePicture for user {userId} to {user.ProfilePicture}");
            }
            catch (Exception ex)
            {
                AddLog(userId, "UploadProfileFailed", "DB update error: " + ex.Message);
                return InternalServerError(ex);
            }

            // Return the path so frontend can save it to DB (or this saved it already) — consistent with frontend expectation
            return Ok(new { filePath = user.ProfilePicture });
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