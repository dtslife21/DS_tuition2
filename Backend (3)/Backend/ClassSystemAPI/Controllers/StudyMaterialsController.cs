using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Web.Http;
using ClassSystemAPI.Models;

namespace ClassSystemAPI.Controllers
{
    [RoutePrefix("api/studymaterials")]
    public class StudyMaterialsController : ApiController
    {
        private ClassSystemContext db = new ClassSystemContext();

        // GET: api/studymaterials
        [HttpGet]
        [Route("")]
        public IHttpActionResult GetAllMaterials()
        {
            var materials = db.StudyMaterials
                .Include(m => m.Course)
                .Include(m => m.Teacher)
                .Where(m => m.IsVisible)
                .ToList();

            return Ok(materials);
        }

        // GET: api/studymaterials/course/5
        [HttpGet]
        [Route("course/{courseId}")]
        public IHttpActionResult GetMaterialsByCourse(int courseId)
        {
            var materials = db.StudyMaterials
                .Include(m => m.Course)
                .Include(m => m.Teacher)
                .Where(m => m.CourseID == courseId && m.IsVisible)
                .ToList();

            if (!materials.Any())
            {
                return NotFound();
            }

            return Ok(materials);
        }

        // NEW: api/studymaterials/student/{studentId}
        [HttpGet]
        [Route("student/{studentId}")]
        public IHttpActionResult GetMaterialsForStudent(int studentId)
        {
            var studentExists = db.Students.Any(s => s.StudentID == studentId);
            if (!studentExists) return NotFound();

            var courseIds = db.Enrollments
                .Where(e => e.StudentID == studentId && e.IsActive)
                .Select(e => e.CourseID);

            var materials = db.StudyMaterials
                .Where(m => m.IsVisible && courseIds.Contains(m.CourseID))
                .Include(m => m.Course)
                .Include(m => m.Teacher.User)
                .OrderByDescending(m => m.UploadDate)
                .Select(m => new
                {
                    m.MaterialID,
                    m.Title,
                    m.Description,
                    m.FilePath,
                    m.FileType,
                    m.UploadDate,
                    Course = new
                    {
                        m.Course.CourseID,
                        m.Course.CourseName,
                        m.Course.CourseCode
                    },
                    Teacher = m.Teacher == null ? null : new
                    {
                        m.Teacher.TeacherID,
                        FirstName = m.Teacher.User.FirstName,
                        LastName = m.Teacher.User.LastName,
                        Username = m.Teacher.User.Username
                    }
                })
                .ToList();

            return Ok(materials);
        }

        // GET: api/studymaterials/5
        // Named route so CreatedAtRoute in POST can resolve
        [HttpGet]
        [Route("{id}", Name = "GetStudyMaterialById")]
        public IHttpActionResult GetMaterial(int id)
        {
            // Return material details regardless of IsVisible flag.
            var material = db.StudyMaterials
                .Include(m => m.Course)
                .Include(m => m.Teacher)
                .FirstOrDefault(m => m.MaterialID == id);

            if (material == null)
            {
                return NotFound();
            }

            return Ok(material);
        }


        //[HttpGet]
        //[Route("{id}", Name = "GetStudyMaterialById")]
        //public async Task<IHttpActionResult> GetStudyMaterial(int id)
        //{
        //    var material = await db.StudyMaterials.FindAsync(id);
        //    if (material == null) return NotFound();
        //    return Ok(material);
        //}


        // POST: api/studymaterials
        [HttpPost]
        [Route("")]
        public async Task<IHttpActionResult> PostStudyMaterial(StudyMaterial material)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Verify the teacher exists
            var teacher = await db.Teachers.FindAsync(material.TeacherID);
            if (teacher == null)
            {
                return BadRequest("Invalid Teacher ID");
            }

            // Verify the course exists
            var course = await db.Courses.FindAsync(material.CourseID);
            if (course == null)
            {
                return BadRequest("Invalid Course ID");
            }

            material.UploadDate = DateTime.Now;
            db.StudyMaterials.Add(material);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Return server error with message to help debugging (can be tightened later)
                return InternalServerError(ex);
            }

            // Use the named GET route so caller receives a Location header that resolves.
            return CreatedAtRoute("GetStudyMaterialById", new { id = material.MaterialID }, material);

        }

        // PUT: api/studymaterials/5
        [HttpPut]
        [Route("{id}")]
        public async Task<IHttpActionResult> PutStudyMaterial(int id, StudyMaterial material)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (id != material.MaterialID)
            {
                return BadRequest();
            }

            db.Entry(material).State = EntityState.Modified;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (Exception)
            {
                if (!StudyMaterialExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return StatusCode(HttpStatusCode.NoContent);
        }

        // DELETE: api/studymaterials/5
        [HttpDelete]
        [Route("{id}")]
        public async Task<IHttpActionResult> DeleteStudyMaterial(int id)
        {
            var material = await db.StudyMaterials.FindAsync(id);
            if (material == null)
            {
                return NotFound();
            }

            // Perform permanent delete (hard delete)
            db.StudyMaterials.Remove(material);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // If DB constraint prevents delete, return a helpful error.
                return InternalServerError(ex);
            }

            return Ok(new { Message = "Study material permanently deleted", materialId = id });
        }

        //protected override void Dispose(bool disposing)
        //{
        //    if (disposing)
        //    {
        //        db.Dispose();
        //    }
        //    base.Dispose(disposing);
        //}

        private bool StudyMaterialExists(int id)
        {
            return db.StudyMaterials.Count(e => e.MaterialID == id) > 0;
        }
    }
}