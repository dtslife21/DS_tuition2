using System.Data.Entity;

namespace ClassSystemAPI.Models
{
    public class ClassSystemContext : DbContext
    {
        public ClassSystemContext() : base("name=ClassSystemDB") { }

        public DbSet<User> Users { get; set; }
        public DbSet<UserType> UserTypes { get; set; }
        public DbSet<Teacher> Teachers { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<Course> Courses { get; set; }
        public DbSet<ClassSchedule> ClassSchedules { get; set; }
        public DbSet<Enrollment> Enrollments { get; set; }
        public DbSet<Announcement> Announcements { get; set; }
        public DbSet<StudyMaterial> StudyMaterials { get; set; }
        public DbSet<SystemLog> SystemLogs { get; set; }

        public DbSet<QRSession> QRSessions { get; set; }
        public DbSet<Attendance> Attendances { get; set; }

        

    }
}
