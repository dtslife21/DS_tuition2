using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClassSystemAPI.Models
{
    public class ClassSchedule
    {
        [Key]
        public int ScheduleID { get; set; }

        public int CourseID { get; set; }

        public byte DayOfWeek { get; set; } // 1 = Sunday, 2 = Monday...

        public TimeSpan StartTime { get; set; }

        public TimeSpan EndTime { get; set; }

        [StringLength(20)]
        public string RoomNumber { get; set; }

        public bool IsRecurring { get; set; } = true;

        // Navigation
        [ForeignKey("CourseID")]
        public virtual Course Course { get; set; }
    }
}
