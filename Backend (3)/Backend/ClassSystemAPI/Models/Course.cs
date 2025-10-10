using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClassSystemAPI.Models
{
    public class Course
    {
        [Key]
        public int CourseID { get; set; }

        [Required]
        [StringLength(100)]
        public string CourseName { get; set; }

        [StringLength(20)]
        public string CourseCode { get; set; }

        public int SubjectID { get; set; }
        public int TeacherID { get; set; }

        [StringLength(20)]
        public string AcademicYear { get; set; }

        public string Description { get; set; }

        public bool IsActive { get; set; }

        // Navigation properties
        [ForeignKey("SubjectID")]
        public virtual Subject Subject { get; set; }

        [ForeignKey("TeacherID")]
        public virtual Teacher Teacher { get; set; }
    }
}
