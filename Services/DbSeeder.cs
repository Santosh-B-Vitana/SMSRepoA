using SmsApi.Models.Constants;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Utils;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace SmsApi.Services
{
    /// <summary>
    /// Database seeder service for populating test data
    /// Uses mock data from frontend for consistency
    /// </summary>
    public interface IDbSeeder
    {
        Task SeedAllAsync();
        Task SeedSchoolAsync();
        Task SeedUsersAsync();
        Task SeedStudentsAsync();
        Task SeedStaffAsync();
        Task SeedClassesAsync();
        Task SeedSubjectsAsync();
        Task SeedClassSubjectsAsync();
        Task SeedTeacherAssignmentsAsync();
        Task SeedTimetableAsync();
        Task SeedTimetablePeriodsAsync();
    }

    public class DbSeeder : IDbSeeder
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DbSeeder> _logger;
        private Guid _schoolId;

        public DbSeeder(AppDbContext context, ILogger<DbSeeder> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task SeedAllAsync()
        {
            try
            {
                _logger.LogInformation("🌱 Starting database seeding...");

                // Use existing school ID for consistency
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

                // Check if data already exists
                if (await _context.Students.AnyAsync(s => s.SchoolId == _schoolId) &&
                    await _context.Classes.AnyAsync(c => c.SchoolId == _schoolId) &&
                    await _context.Subjects.AnyAsync(s => s.SchoolId == _schoolId))
                {
                    _logger.LogInformation("✅ Mock data already exists, skipping bulk seeding");
                    // Still run incremental seeders that have their own guards
                    await SeedLeaveTypesAsync();
                    await SeedTimetablePeriodsAsync();
                    return;
                }

                _logger.LogInformation("🔄 Adding comprehensive mock data...");
                
                await SeedStudentsAsync();
                await SeedStaffAsync();
                await SeedSubjectsAsync();
                await SeedClassSubjectsAsync();
                await SeedTeacherAssignmentsAsync();
                await SeedTimetableAsync();
                await SeedTimetablePeriodsAsync();
                await SeedFeeStructuresAsync();
                await SeedFeeRecordsAsync();
                await SeedLibraryBooksAsync();
                await SeedAttendanceRecordsAsync();
                await SeedLeaveTypesAsync();

                _logger.LogInformation("✅ Database seeding completed successfully!");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Warning during database seeding - proceeding anyway");
                // Don't throw - allow app to continue even if seeding fails
                // This allows us to test the API even with incomplete seeding
            }
        }

        public async Task SeedSchoolAsync()
        {
            _logger.LogInformation("📚 Seeding school...");

            _schoolId = Guid.NewGuid();
            var school = new School
            {
                Id = _schoolId,
                Name = "St. Mary's Senior Secondary School",
                SchoolCode = "SMSS001",
                Email = "info@stmarys.edu.in",
                Phone = "+91-9876543210",
                Address = "123 School Road, Mumbai, Maharashtra 400001",
                Logo = "/logo.svg",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Schools.Add(school);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ School seeded");
        }

        public async Task SeedUsersAsync()
        {
            _logger.LogInformation("👥 Seeding users...");

            var users = new List<UserLogin>
            {
                // Admin
                new UserLogin
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    Username = "admin",
                    Email = "admin@stmarys.edu.in",
                    FirstName = StatusConstants.Roles.Admin,
                    LastName = "User",
                    Role = "admin",
                    Status = "active",
                    PasswordHash = HashPassword("AdminDemo2026!"),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                // Teachers
                new UserLogin
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    Username = "msarah",
                    Email = "sarah.johnson@stmarys.edu.in",
                    FirstName = "Sarah",
                    LastName = "Johnson",
                    Role = "teacher",
                    Status = "active",
                    PasswordHash = HashPassword("Teacher@123"),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                new UserLogin
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    Username = "mjohn",
                    Email = "john.smith@stmarys.edu.in",
                    FirstName = "John",
                    LastName = "Smith",
                    Role = "teacher",
                    Status = "active",
                    PasswordHash = HashPassword("Teacher@123"),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                new UserLogin
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    Username = "mpriya",
                    Email = "priya.singh@stmarys.edu.in",
                    FirstName = "Priya",
                    LastName = "Singh",
                    Role = "teacher",
                    Status = "active",
                    PasswordHash = HashPassword("Teacher@123"),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                // Staff
                new UserLogin
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    Username = "mrajesh",
                    Email = "rajesh@stmarys.edu.in",
                    FirstName = "Rajesh",
                    LastName = "Kumar",
                    Role = "staff",
                    Status = "active",
                    PasswordHash = HashPassword("StaffDemo2026!"),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                new UserLogin
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    Username = "manita",
                    Email = "anita@stmarys.edu.in",
                    FirstName = "Anita",
                    LastName = "Sharma",
                    Role = "staff",
                    Status = "active",
                    PasswordHash = HashPassword("StaffDemo2026!"),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            _context.UserLogins.AddRange(users);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} users seeded", users.Count);
        }

        public async Task SeedStudentsAsync()
        {
            _logger.LogInformation("🎓 Seeding students...");

            var studentNames = new[]
            {
                ("Aarav", "Patel"), ("Ananya", "Sharma"), ("Arjun", "Singh"),
                ("Aisha", "Khan"), ("Avni", "Gupta"), ("Akshay", "Mishra"),
                ("Priya", "Verma"), ("Reyansh", "Kumar"), ("Riya", "Joshi"),
                ("Rohan", "Nair"), ("Sneha", "Iyer"), ("Siddharth", "Rao"),
                ("Sara", "Menon"), ("Tanvi", "Bhat"), ("Varun", "Desai"),
                ("Veena", "Rao"), ("Yash", "Pillai"), ("Yasmin", "Ahmed"),
                ("Zara", "Ali"), ("Zain", "Hassan"), ("Aarush", "Malhotra"),
                ("Aditi", "Saxena"), ("Aryan", "Kapoor"), ("Amira", "Mukherjee"),
                ("Aditya", "Chopra")
            };

            var students = new List<Student>();
            var classNum = 1;
            var sectionNum = 0;

            for (int i = 0; i < studentNames.Length; i++)
            {
                var student = new Student
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    Name = $"{studentNames[i].Item1} {studentNames[i].Item2}",
                    FirstName = studentNames[i].Item1,
                    LastName = studentNames[i].Item2,
                    RollNumber = (i + 1).ToString("D3"),
                    Email = $"{studentNames[i].Item1.ToLower()}.{studentNames[i].Item2.ToLower()}@student.stmarys.edu.in",
                    PrimaryPhone = $"+91-98765{i:D5}",
                    DateOfBirth = new DateTime(2010, Random.Shared.Next(1, 13), Random.Shared.Next(1, 28)),
                    Gender = i % 2 == 0 ? "Male" : "Female",
                    Address = $"Address Line {i + 1}, Mumbai",
                    GuardianName = $"Guardian of {studentNames[i].Item1}",
                    Status = "Active",
                    PhotoUrl = "/placeholder.svg",
                    AdmissionDate = DateTime.UtcNow.AddMonths(-Random.Shared.Next(1, 12)),
                    AdmissionNumber = $"ADM{DateTime.UtcNow.Year}{(i + 1):D4}",
                    Class = classNum.ToString(),
                    Section = ((char)('A' + sectionNum)).ToString(),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                students.Add(student);

                // Distribute students across classes and sections
                if ((i + 1) % 5 == 0)
                {
                    sectionNum++;
                    if (sectionNum >= 2)
                    {
                        sectionNum = 0;
                        classNum++;
                    }
                }
            }

            _context.Students.AddRange(students);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} students seeded", students.Count);
        }

        public async Task SeedStaffAsync()
        {
            _logger.LogInformation("👨‍💼 Seeding staff members...");

            var staffData = new[]
            {
                ("Rajesh", "Singh", "EMP001", "Principal", "Administration", "rajesh.singh@stmarys.edu.in"),
                ("Priya", "Verma", "EMP002", "Vice Principal", "Administration", "priya.verma@stmarys.edu.in"),
                ("Sarah", "Johnson", "EMP003", "Mathematics Teacher", "Academics", "sarah.johnson@stmarys.edu.in"),
                ("John", "Smith", "EMP004", "English Teacher", "Academics", "john.smith@stmarys.edu.in"),
                ("Meera", "Sharma", "EMP005", "Science Teacher", "Academics", "meera.sharma@stmarys.edu.in"),
                ("Vikram", "Patel", "EMP006", "History Teacher", "Academics", "vikram.patel@stmarys.edu.in"),
                ("Anjali", "Gupta", "EMP007", "Computer Science Teacher", "Academics", "anjali.gupta@stmarys.edu.in"),
                ("Rohan", "Kumar", "EMP008", "Physical Education Teacher", "Sports", "rohan.kumar@stmarys.edu.in"),
                ("Neha", "Singh", "EMP009", "Art Teacher", "Arts", "neha.singh@stmarys.edu.in"),
                ("Arjun", "Nair", "EMP010", "Music Teacher", "Arts", "arjun.nair@stmarys.edu.in"),
                ("Deepika", "Iyer", "EMP011", "Librarian", "Support Staff", "deepika.iyer@stmarys.edu.in"),
                ("Ashok", "Rao", "EMP012", "Accountant", "Administration", "ashok.rao@stmarys.edu.in")
            };

            var staffMembers = new List<Staff>();
            foreach (var (firstName, lastName, empId, designation, department, email) in staffData)
            {
                var staff = new Staff
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    EmployeeId = empId,
                    FirstName = firstName,
                    LastName = lastName,
                    Designation = designation,
                    Department = department,
                    Email = email,
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                staffMembers.Add(staff);
            }

            _context.StaffMembers.AddRange(staffMembers);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} staff members seeded", staffMembers.Count);
        }

        public async Task SeedClassesAsync()
        {
            _logger.LogInformation("📖 Seeding classes and sections...");

            var classes = new List<Class>();
            var sections = new List<Section>();

            for (int classNum = 1; classNum <= 5; classNum++)
            {
                var classId = Guid.NewGuid();
                var cls = new Class
                {
                    Id = classId,
                    SchoolId = _schoolId,
                    Name = $"Class {classNum}",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                classes.Add(cls);

                // Create 2 sections per class (A and B)
                for (int sectNum = 0; sectNum < 2; sectNum++)
                {
                    var section = new Section
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = _schoolId,
                        ClassId = classId,
                        Name = ((char)('A' + sectNum)).ToString(),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    sections.Add(section);
                }
            }

            _context.Classes.AddRange(classes);
            _context.Sections.AddRange(sections);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Classes} classes and {Sections} sections seeded", classes.Count, sections.Count);
        }

        public async Task SeedSubjectsAsync()
        {
            _logger.LogInformation("📚 Seeding subjects...");

            var subjects = new List<Subject>
            {
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Mathematics", Code = "MAT", CreatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "English", Code = "ENG", CreatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Science", Code = "SCI", CreatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Social Science", Code = "SOC", CreatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Hindi", Code = "HIN", CreatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Computer Science", Code = "CMP", CreatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Physical Education", Code = "PE", CreatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Art & Craft", Code = "ART", CreatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Music", Code = "MUS", CreatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Sanskrit", Code = "SKT", CreatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Environmental Studies", Code = "EVS", CreatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "General Knowledge", Code = "GK", CreatedAt = DateTime.UtcNow }
            };

            foreach (var subject in subjects)
            {
                subject.UpdatedAt = DateTime.UtcNow;
            }

            _context.Subjects.AddRange(subjects);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} subjects seeded", subjects.Count);
        }

        public async Task SeedTimetableAsync()
        {
            _logger.LogInformation("⏰ Seeding timetables (legacy entries)...");

            var sections = await _context.Sections.Take(2).ToListAsync();
            var subjects = await _context.Subjects.ToListAsync();
            var timetableEntries = new List<TimetableEntry>();

            var days = new[] { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" };
            var periods = new[] { (1, "09:00", "09:40"), (2, "09:40", "10:20"), (3, "10:40", "11:20"), (4, "11:20", "12:00") };

            foreach (var section in sections)
            {
                int subjectIndex = 0;
                foreach (var day in days)
                {
                    foreach (var (period, start, end) in periods)
                    {
                        var entry = new TimetableEntry
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = _schoolId,
                            SectionId = section.Id,
                            DayOfWeek = day,
                            Period = period,
                            SubjectId = subjects[subjectIndex % subjects.Count].Id,
                            TeacherId = null,
                            StartTime = start,
                            EndTime = end,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        timetableEntries.Add(entry);
                        subjectIndex++;
                    }
                }
            }

            _context.Timetable.AddRange(timetableEntries);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} legacy timetable entries seeded", timetableEntries.Count);
        }

        public async Task SeedTimetablePeriodsAsync()
        {
            _logger.LogInformation("📅 Seeding structured timetables for all classes...");

            // Skip if already seeded
            if (await _context.Timetables.AnyAsync(t => t.SchoolId == _schoolId))
            {
                _logger.LogInformation("✅ Structured timetables already seeded, skipping");
                return;
            }

            var classes = await _context.Classes
                .Where(c => c.SchoolId == _schoolId)
                .ToListAsync();

            var subjects = await _context.Subjects
                .Where(s => s.SchoolId == _schoolId)
                .ToListAsync();

            var teachers = await _context.StaffMembers
                .Where(s => s.SchoolId == _schoolId && !s.IsDeleted)
                .ToListAsync();

            if (!subjects.Any() || !classes.Any())
            {
                _logger.LogWarning("⚠️ No classes or subjects found. Skipping structured timetable seeding.");
                return;
            }

            // Use the current academic year from DB (isCurrent=true), fallback to date-based
            var academicYear = await _context.AcademicYears
                .Where(y => y.SchoolId == _schoolId && y.IsCurrent)
                .Select(y => y.Name)
                .FirstOrDefaultAsync();
            if (string.IsNullOrEmpty(academicYear))
            {
                var now = DateTime.UtcNow;
                var startYear = now.Month >= 4 ? now.Year : now.Year - 1;
                academicYear = $"{startYear}-{startYear + 1}";
            }
            _logger.LogInformation("📅 Creating timetables for academic year: {Year}", academicYear);
            var days = new[] { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" };

            // Structured period schedule: 8 periods per day
            var periodSchedule = new[]
            {
                (1, new TimeSpan(8,  0, 0), new TimeSpan(8,  45, 0), "lecture"),
                (2, new TimeSpan(8,  45, 0), new TimeSpan(9,  30, 0), "lecture"),
                (3, new TimeSpan(9,  30, 0), new TimeSpan(9,  45, 0), "break"),    // short break
                (4, new TimeSpan(9,  45, 0), new TimeSpan(10, 30, 0), "lecture"),
                (5, new TimeSpan(10, 30, 0), new TimeSpan(11, 15, 0), "lecture"),
                (6, new TimeSpan(11, 15, 0), new TimeSpan(12, 0,  0), "lecture"),
                (7, new TimeSpan(12, 0,  0), new TimeSpan(12, 45, 0), "lunch"),    // lunch break
                (8, new TimeSpan(12, 45, 0), new TimeSpan(13, 30, 0), "lecture"),
            };

            int teacherIndex = 0;
            int subjectIndex = 0;

            foreach (var cls in classes)
            {
                // Create one timetable per class (no section)
                var timetable = new Timetable
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    ClassId = cls.Id,
                    SectionId = null,
                    AcademicYear = academicYear,
                    Status = "active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                };

                _context.Timetables.Add(timetable);

                // Create periods for each day
                foreach (var day in days)
                {
                    foreach (var (periodNum, startTime, endTime, periodType) in periodSchedule)
                    {
                        bool isBreak = periodType is "break" or "lunch";
                        Guid? subjectId = isBreak ? null : subjects[subjectIndex % subjects.Count].Id;
                        Guid? teacherId = isBreak ? null : (teachers.Any() ? teachers[teacherIndex % teachers.Count].Id : (Guid?)null);

                        var period = new TimetablePeriod
                        {
                            Id = Guid.NewGuid(),
                            TimetableId = timetable.Id,
                            DayOfWeek = day,
                            PeriodNumber = periodNum,
                            StartTime = startTime,
                            EndTime = endTime,
                            SubjectId = subjectId,
                            TeacherId = teacherId,
                            PeriodType = periodType,
                            Room = isBreak ? null : $"Room-{(periodNum % 5) + 101}",
                            Notes = null,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow,
                            IsDeleted = false
                        };

                        _context.TimetablePeriods.Add(period);

                        if (!isBreak)
                        {
                            subjectIndex++;
                            if (teachers.Any()) teacherIndex++;
                        }
                    }
                }

                // Also create per-section timetables if sections exist
                var classSections = await _context.Sections
                    .Where(s => s.ClassId == cls.Id && !s.IsDeleted)
                    .ToListAsync();

                foreach (var section in classSections)
                {
                    // Check uniqueness: skip if timetable already created for this class+section+year
                    var sectionTimetable = new Timetable
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = _schoolId,
                        ClassId = cls.Id,
                        SectionId = section.Id,
                        AcademicYear = academicYear,
                        Status = "active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        IsDeleted = false
                    };

                    _context.Timetables.Add(sectionTimetable);

                    foreach (var day in days)
                    {
                        foreach (var (periodNum, startTime, endTime, periodType) in periodSchedule)
                        {
                            bool isBreak = periodType is "break" or "lunch";
                            Guid? subjectId = isBreak ? null : subjects[subjectIndex % subjects.Count].Id;
                            Guid? teacherId = isBreak ? null : (teachers.Any() ? teachers[teacherIndex % teachers.Count].Id : (Guid?)null);

                            var period = new TimetablePeriod
                            {
                                Id = Guid.NewGuid(),
                                TimetableId = sectionTimetable.Id,
                                DayOfWeek = day,
                                PeriodNumber = periodNum,
                                StartTime = startTime,
                                EndTime = endTime,
                                SubjectId = subjectId,
                                TeacherId = teacherId,
                                PeriodType = periodType,
                                Room = isBreak ? null : $"Room-{(periodNum % 5) + 101}",
                                Notes = null,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow,
                                IsDeleted = false
                            };

                            _context.TimetablePeriods.Add(period);

                            if (!isBreak)
                            {
                                subjectIndex++;
                                if (teachers.Any()) teacherIndex++;
                            }
                        }
                    }
                }
            }

            await _context.SaveChangesAsync();

            var timetableCount = await _context.Timetables.CountAsync(t => t.SchoolId == _schoolId);
            var schoolTimetableIds = await _context.Timetables
                .Where(t => t.SchoolId == _schoolId)
                .Select(t => t.Id)
                .ToListAsync();
            var periodCount = await _context.TimetablePeriods
                .CountAsync(tp => schoolTimetableIds.Contains(tp.TimetableId));
            _logger.LogInformation("✅ Structured timetables seeded: {Timetables} timetables, {Periods} periods", timetableCount, periodCount);
        }

        public async Task SeedClassSubjectsAsync()
        {
            _logger.LogInformation("📖 Seeding class-subject assignments...");

            var classes = await _context.Classes.Where(c => c.SchoolId == _schoolId).ToListAsync();
            var subjects = await _context.Subjects.Where(s => s.SchoolId == _schoolId).ToListAsync();
            var teachers = await _context.StaffMembers
                .Where(s => s.SchoolId == _schoolId && s.Designation.Contains("Teacher"))
                .ToListAsync();

            var classSubjects = new List<ClassSubject>();
            var teacherIndex = 0;

            foreach (var cls in classes)
            {
                // Assign all subjects to each class
                for (int i = 0; i < subjects.Count; i++)
                {
                    var classSubject = new ClassSubject
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = _schoolId,
                        ClassId = cls.Id,
                        SubjectId = subjects[i].Id,
                        TeacherId = teachers.Count > 0 ? teachers[teacherIndex % teachers.Count].Id : null,
                        MaxMarks = 100,
                        Credits = 4,
                        IsMandatory = i < 6, // First 6 subjects are mandatory
                        Status = "active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    classSubjects.Add(classSubject);
                    teacherIndex++;
                }
            }

            _context.ClassSubjects.AddRange(classSubjects);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} class-subject assignments seeded", classSubjects.Count);
        }

        public async Task SeedTeacherAssignmentsAsync()
        {
            _logger.LogInformation("👨‍🏫 Seeding teacher assignments...");

            var classes = await _context.Classes.Where(c => c.SchoolId == _schoolId).ToListAsync();
            var sections = await _context.Sections.Where(s => s.SchoolId == _schoolId).ToListAsync();
            var teachers = await _context.StaffMembers
                .Where(s => s.SchoolId == _schoolId && s.Designation.Contains("Teacher"))
                .ToListAsync();

            var teacherAssignments = new List<TeacherAssignment>();
            var teacherIndex = 0;

            foreach (var cls in classes)
            {
                var classSections = sections.Where(s => s.ClassId == cls.Id).ToList();
                
                // Assign class teacher
                if (teachers.Count > 0)
                {
                    var classTeacher = teachers[teacherIndex % teachers.Count];
                    var assignment = new TeacherAssignment
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = _schoolId,
                        StaffId = classTeacher.Id,
                        ClassId = cls.Id,
                        SectionId = classSections.Count > 0 ? classSections[0].Id : null,
                        SubjectId = null,
                        IsClassTeacher = true,
                        AcademicYear = "2024-2025",
                        Status = "active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    teacherAssignments.Add(assignment);
                    teacherIndex++;
                }

                // Assign subject teachers
                var subjects = await _context.Subjects.Where(s => s.SchoolId == _schoolId).Take(6).ToListAsync();
                foreach (var subject in subjects)
                {
                    if (teachers.Count > 0)
                    {
                        var subjectTeacher = teachers[teacherIndex % teachers.Count];
                        var assignment = new TeacherAssignment
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = _schoolId,
                            StaffId = subjectTeacher.Id,
                            ClassId = cls.Id,
                            SectionId = null,
                            SubjectId = subject.Id,
                            IsClassTeacher = false,
                            AcademicYear = "2024-2025",
                            Status = "active",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        teacherAssignments.Add(assignment);
                        teacherIndex++;
                    }
                }
            }

            _context.TeacherAssignments.AddRange(teacherAssignments);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} teacher assignments seeded", teacherAssignments.Count);
        }

        /// <summary>
        /// Simple password hashing (for testing only - use proper hashing in production)
        /// </summary>
        private string HashPassword(string password)
        {
            using (var sha = System.Security.Cryptography.SHA256.Create())
            {
                var hashedBuffer = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBuffer);
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Fee Structures — one per class (Primary, Middle, High, Higher)
        // ─────────────────────────────────────────────────────────────────────
        public async Task SeedFeeStructuresAsync()
        {
            if (await _context.FeeStructures.AnyAsync(f => f.SchoolId == _schoolId))
            {
                _logger.LogInformation("Fee structures already seeded");
                return;
            }

            var academicYear = "2026-2027";
            var feeStructures = new List<FeeStructure>
            {
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Primary (Class 1–5) Annual", Class = "Class 1", AcademicYear = academicYear, TuitionFee = 36000, AdmissionFee = 2000, ExamFee = 1500, LibraryFee = 500, LabFee = 0, SportsFee = 800, UniformFee = 1200, BooksFee = 2000, DevelopmentFee = 1000, TotalAmount = 45000, InstallmentCount = 3, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Middle School (Class 6–8) Annual", Class = "Class 6", AcademicYear = academicYear, TuitionFee = 42000, AdmissionFee = 2000, ExamFee = 2000, LibraryFee = 800, LabFee = 1500, SportsFee = 1000, UniformFee = 1200, BooksFee = 2500, DevelopmentFee = 1500, TotalAmount = 54500, InstallmentCount = 3, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "High School (Class 9–10) Annual", Class = "Class 9", AcademicYear = academicYear, TuitionFee = 52000, AdmissionFee = 2500, ExamFee = 2500, LibraryFee = 1000, LabFee = 3000, SportsFee = 1200, UniformFee = 1500, BooksFee = 3000, DevelopmentFee = 2000, TotalAmount = 68700, InstallmentCount = 4, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Higher Secondary (Class 11–12) Science", Class = "Class 11", AcademicYear = academicYear, TuitionFee = 60000, AdmissionFee = 3000, ExamFee = 3000, LibraryFee = 1200, LabFee = 6000, SportsFee = 1200, UniformFee = 1500, BooksFee = 4000, DevelopmentFee = 2500, TotalAmount = 82400, InstallmentCount = 4, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            };

            _context.FeeStructures.AddRange(feeStructures);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} fee structures seeded", feeStructures.Count);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Fee Records — one per existing student (mix of paid / pending / overdue)
        // ─────────────────────────────────────────────────────────────────────
        public async Task SeedFeeRecordsAsync()
        {
            if (await _context.FeeRecords.AnyAsync(f => f.SchoolId == _schoolId))
            {
                _logger.LogInformation("Fee records already seeded");
                return;
            }

            var students = await _context.Students
                .Where(s => s.SchoolId == _schoolId)
                .Take(20)
                .ToListAsync();

            var feeStructures = await _context.FeeStructures
                .Where(f => f.SchoolId == _schoolId)
                .ToListAsync();

            if (!students.Any() || !feeStructures.Any()) return;

            var random = new Random(42);
            var statuses = new[] { "paid", "paid", "paid", "partial", "pending", "overdue" };
            var academicYear = "2026-2027";

            var records = new List<FeeRecord>();
            foreach (var student in students)
            {
                var fs = feeStructures[random.Next(feeStructures.Count)];
                var statusIdx = random.Next(statuses.Length);
                var status = statuses[statusIdx];
                var paidAmount = status == "paid" ? fs.TotalAmount :
                                 status == "partial" ? Math.Round(fs.TotalAmount * 0.5m, 2) :
                                 0m;

                records.Add(new FeeRecord
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    StudentId = student.Id,
                    FeeStructureId = fs.Id,
                    TotalAmount = fs.TotalAmount,
                    PaidAmount = paidAmount,
                    PendingAmount = fs.TotalAmount - paidAmount,
                    BalanceAmount = fs.TotalAmount - paidAmount,
                    DiscountAmount = 0,
                    LateFeeAmount = status == "overdue" ? 500m : 0m,
                    Status = status,
                    DueDate = status == "overdue"
                        ? DateTime.UtcNow.AddMonths(-2)
                        : DateTime.UtcNow.AddMonths(2),
                    LastPaymentDate = paidAmount > 0 ? DateTime.UtcNow.AddDays(-random.Next(1, 60)) : null,
                    AcademicYear = academicYear,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            _context.FeeRecords.AddRange(records);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} fee records seeded", records.Count);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Library Books — 20 titles across common school subjects
        // ─────────────────────────────────────────────────────────────────────
        public async Task SeedLibraryBooksAsync()
        {
            if (await _context.Books.AnyAsync(b => b.SchoolId == _schoolId))
            {
                _logger.LogInformation("Library books already seeded");
                return;
            }

            var books = new List<Book>
            {
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "NCERT Mathematics Class 10", Author = "NCERT", ISBN = "978-81-7450-634-0", Category = "Mathematics", Publisher = "NCERT", PublishedYear = 2023, TotalCopies = 10, AvailableCopies = 8, Status = "available", Location = "Shelf A1", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "NCERT Science Class 9", Author = "NCERT", ISBN = "978-81-7450-593-0", Category = "Science", Publisher = "NCERT", PublishedYear = 2023, TotalCopies = 10, AvailableCopies = 7, Status = "available", Location = "Shelf A2", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "NCERT History Class 8", Author = "NCERT", ISBN = "978-81-7450-576-3", Category = "History", Publisher = "NCERT", PublishedYear = 2022, TotalCopies = 8, AvailableCopies = 8, Status = "available", Location = "Shelf B1", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "Wings of Fire — A.P.J. Abdul Kalam", Author = "A.P.J. Abdul Kalam", ISBN = "978-81-7371-146-6", Category = "Biography", Publisher = "Universities Press", PublishedYear = 2009, TotalCopies = 5, AvailableCopies = 3, Status = "available", Location = "Shelf C1", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "The Discovery of India — Nehru", Author = "Jawaharlal Nehru", ISBN = "978-01-4303-425-9", Category = "History", Publisher = "Penguin", PublishedYear = 2004, TotalCopies = 4, AvailableCopies = 4, Status = "available", Location = "Shelf B2", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "NCERT Physics Class 11 Part 1", Author = "NCERT", ISBN = "978-81-7450-686-9", Category = "Physics", Publisher = "NCERT", PublishedYear = 2023, TotalCopies = 12, AvailableCopies = 10, Status = "available", Location = "Shelf A3", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "NCERT Chemistry Class 12 Part 1", Author = "NCERT", ISBN = "978-81-7450-697-5", Category = "Chemistry", Publisher = "NCERT", PublishedYear = 2023, TotalCopies = 12, AvailableCopies = 11, Status = "available", Location = "Shelf A4", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "English Grammar in Use — Murphy", Author = "Raymond Murphy", ISBN = "978-0-521-53762-9", Category = "English", Publisher = "Cambridge", PublishedYear = 2019, TotalCopies = 6, AvailableCopies = 5, Status = "available", Location = "Shelf C2", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "Computer Science with Python — Sumita Arora", Author = "Sumita Arora", ISBN = "978-81-7760-859-6", Category = "Computer Science", Publisher = "Dhanpat Rai", PublishedYear = 2023, TotalCopies = 8, AvailableCopies = 6, Status = "available", Location = "Shelf D1", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "NCERT Geography Class 10", Author = "NCERT", ISBN = "978-81-7450-652-4", Category = "Geography", Publisher = "NCERT", PublishedYear = 2022, TotalCopies = 9, AvailableCopies = 9, Status = "available", Location = "Shelf B3", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "Godan — Premchand", Author = "Munshi Premchand", ISBN = "978-81-7009-183-2", Category = "Hindi Literature", Publisher = "Rajpal & Sons", PublishedYear = 2015, TotalCopies = 3, AvailableCopies = 2, Status = "available", Location = "Shelf C3", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "NCERT Economics Class 12", Author = "NCERT", ISBN = "978-81-7450-694-4", Category = "Economics", Publisher = "NCERT", PublishedYear = 2023, TotalCopies = 7, AvailableCopies = 7, Status = "available", Location = "Shelf B4", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "Business Studies Class 11 — NCERT", Author = "NCERT", ISBN = "978-81-7450-652-4", Category = "Business", Publisher = "NCERT", PublishedYear = 2022, TotalCopies = 6, AvailableCopies = 6, Status = "available", Location = "Shelf D2", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "The Alchemist — Paulo Coelho", Author = "Paulo Coelho", ISBN = "978-0-06-231500-7", Category = "Fiction", Publisher = "HarperCollins", PublishedYear = 2014, TotalCopies = 4, AvailableCopies = 3, Status = "available", Location = "Shelf C4", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Title = "India After Gandhi — Ramachandra Guha", Author = "Ramachandra Guha", ISBN = "978-03-3039-640-1", Category = "History", Publisher = "Macmillan", PublishedYear = 2017, TotalCopies = 3, AvailableCopies = 3, Status = "available", Location = "Shelf B5", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            };

            _context.Books.AddRange(books);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} library books seeded", books.Count);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Attendance Records — 30 days for up to 15 students
        // ─────────────────────────────────────────────────────────────────────
        public async Task SeedAttendanceRecordsAsync()
        {
            if (await _context.AttendanceRecords.AnyAsync(a => a.SchoolId == _schoolId))
            {
                _logger.LogInformation("Attendance records already seeded");
                return;
            }

            var students = await _context.Students
                .Where(s => s.SchoolId == _schoolId)
                .Take(15)
                .ToListAsync();

            if (!students.Any()) return;

            var random = new Random(42);
            var records = new List<AttendanceRecord>();
            var today = DateTime.UtcNow.Date;

            for (int dayOffset = 30; dayOffset >= 1; dayOffset--)
            {
                var date = today.AddDays(-dayOffset);
                // Skip weekends
                if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;

                foreach (var student in students)
                {
                    var isPresent = random.Next(100) < 88; // 88% attendance
                    records.Add(new AttendanceRecord
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = _schoolId,
                        StudentId = student.Id,
                        Date = date,
                        Status = isPresent ? "present" : (random.Next(2) == 0 ? "absent" : "late"),
                        MarkedBy = _schoolId, // placeholder — admin user ID not available here
                        Remarks = null,
                        IsManualOverride = false,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            _context.AttendanceRecords.AddRange(records);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} attendance records seeded", records.Count);
        }
        // ─────────────────────────────────────────────────────────────────────
        // Leave Types — standard Indian school staff leave types
        // ─────────────────────────────────────────────────────────────────────
        public async Task SeedLeaveTypesAsync()
        {
            // Seed staff leave types if none exist
            if (!await _context.LeaveTypes.AnyAsync(l => l.SchoolId == _schoolId && l.ApplicableTo == "Staff"))
            {
                var staffLeaveTypes = new List<LeaveType>
                {
                    new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Casual Leave",     Description = "For personal or family matters",                 ApplicableTo = "Staff", MaxDaysPerYear = 12, RequiresApproval = true,  RequiresDocument = false, MinNoticeDays = 1, IsCarryForward = false, IsPaid = true,  IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Sick Leave",       Description = "Medical leave with doctor's certificate",         ApplicableTo = "Staff", MaxDaysPerYear = 10, RequiresApproval = true,  RequiresDocument = true,  MinNoticeDays = 0, IsCarryForward = false, IsPaid = true,  IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Earned Leave",     Description = "Leave earned through service",                    ApplicableTo = "Staff", MaxDaysPerYear = 15, RequiresApproval = true,  RequiresDocument = false, MinNoticeDays = 3, IsCarryForward = true,  IsPaid = true,  IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Maternity Leave",  Description = "Maternity leave as per Maternity Benefit Act",    ApplicableTo = "Staff", MaxDaysPerYear = 180, RequiresApproval = true, RequiresDocument = true,  MinNoticeDays = 30, IsCarryForward = false, IsPaid = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Paternity Leave",  Description = "Paternity leave for new fathers",                 ApplicableTo = "Staff", MaxDaysPerYear = 15,  RequiresApproval = true, RequiresDocument = false, MinNoticeDays = 7,  IsCarryForward = false, IsPaid = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Compensatory Off", Description = "Leave in lieu of working on holidays or weekends", ApplicableTo = "Staff", MaxDaysPerYear = 12, RequiresApproval = true,  RequiresDocument = false, MinNoticeDays = 1, IsCarryForward = false, IsPaid = true,  IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Loss of Pay",      Description = "Unpaid leave when all paid leaves are exhausted", ApplicableTo = "Staff", MaxDaysPerYear = 30,  RequiresApproval = true, RequiresDocument = false, MinNoticeDays = 2,  IsCarryForward = false, IsPaid = false, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                };
                _context.LeaveTypes.AddRange(staffLeaveTypes);
                await _context.SaveChangesAsync();
                _logger.LogInformation("✅ {Count} staff leave types seeded", staffLeaveTypes.Count);
            }
            else
            {
                _logger.LogInformation("Staff leave types already seeded");
            }

            // Seed student leave types if none exist — separate from staff types
            if (!await _context.LeaveTypes.AnyAsync(l => l.SchoolId == _schoolId && (l.ApplicableTo == "Student" || l.ApplicableTo == "All")))
            {
                var studentLeaveTypes = new List<LeaveType>
                {
                    new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Medical Leave",   Description = "Student is unwell and needs rest (medical certificate may be required)", ApplicableTo = "Student", MaxDaysPerYear = 15, RequiresApproval = true, RequiresDocument = false, MinNoticeDays = 0, IsCarryForward = false, IsPaid = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Casual Leave",    Description = "For personal or family matters",                                         ApplicableTo = "Student", MaxDaysPerYear = 10, RequiresApproval = true, RequiresDocument = false, MinNoticeDays = 1, IsCarryForward = false, IsPaid = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Emergency Leave", Description = "Urgent personal or family emergency",                                    ApplicableTo = "Student", MaxDaysPerYear = 5,  RequiresApproval = true, RequiresDocument = false, MinNoticeDays = 0, IsCarryForward = false, IsPaid = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Festival Leave",  Description = "Religious or cultural festival observance",                              ApplicableTo = "Student", MaxDaysPerYear = 5,  RequiresApproval = true, RequiresDocument = false, MinNoticeDays = 2, IsCarryForward = false, IsPaid = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Sports Leave",    Description = "Participating in school/district/state level sports events",             ApplicableTo = "Student", MaxDaysPerYear = 10, RequiresApproval = true, RequiresDocument = false, MinNoticeDays = 3, IsCarryForward = false, IsPaid = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                };
                _context.LeaveTypes.AddRange(studentLeaveTypes);
                await _context.SaveChangesAsync();
                _logger.LogInformation("✅ {Count} student leave types seeded", studentLeaveTypes.Count);
            }
            else
            {
                _logger.LogInformation("Student leave types already seeded");
            }
        }
    }
}
