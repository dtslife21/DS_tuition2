using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.ComponentModel.DataAnnotations;

namespace ClassSystemAPI.Models
{
    public class Subject
    {
        [Key]
        public int SubjectID { get; set; }

        [Required]
        public string SubjectName { get; set; }

        public string SubjectCode { get; set; }

        public string Description { get; set; }
    }
}