using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using ClassSystemAPI.Models;

namespace ClassSystemAPI.Controllers
{

    public class TeachersController : ApiController
    {
        private ClassSystemContext db = new ClassSystemContext();

        [HttpGet]
        public IHttpActionResult GetTeachers()
        {
            var teachers = db.Teachers.Include("User").ToList();
            return Ok(teachers);
        }

        [HttpGet]
        public IHttpActionResult GetTeacher(int id)
        {
            var teacher = db.Teachers.Include("User").FirstOrDefault(t => t.TeacherID == id);
            if (teacher == null) return NotFound();
            return Ok(teacher);
        }

        [HttpPost]
        public IHttpActionResult PostTeacher(Teacher teacher)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            db.Teachers.Add(teacher);
            db.SaveChanges();
            return Ok(teacher);
        }
    }
}