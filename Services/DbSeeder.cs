using SmsApi.Models.Constants;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
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
        Task EnsureClassSubjectsForTeacherAssignmentsAsync();
        Task SeedTimetableAsync();
        Task SeedTimetablePeriodsAsync();
        Task SeedTransportAsync();
        Task SeedHostelAsync();
        Task SeedHealthAsync();
        Task EnsureParentChildrenTransportHostelAsync();
        Task EnsureParentNotificationsAsync();
        Task SeedAssignmentsAsync();
        Task SeedExamTypesAsync();
        Task SeedExaminationsAsync();
        Task EnsureStudentEnrollmentsAsync();
        Task SeedRbacTestStaffAsync();
        Task SeedStudentLoginsAsync();
        Task SeedAdmissionApplicationsAsync();
        Task SeedStudentDocumentsAsync();
        Task EnsureTodayAttendanceAsync();
        Task EnsureOverdueFeeRecordsAsync();
        Task SeedLibraryIssuesAsync();
        Task SeedVisitorEntriesAsync();
        Task SeedHostelAttendanceAsync();
        Task SeedBehaviourRecordsAsync();
        Task SeedPtmDataAsync();
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

                // Seed for all active schools that have at least one admin user but no student data yet
                var schoolIds = await _context.Schools
                    .Where(s => s.IsActive)
                    .Select(s => s.Id)
                    .ToListAsync();

                foreach (var sid in schoolIds)
                {
                    _schoolId = sid;
                    await SeedForSchoolAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Warning during database seeding - proceeding anyway");
            }
        }

        private async Task SeedForSchoolAsync()
        {
            try
            {
                // Check if data already exists
                if (await _context.Students.AnyAsync(s => s.SchoolId == _schoolId) &&
                    await _context.Classes.AnyAsync(c => c.SchoolId == _schoolId) &&
                    await _context.Subjects.AnyAsync(s => s.SchoolId == _schoolId))
                {
                    _logger.LogInformation("✅ Mock data already exists for school {SchoolId}, running incremental seeders", _schoolId);
                    // Still run incremental seeders that have their own guards
                    await SeedClassesAsync();
                    await SeedStaffAsync();
                    await SeedStaffMembersAsync();
                    await SeedTeacherAssignmentsAsync();
                    await EnsureClassSubjectsForTeacherAssignmentsAsync();
                    await FixStudentClassNamesAsync();
                    await EnsureStudentsForAllClassesAsync();
                    await SeedLeaveTypesAsync();
                    await SeedExamTypesAsync();
                    await SeedTimetablePeriodsAsync();
                    await SeedAssignmentsAsync();
                    await SeedExamTypesAsync();
                    await SeedExaminationsAsync();
                    await EnsureStudentEnrollmentsAsync();
                    await SeedTransportAsync();
                    await SeedHostelAsync();
                    await SeedHealthAsync();
                    await EnsureParentChildrenTransportHostelAsync();
                    await EnsureParentNotificationsAsync();
                    await SeedRbacTestStaffAsync();
                    await SeedStudentLoginsAsync();
                    await SeedSchoolFeaturePermissionsAsync();
                await SeedLeaveApplicationsAsync();
                await SeedAssignmentSubmissionsAsync();
                await EnsureParentLoginAsync();
                await SeedAdmissionApplicationsAsync();
                await SeedStudentDocumentsAsync();
                await EnsureTodayAttendanceAsync();
                await EnsureOverdueFeeRecordsAsync();
                await SeedBehaviourRecordsAsync();
                await SeedPtmDataAsync();
                return;
                }

                _logger.LogInformation("🔄 Adding comprehensive mock data...");
                
                await SeedStudentsAsync();
                await SeedStaffAsync();
                await SeedStaffMembersAsync();
                await SeedClassesAsync();
                await SeedSubjectsAsync();
                await SeedClassSubjectsAsync();
                await SeedTeacherAssignmentsAsync();
                await EnsureClassSubjectsForTeacherAssignmentsAsync();
                await FixStudentClassNamesAsync();
                await SeedTimetableAsync();
                await SeedTimetablePeriodsAsync();
                await SeedFeeStructuresAsync();
                await SeedFeeRecordsAsync();
                await SeedLibraryBooksAsync();
                await SeedAttendanceRecordsAsync();
                await SeedAssignmentsAsync();
                await SeedLeaveTypesAsync();
                await SeedExamTypesAsync();
                await SeedExaminationsAsync();
                await EnsureStudentEnrollmentsAsync();
                await SeedTransportAsync();
                await SeedHostelAsync();
                await SeedHealthAsync();
                await EnsureParentChildrenTransportHostelAsync();
                await EnsureParentNotificationsAsync();
                await SeedRbacTestStaffAsync();
                await SeedStudentLoginsAsync();
                await SeedSchoolFeaturePermissionsAsync();
                await SeedLeaveApplicationsAsync();
                await SeedAssignmentSubmissionsAsync();
                await EnsureParentLoginAsync();
                await SeedAdmissionApplicationsAsync();
                await SeedStudentDocumentsAsync();
                await EnsureTodayAttendanceAsync();
                await EnsureOverdueFeeRecordsAsync();
                await SeedLibraryIssuesAsync();
                await SeedVisitorEntriesAsync();
                await SeedHostelAttendanceAsync();
                await SeedBehaviourRecordsAsync();
                await SeedPtmDataAsync();

                _logger.LogInformation("✅ Database seeding completed successfully for school {SchoolId}!", _schoolId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Warning during database seeding for school {SchoolId} - proceeding", _schoolId);
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
                // Admin — BCrypt-hashed (was SHA-256; fixed to match AuthService.Verify)
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
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("AdminDemo2026!", workFactor: 12),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                // Teachers — BCrypt-hashed
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
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Teacher@123", workFactor: 12),
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
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Teacher@123", workFactor: 12),
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
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Teacher@123", workFactor: 12),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                // Staff — BCrypt-hashed
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
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("StaffDemo2026!", workFactor: 12),
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
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("StaffDemo2026!", workFactor: 12),
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

            // 50 students: 5 per section × 2 sections × 5 classes = all classes covered
            var studentNames = new[]
            {
                // Class 1 Section A
                ("Aarav", "Patel"), ("Ananya", "Sharma"), ("Arjun", "Singh"), ("Aisha", "Khan"), ("Avni", "Gupta"),
                // Class 1 Section B
                ("Akshay", "Mishra"), ("Priya", "Verma"), ("Reyansh", "Kumar"), ("Riya", "Joshi"), ("Rohan", "Nair"),
                // Class 2 Section A
                ("Sneha", "Iyer"), ("Siddharth", "Rao"), ("Sara", "Menon"), ("Tanvi", "Bhat"), ("Varun", "Desai"),
                // Class 2 Section B
                ("Veena", "Rao"), ("Yash", "Pillai"), ("Yasmin", "Ahmed"), ("Zara", "Ali"), ("Zain", "Hassan"),
                // Class 3 Section A
                ("Aarush", "Malhotra"), ("Aditi", "Saxena"), ("Aryan", "Kapoor"), ("Amira", "Mukherjee"), ("Aditya", "Chopra"),
                // Class 3 Section B
                ("Bharat", "Kulkarni"), ("Deepika", "Menon"), ("Gaurav", "Nambiar"), ("Harini", "Pillai"), ("Ishaan", "Bose"),
                // Class 4 Section A
                ("Kavya", "Reddy"), ("Lakshya", "Tiwari"), ("Meera", "Aggarwal"), ("Nikhil", "Dubey"), ("Pooja", "Garg"),
                // Class 4 Section B
                ("Qasim", "Sheikh"), ("Ruchi", "Arora"), ("Sahil", "Malhotra"), ("Tanya", "Mehta"), ("Uday", "Pandey"),
                // Class 5 Section A
                ("Vani", "Krishnan"), ("Wasim", "Qureshi"), ("Xena", "D'Souza"), ("Yuvraj", "Singh"), ("Zoya", "Mirza"),
                // Class 5 Section B
                ("Alok", "Dixit"), ("Bindu", "Nair"), ("Chetan", "Shah"), ("Divya", "Mohan"), ("Esha", "Rawat")
            };

            // Static UUIDs for the two demo-parent children so EnsureParentChildrenTransportHostelAsync()
            // can locate them by ID without relying on name-based lookups across random GUIDs.
            // Index 8 = "Riya Joshi" (Class 1-B), Index 9 = "Rohan Nair" (Class 1-B).
            var staticStudentIds = new Dictionary<int, Guid>
            {
                [8] = Guid.Parse("c0a80101-0000-4000-8000-000000000001"), // Riya — parent demo child 1
                [9] = Guid.Parse("67e1d74f-5eab-42a8-918b-bf30c64111c3"), // Rohan — parent demo child 2
            };

            var students = new List<Student>();
            var classNum = 1;
            var sectionNum = 0;

            for (int i = 0; i < studentNames.Length; i++)
            {
                var (first, last) = studentNames[i];
                var student = new Student
                {
                    Id = staticStudentIds.TryGetValue(i, out var staticId) ? staticId : Guid.NewGuid(),
                    SchoolId = _schoolId,
                    Name = $"{first} {last}",
                    FirstName = first,
                    LastName = last,
                    RollNumber = (i + 1).ToString("D3"),
                    Email = $"{first.ToLower()}.{last.ToLower()}@student.stmarys.edu.in",
                    PrimaryPhone = $"+91-98765{i:D5}",
                    DateOfBirth = new DateTime(2010 - classNum, ((i % 12) + 1), ((i % 27) + 1)),
                    Gender = i % 2 == 0 ? "Male" : "Female",
                    Address = $"Address Line {i + 1}, Mumbai",
                    GuardianName = $"Guardian of {first}",
                    Status = "active",
                    PhotoUrl = null,
                    AdmissionDate = DateTime.UtcNow.AddMonths(-Random.Shared.Next(1, 24)),
                    AdmissionNumber = $"ADM{DateTime.UtcNow.Year}{(i + 1):D4}",
                    Class = $"Class {classNum}",
                    Section = ((char)('A' + sectionNum)).ToString(),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                students.Add(student);

                // 5 students per section, 2 sections per class
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

        /// <summary>
        /// Adds students to any class that currently has zero enrollments.
        /// Safe to call repeatedly — skips classes that already have students.
        /// </summary>
        public async Task EnsureStudentsForAllClassesAsync()
        {
            var classes = await _context.Classes
                .Where(c => c.SchoolId == _schoolId)
                .OrderBy(c => c.Name)
                .ToListAsync();

            if (!classes.Any()) return;

            // Extra names for gap-filling
            var fillNames = new[]
            {
                ("Farhan", "Siddiqui"), ("Girish", "Rao"), ("Hema", "Shetty"), ("Indu", "Bhat"), ("Jai", "Kumar"),
                ("Kavita", "Sinha"), ("Laxman", "Hegde"), ("Minal", "Jain"), ("Nitin", "Chauhan"), ("Ojal", "Deshpande"),
                ("Preethi", "Murthy"), ("Rahul", "Verma"), ("Seema", "Agarwal"), ("Tushar", "Patil"), ("Uma", "Naidu"),
                ("Vikram", "Rao"), ("Winnie", "Pinto"), ("Xavier", "Almeida"), ("Yamini", "Rao"), ("Zubin", "Mehta")
            };

            int fillIdx = 0;
            int rollOffset = 1000;

            foreach (var cls in classes)
            {
                // Count existing students for this class (by class name string)
#pragma warning disable CS0618
                var existingCount = await _context.Students
                    .Where(s => s.SchoolId == _schoolId && s.Class == cls.Name)
                    .CountAsync();
#pragma warning restore CS0618

                if (existingCount >= 5) continue; // Already has enough students

                _logger.LogInformation("➕ Adding students to {Class} (currently {Count})", cls.Name, existingCount);

                // Add students to Section A and Section B
                foreach (var section in new[] { "A", "B" })
                {
                    for (int j = 0; j < 5; j++)
                    {
                        var (first, last) = fillNames[fillIdx % fillNames.Length];
                        fillIdx++;
                        rollOffset++;

                        _context.Students.Add(new Student
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = _schoolId,
                            Name = $"{first} {last}",
                            FirstName = first,
                            LastName = last,
                            RollNumber = rollOffset.ToString("D4"),
                            Email = $"{first.ToLower()}{rollOffset}@student.stmarys.edu.in",
                            PrimaryPhone = $"+91-9000{rollOffset:D6}",
                            DateOfBirth = new DateTime(2008, ((rollOffset % 12) + 1), ((rollOffset % 27) + 1)),
                            Gender = rollOffset % 2 == 0 ? "Male" : "Female",
                            Address = $"Block {section}, {cls.Name} Street, Mumbai",
                            GuardianName = $"Parent of {first}",
                            Status = "active",
                            PhotoUrl = null,
                            AdmissionDate = DateTime.UtcNow.AddMonths(-12),
                            AdmissionNumber = $"ADMF{rollOffset:D5}",
                            Class = cls.Name,
                            Section = section,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ Gap-fill students saved");
        }

        public async Task SeedStaffAsync()
        {
            _logger.LogInformation("👨‍🏫 Seeding teacher user logins for actual staff...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            // Idempotency: skip only if Teacher login exists AND LinkedEntityId is already set
            var existingAmit = await _context.UserLogins.IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Email == "amit.k@demo.edu" && u.SchoolId == _schoolId && u.Role == "Teacher");
            if (existingAmit?.LinkedEntityId != null)
            {
                _logger.LogInformation("✅ Teacher user logins already seeded with LinkedEntityId, skipping");
                return;
            }

            // The actual teachers already exist in StaffMembers (seeded by legacy scripts).
            // We only need to ensure they have working UserLogin accounts with role=Teacher.
            const string teacherPassword = "Teacher@123";
            var teacherData = new[]
            {
                ("amit.kapoor",   "amit.k@demo.edu",    "Amit",    "Kapoor"),
                ("lakshmi.iyer",  "lakshmi.i@demo.edu", "Lakshmi", "Iyer"),
                ("ravi.shankar",  "ravi.s@demo.edu",    "Ravi",    "Shankar"),
                ("suman.reddy",   "suman.r@demo.edu",   "Suman",   "Reddy"),
            };

            foreach (var (username, email, firstName, lastName) in teacherData)
            {
                // Look up the matching StaffMember so we can link via LinkedEntityId
                var staffMember = await _context.StaffMembers.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.Email == email && s.SchoolId == _schoolId);
                var linkedEntityId = staffMember?.Id;

                var existing = await _context.UserLogins.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Email == email);

                if (existing != null)
                {
                    // Fix role to Teacher, reset password to known value, ensure correct school + active status
                    existing.Role = "Teacher";
                    existing.SchoolId = _schoolId;
                    existing.Status = "active";
                    existing.FirstName = firstName;
                    existing.LastName = lastName;
                    existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(teacherPassword, workFactor: 12);
                    existing.UpdatedAt = DateTime.UtcNow;
                    // Link UserLogin → StaffMember so ResolveStaffIdAsync works without email fallback
                    if (linkedEntityId.HasValue)
                        existing.LinkedEntityId = linkedEntityId.Value;
                }
                else
                {
                    _context.UserLogins.Add(new UserLogin
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = _schoolId,
                        Username = username,
                        Email = email,
                        FirstName = firstName,
                        LastName = lastName,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(teacherPassword, workFactor: 12),
                        Role = "Teacher",
                        Status = "active",
                        LinkedEntityId = linkedEntityId,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ Teacher user logins seeded (amit.k, lakshmi.i, ravi.s, suman.r @demo.edu)");
        }

        public async Task SeedStaffMembersAsync()
        {
            _logger.LogInformation("👨‍🏫 Seeding Staff table (StaffMembers) for teacher accounts...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            // Teachers whose StaffMember records must exist so getMyClassAssignments works
            var teacherData = new[]
            {
                ("sarah.johnson@stmarys.edu.in", "Sarah",   "Johnson", "Mathematics",     "Senior Teacher"),
                ("john.smith@stmarys.edu.in",    "John",    "Smith",   "Science",         "Senior Teacher"),
                ("priya.singh@stmarys.edu.in",   "Priya",   "Singh",   "English",         "Teacher"),
                ("amit.k@demo.edu",              "Amit",    "Kapoor",  "Mathematics",     "Teacher"),
                ("lakshmi.i@demo.edu",           "Lakshmi", "Iyer",    "English",         "Teacher"),
                ("ravi.s@demo.edu",              "Ravi",    "Shankar", "Science",         "Teacher"),
                ("suman.r@demo.edu",             "Suman",   "Reddy",   "Social Science",  "Teacher"),
            };

            var newMembers = new List<Staff>();
            int counter = 1;
            foreach (var (email, first, last, dept, designation) in teacherData)
            {
                var exists = await _context.StaffMembers.IgnoreQueryFilters()
                    .AnyAsync(s => s.Email == email && s.SchoolId == _schoolId);

                if (!exists)
                {
                    newMembers.Add(new Staff
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = _schoolId,
                        EmployeeId = $"TCH{counter:D4}",
                        FirstName = first,
                        LastName = last,
                        Name = $"{first} {last}",
                        Email = email,
                        Phone = $"+91-9876540{counter:D3}",
                        DateOfBirth = new DateTime(1985, 6, 15),
                        Gender = counter % 2 == 0 ? "Female" : "Male",
                        Address = "School Campus, Mumbai, Maharashtra 400001",
                        Department = dept,
                        Designation = designation,
                        Qualification = "M.Ed, B.Ed",
                        Experience = 5 + counter,
                        JoiningDate = new DateTime(2019, 6, 1),
                        EmploymentType = "permanent",
                        Salary = 45000m + (counter * 2000),
                        Status = "active",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
                counter++;
            }

            if (newMembers.Any())
            {
                _context.StaffMembers.AddRange(newMembers);
                await _context.SaveChangesAsync();
                _logger.LogInformation("✅ {Count} StaffMember records seeded", newMembers.Count);
            }
            else
            {
                _logger.LogInformation("✅ StaffMember records already exist, skipping");
            }
        }

        private async Task FixStudentClassNamesAsync()
        {
            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            // Migrate students whose Class field is a bare number (e.g. "1") to match
            // the Class entity name format (e.g. "Class 1"). This is a one-time idempotent fix.
            var classes = await _context.Classes.IgnoreQueryFilters()
                .Where(c => c.SchoolId == _schoolId)
                .ToListAsync();

            bool changed = false;
            foreach (var cls in classes)
            {
                var parts = cls.Name.Split(' ');
                if (parts.Length < 2) continue;
                var numStr = parts.Last();

                var studentsToFix = await _context.Students.IgnoreQueryFilters()
                    .Where(s => s.SchoolId == _schoolId && s.Class == numStr)
                    .ToListAsync();

                foreach (var s in studentsToFix)
                {
                    s.Class = cls.Name;
                    changed = true;
                }
            }

            if (changed)
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("✅ Student class names migrated to Class-entity name format");
            }
        }

        public async Task SeedClassesAsync()
        {
            _logger.LogInformation("📖 Seeding classes and sections...");

            // Idempotency: skip if classes already exist for this school
            if (await _context.Classes.IgnoreQueryFilters()
                    .AnyAsync(c => c.SchoolId == _schoolId))
            {
                _logger.LogInformation("✅ Classes already seeded, skipping");
                return;
            }

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

            // Ensure _schoolId is set when called standalone
            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            var classes = await _context.Classes
                .Where(c => c.SchoolId == _schoolId)
                .ToListAsync();

            var subjects = await _context.Subjects
                .Where(s => s.SchoolId == _schoolId)
                .ToListAsync();

            if (!subjects.Any() || !classes.Any())
            {
                _logger.LogWarning("⚠️ No classes or subjects found. Skipping structured timetable seeding.");
                return;
            }

            // ── Clear existing timetable data so we always rebuild from ClassSubjects ──
            var existingTtIds = await _context.Timetables
                .Where(t => t.SchoolId == _schoolId)
                .Select(t => t.Id)
                .ToListAsync();

            if (existingTtIds.Any())
            {
                await _context.TimetablePeriods
                    .Where(tp => existingTtIds.Contains(tp.TimetableId))
                    .ExecuteDeleteAsync();
                await _context.Timetables
                    .Where(t => t.SchoolId == _schoolId)
                    .ExecuteDeleteAsync();
                _logger.LogInformation("🧹 Cleared {Count} existing timetables for rebuild", existingTtIds.Count);
            }

            // ── Academic year ──────────────────────────────────────────────────────
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

            // ── Period schedule: 8 slots per day, 6 lectures + 1 short break + 1 lunch ──
            var periodSchedule = new[]
            {
                (1, new TimeSpan(8,  0, 0), new TimeSpan(8,  45, 0), "lecture"),
                (2, new TimeSpan(8,  45, 0), new TimeSpan(9,  30, 0), "lecture"),
                (3, new TimeSpan(9,  30, 0), new TimeSpan(9,  45, 0), "break"),
                (4, new TimeSpan(9,  45, 0), new TimeSpan(10, 30, 0), "lecture"),
                (5, new TimeSpan(10, 30, 0), new TimeSpan(11, 15, 0), "lecture"),
                (6, new TimeSpan(11, 15, 0), new TimeSpan(12, 0,  0), "lecture"),
                (7, new TimeSpan(12, 0,  0), new TimeSpan(12, 45, 0), "lunch"),
                (8, new TimeSpan(12, 45, 0), new TimeSpan(13, 30, 0), "lecture"),
            };

            var days = new[] { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" };

            // Track occupied teacher slots: key = (day, periodNum, teacherId)
            // This prevents the same teacher from being in two classes at the same time
            var occupiedSlots = new HashSet<(string day, int period, Guid teacherId)>();

            foreach (var cls in classes)
            {
                // ── Load class-subject assignments (with actual teacher per subject) ──
                var classSubjects = await _context.ClassSubjects
                    .Where(cs => cs.ClassId == cls.Id && cs.SchoolId == _schoolId && cs.Status == "active")
                    .Include(cs => cs.Subject)
                    .Include(cs => cs.Teacher)
                    .ToListAsync();

                // Build ordered list: (subjectId, teacherId) — cycle through by day×period
                var subjectSlots = classSubjects.Count > 0
                    ? classSubjects
                        .Select(cs => (subjectId: cs.SubjectId, teacherId: cs.TeacherId))
                        .ToList()
                    : subjects
                        .Select(s => (subjectId: s.Id, teacherId: (Guid?)null))
                        .ToList();

                // ── Class-level timetable (no SectionId) ──────────────────────────
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

                int slotIdx = 0;
                foreach (var day in days)
                {
                    foreach (var (periodNum, startTime, endTime, periodType) in periodSchedule)
                    {
                        bool isBreak = periodType is "break" or "lunch";
                        Guid? subjectId = null;
                        Guid? teacherId = null;

                        if (!isBreak && subjectSlots.Count > 0)
                        {
                            // Find a non-conflicting slot for this day+period
                            int attempts = 0;
                            while (attempts < subjectSlots.Count)
                            {
                                var candidate = subjectSlots[slotIdx % subjectSlots.Count];
                                slotIdx++;
                                attempts++;

                                // If this teacher is already busy at this day+period, try next subject
                                if (candidate.teacherId.HasValue &&
                                    occupiedSlots.Contains((day, periodNum, candidate.teacherId.Value)))
                                    continue;

                                subjectId = candidate.subjectId;
                                teacherId = candidate.teacherId;
                                break;
                            }

                            // If all teachers conflict, still assign the subject but clear teacher
                            if (subjectId == null && subjectSlots.Count > 0)
                            {
                                subjectId = subjectSlots[slotIdx % subjectSlots.Count].subjectId;
                                teacherId = null; // no teacher available — mark for manual assignment
                                slotIdx++;
                            }

                            // Mark this slot as occupied
                            if (teacherId.HasValue)
                                occupiedSlots.Add((day, periodNum, teacherId.Value));
                        }

                        _context.TimetablePeriods.Add(new TimetablePeriod
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
                        });
                    }
                }
            }

            await _context.SaveChangesAsync();

            var timetableCount = await _context.Timetables.CountAsync(t => t.SchoolId == _schoolId);
            var schoolTtIds2 = await _context.Timetables
                .Where(t => t.SchoolId == _schoolId)
                .Select(t => t.Id)
                .ToListAsync();
            var periodCount = await _context.TimetablePeriods
                .CountAsync(tp => schoolTtIds2.Contains(tp.TimetableId));
            _logger.LogInformation("✅ Structured timetables seeded: {Timetables} timetables, {Periods} periods", timetableCount, periodCount);
        }

        public async Task SeedClassSubjectsAsync()
        {
            _logger.LogInformation("📖 Seeding class-subject assignments...");

            var classes = await _context.Classes.IgnoreQueryFilters().Where(c => c.SchoolId == _schoolId).ToListAsync();
            var subjects = await _context.Subjects.IgnoreQueryFilters().Where(s => s.SchoolId == _schoolId).ToListAsync();
            var teachers = await _context.StaffMembers.IgnoreQueryFilters()
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

        /// <summary>
        /// Ensures a ClassSubject record exists for every TeacherAssignment that has a SubjectId.
        /// This keeps the two tables consistent when the seeder has been run in multiple passes.
        /// </summary>
        public async Task EnsureClassSubjectsForTeacherAssignmentsAsync()
        {
            _logger.LogInformation("🔗 Ensuring ClassSubjects consistency with TeacherAssignments...");

            var teacherAssignments = await _context.TeacherAssignments
                .IgnoreQueryFilters()
                .Where(ta => ta.SchoolId == _schoolId && ta.SubjectId != null)
                .ToListAsync();

            var existingClassSubjectKeys = await _context.ClassSubjects
                .IgnoreQueryFilters()
                .Where(cs => cs.SchoolId == _schoolId)
                .Select(cs => new { cs.ClassId, cs.SubjectId })
                .ToListAsync();

            var existingSet = existingClassSubjectKeys
                .Select(k => $"{k.ClassId}|{k.SubjectId}")
                .ToHashSet();

            var toAdd = new List<ClassSubject>();
            foreach (var ta in teacherAssignments)
            {
                var key = $"{ta.ClassId}|{ta.SubjectId}";
                if (!existingSet.Contains(key))
                {
                    toAdd.Add(new ClassSubject
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = _schoolId,
                        ClassId = ta.ClassId,
                        SubjectId = ta.SubjectId!.Value,
                        TeacherId = ta.StaffId,
                        MaxMarks = 100,
                        Credits = 4,
                        IsMandatory = true,
                        Status = "active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                    existingSet.Add(key); // avoid duplicates within this batch
                }
            }

            if (toAdd.Count > 0)
            {
                _context.ClassSubjects.AddRange(toAdd);
                await _context.SaveChangesAsync();
                _logger.LogInformation("✅ Added {Count} missing ClassSubject records", toAdd.Count);
            }
            else
            {
                _logger.LogInformation("✅ ClassSubjects already consistent with TeacherAssignments");
            }
        }

        public async Task SeedTeacherAssignmentsAsync()
        {
            _logger.LogInformation("👨‍🏫 Seeding teacher assignments...");

            // Idempotency: skip if assignments already exist for this school
            if (await _context.TeacherAssignments.IgnoreQueryFilters()
                    .AnyAsync(ta => ta.SchoolId == _schoolId))
            {
                _logger.LogInformation("✅ Teacher assignments already seeded, skipping");
                return;
            }

            var classes = await _context.Classes.IgnoreQueryFilters().Where(c => c.SchoolId == _schoolId).ToListAsync();
            var sections = await _context.Sections.IgnoreQueryFilters().Where(s => s.SchoolId == _schoolId).ToListAsync();
            var teachers = await _context.StaffMembers.IgnoreQueryFilters()
                .Where(s => s.SchoolId == _schoolId && s.Designation.Contains("Teacher"))
                .ToListAsync();

            if (classes.Count == 0 || teachers.Count == 0)
            {
                _logger.LogWarning("⚠️ No classes or teachers found — skipping teacher assignment seeding");
                return;
            }

            var teacherAssignments = new List<TeacherAssignment>();
            var teacherIndex = 0;

            // Dynamic academic year based on current date
            var now = DateTime.UtcNow;
            var startYear = now.Month >= 4 ? now.Year : now.Year - 1;
            var academicYear = $"{startYear}-{startYear + 1}";

            foreach (var cls in classes)
            {
                var classSections = sections.Where(s => s.ClassId == cls.Id).ToList();
                
                // Assign class teacher
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
                    AcademicYear = academicYear,
                    Status = "active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                teacherAssignments.Add(assignment);
                teacherIndex++;

                // Assign subject teachers
                var subjects = await _context.Subjects.IgnoreQueryFilters().Where(s => s.SchoolId == _schoolId).Take(6).ToListAsync();
                foreach (var subject in subjects)
                {
                    var subjectTeacher = teachers[teacherIndex % teachers.Count];
                    var subjectAssignment = new TeacherAssignment
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = _schoolId,
                        StaffId = subjectTeacher.Id,
                        ClassId = cls.Id,
                        SectionId = null,
                        SubjectId = subject.Id,
                        IsClassTeacher = false,
                        AcademicYear = academicYear,
                        Status = "active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    teacherAssignments.Add(subjectAssignment);
                    teacherIndex++;
                }
            }

            _context.TeacherAssignments.AddRange(teacherAssignments);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} teacher assignments seeded", teacherAssignments.Count);
        }

        /// <summary>
        /// Password hashing for seeded accounts — uses BCrypt to match AuthService.Verify().
        /// All callers have been migrated to BCrypt.Net.BCrypt.HashPassword() directly;
        /// this helper is retained as a safe fallback and now delegates to BCrypt.
        /// </summary>
        private string HashPassword(string password)
            => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

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

            // dayOffset 0 = today, so the teacher dashboard "isMarked" check returns true for today
            for (int dayOffset = 30; dayOffset >= 0; dayOffset--)
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
        public async Task SeedTransportAsync()
        {
            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            // Fully idempotent upsert: fetch all existing R-001/R-002/R-003 (even soft-deleted) via IgnoreQueryFilters
            var seedNumbers = new[] { "R-001", "R-002", "R-003" };
            var existingRoutes = await _context.TransportRoutes
                .IgnoreQueryFilters()
                .Where(r => r.SchoolId == _schoolId && seedNumbers.Contains(r.RouteNumber))
                .ToListAsync();

            var existingByNumber = existingRoutes.ToDictionary(r => r.RouteNumber);

            // Restore any soft-deleted seed routes
            foreach (var route in existingRoutes.Where(r => r.IsDeleted))
            {
                route.IsDeleted = false;
                route.Status = "active";
                route.UpdatedAt = DateTime.UtcNow;
            }

            // Define the canonical seed routes
            var routeDefs = new[]
            {
                ("R-001", "Banjara Hills Route",  "TS 09 AB 1234", "Ravi Kumar",    "+91 98765 43210", 40, 1500m),
                ("R-002", "Jubilee Hills Route",  "TS 09 CD 5678", "Suresh Reddy",  "+91 98765 43211", 35, 1200m),
                ("R-003", "Secunderabad Route",   "TS 09 EF 9012", "Prakash Singh", "+91 98765 43212", 45, 1800m),
            };

            var routeIdMap = new Dictionary<string, Guid>();
            foreach (var (num, name, vehicle, driver, phone, cap, fee) in routeDefs)
            {
                if (existingByNumber.TryGetValue(num, out var existing))
                {
                    routeIdMap[num] = existing.Id; // already exists (restored above if deleted)
                }
                else
                {
                    var newRoute = new TransportRoute
                    {
                        Id = Guid.NewGuid(), SchoolId = _schoolId,
                        RouteNumber = num, RouteName = name,
                        VehicleNumber = vehicle, DriverName = driver, DriverPhone = phone,
                        Capacity = cap, MonthlyFee = fee,
                        StartTime = TimeSpan.FromHours(7), EndTime = TimeSpan.FromHours(8.5),
                        StudentsAssigned = 0, Status = "active",
                        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                    };
                    _context.TransportRoutes.Add(newRoute);
                    routeIdMap[num] = newRoute.Id;
                }
            }

            await _context.SaveChangesAsync();

            // Seed student assignments only if none exist for these routes
            var routeIdList = routeIdMap.Values.ToList();
            var assignmentCount = await _context.TransportStudents
                .IgnoreQueryFilters()
                .CountAsync(ts => ts.SchoolId == _schoolId && routeIdList.Contains(ts.RouteId));

            if (assignmentCount > 0)
            {
                _logger.LogInformation("Transport seed routes present, {Count} assignments already exist", assignmentCount);
                return;
            }

            var students = await _context.Students
                .Where(s => s.SchoolId == _schoolId && s.Status.ToLower() == "active")
                .OrderBy(s => s.Name)
                .Take(12)
                .ToListAsync();

            if (!students.Any()) return;

            var pickupPoints = new[] { "Main Gate", "Bus Stop No. 1", "Colony Gate", "Market Road", "Park Entrance", "Temple Road" };
            var routeIdArray = new[] { routeIdMap["R-001"], routeIdMap["R-002"], routeIdMap["R-003"] };
            var routeFees   = new[] { 1500m, 1200m, 1800m };
            var assignments  = new List<TransportStudent>();

            for (int i = 0; i < students.Count; i++)
            {
                var rIdx = i % 3;
                assignments.Add(new TransportStudent
                {
                    Id = Guid.NewGuid(), SchoolId = _schoolId,
                    StudentId = students[i].Id, RouteId = routeIdArray[rIdx],
                    PickupPoint = pickupPoints[i % pickupPoints.Length],
                    DropPoint = "School Main Gate",
                    MonthlyFee = routeFees[rIdx],
                    Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                });
            }

            _context.TransportStudents.AddRange(assignments);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ 3 transport routes, {Count} student assignments seeded", assignments.Count);
        }

        public async Task SeedHostelAsync()
        {
            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            // Upsert: only seed rooms that don't already exist by room number
            // IgnoreQueryFilters() bypasses the global IsDeleted/SchoolId filter (which uses Guid.Empty at seeder time)
            var existingRoomNumbers = await _context.HostelRooms
                .IgnoreQueryFilters()
                .Where(r => r.SchoolId == _schoolId)
                .Select(r => r.RoomNumber)
                .ToListAsync();

            if (existingRoomNumbers.Contains("101") && existingRoomNumbers.Contains("102") &&
                existingRoomNumbers.Contains("201") && existingRoomNumbers.Contains("202"))
            {
                _logger.LogInformation("Hostel seed rooms already present");
                return;
            }

            var room101 = Guid.NewGuid(); var room102 = Guid.NewGuid();
            var room201 = Guid.NewGuid(); var room202 = Guid.NewGuid();

            var rooms = new[]
            {
                new HostelRoom { Id = room101, SchoolId = _schoolId, RoomNumber = "101", RoomType = "boys",  Capacity = 4, Occupied = 0, RentPerBed = 5000, Floor = "Ground", Status = "available", Facilities = "Fan, Study Table, Locker",    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new HostelRoom { Id = room102, SchoolId = _schoolId, RoomNumber = "102", RoomType = "girls", Capacity = 4, Occupied = 0, RentPerBed = 5000, Floor = "Ground", Status = "available", Facilities = "Fan, Study Table, Locker",    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new HostelRoom { Id = room201, SchoolId = _schoolId, RoomNumber = "201", RoomType = "boys",  Capacity = 3, Occupied = 0, RentPerBed = 6000, Floor = "First",  Status = "available", Facilities = "AC, Study Table, Attached Bath", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new HostelRoom { Id = room202, SchoolId = _schoolId, RoomNumber = "202", RoomType = "girls", Capacity = 3, Occupied = 0, RentPerBed = 6000, Floor = "First",  Status = "available", Facilities = "AC, Study Table, Attached Bath", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            };

            _context.HostelRooms.AddRange(rooms);
            await _context.SaveChangesAsync();

            var maleStudents = await _context.Students
                .Where(s => s.SchoolId == _schoolId && s.Gender == "Male" && s.Status.ToLower() == "active")
                .Take(4).ToListAsync();
            var femaleStudents = await _context.Students
                .Where(s => s.SchoolId == _schoolId && s.Gender == "Female" && s.Status.ToLower() == "active")
                .Take(4).ToListAsync();

            var hostelStudents = new List<HostelStudent>();
            var checkIn = DateTime.UtcNow.AddMonths(-2).Date;

            for (int i = 0; i < Math.Min(maleStudents.Count, 4); i++)
            {
                var roomId = i < 2 ? room101 : room201;
                hostelStudents.Add(new HostelStudent { Id = Guid.NewGuid(), SchoolId = _schoolId, StudentId = maleStudents[i].Id, RoomId = roomId, CheckInDate = checkIn, MonthlyFee = i < 2 ? 5000 : 6000, Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
                (i < 2 ? rooms[0] : rooms[2]).Occupied++;
            }
            for (int i = 0; i < Math.Min(femaleStudents.Count, 4); i++)
            {
                var roomId = i < 2 ? room102 : room202;
                hostelStudents.Add(new HostelStudent { Id = Guid.NewGuid(), SchoolId = _schoolId, StudentId = femaleStudents[i].Id, RoomId = roomId, CheckInDate = checkIn, MonthlyFee = i < 2 ? 5000 : 6000, Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
                (i < 2 ? rooms[1] : rooms[3]).Occupied++;
            }

            _context.HostelStudents.AddRange(hostelStudents);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Rooms} hostel rooms, {Count} student assignments seeded", rooms.Length, hostelStudents.Count);
        }

        /// <summary>
        /// Idempotent: ensures the two demo parent children (Riya Gupta and Rohan Gupta) have
        /// transport assignments and at least one has a hostel assignment so parent portal tests work.
        /// </summary>
        public async Task EnsureParentChildrenTransportHostelAsync()
        {
            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            var riyaId  = Guid.Parse("c0a80101-0000-4000-8000-000000000001");
            var rohanId = Guid.Parse("67e1d74f-5eab-42a8-918b-bf30c64111c3");
            const string parentEmail = "aj@gmail.com";

            // Guard: only proceed if both students exist in this database
            var existingStudentIds = await _context.Students
                .IgnoreQueryFilters()
                .Where(s => s.SchoolId == _schoolId && (s.Id == riyaId || s.Id == rohanId))
                .Select(s => s.Id)
                .ToListAsync();

            if (!existingStudentIds.Contains(riyaId) && !existingStudentIds.Contains(rohanId))
            {
                _logger.LogInformation("Parent demo students not found in this database — skipping parent transport/hostel seed.");
                return;
            }

            // ── Guardian records for demo parent (so diary notifications work) ─────
            // Ensures each demo student has a StudentGuardian row with email = parentEmail,
            // which is how the parent portal's email-based child lookup works.
            foreach (var studentId in existingStudentIds)
            {
                var hasGuardian = await _context.StudentGuardians
                    .IgnoreQueryFilters()
                    .AnyAsync(sg => sg.StudentId == studentId && sg.SchoolId == _schoolId
                                    && sg.Email != null && sg.Email.ToLower() == parentEmail);
                if (!hasGuardian)
                {
                    _context.StudentGuardians.Add(new SmsApi.Models.Entities.StudentGuardian
                    {
                        Id          = Guid.NewGuid(),
                        SchoolId    = _schoolId,
                        StudentId   = studentId,
                        Name        = "Ajith Hasthi",
                        Relation    = "father",
                        Phone       = "+91-9000000000",
                        Email       = parentEmail,
                        HasPortalAccess = true,
                        CreatedAt   = DateTime.UtcNow,
                        UpdatedAt   = DateTime.UtcNow,
                        IsDeleted   = false,
                    });
                }
            }
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ Demo parent guardians ensured for {Count} student(s)", existingStudentIds.Count);

            // ── Transport ───────────────────────────────────────────────────
            var route = await _context.TransportRoutes
                .Where(r => r.SchoolId == _schoolId && r.Status == "active" && !r.IsDeleted)
                .OrderBy(r => r.RouteNumber)
                .FirstOrDefaultAsync();

            if (route != null)
            {
                var existingTransport = await _context.TransportStudents
                    .Where(ts => ts.SchoolId == _schoolId && (ts.StudentId == riyaId || ts.StudentId == rohanId))
                    .Select(ts => ts.StudentId)
                    .ToListAsync();

                var toAddTransport = new List<TransportStudent>();
                var routeFee = route.MonthlyFee ?? route.Fare;
                if (existingStudentIds.Contains(riyaId) && !existingTransport.Contains(riyaId))
                    toAddTransport.Add(new TransportStudent
                    {
                        Id = Guid.NewGuid(), SchoolId = _schoolId, StudentId = riyaId,
                        RouteId = route.Id, PickupPoint = "Main Gate", DropPoint = "School Main Gate",
                        MonthlyFee = routeFee, Fare = routeFee,
                        Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                    });
                if (existingStudentIds.Contains(rohanId) && !existingTransport.Contains(rohanId))
                    toAddTransport.Add(new TransportStudent
                    {
                        Id = Guid.NewGuid(), SchoolId = _schoolId, StudentId = rohanId,
                        RouteId = route.Id, PickupPoint = "Colony Gate", DropPoint = "School Main Gate",
                        MonthlyFee = routeFee, Fare = routeFee,
                        Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                    });

                if (toAddTransport.Any())
                {
                    _context.TransportStudents.AddRange(toAddTransport);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("✅ Added transport assignments for {Count} parent children", toAddTransport.Count);
                }
            }

            // ── Hostel ──────────────────────────────────────────────────────
            // Give Rohan (typically male) a hostel assignment if not already assigned
            if (!existingStudentIds.Contains(rohanId)) return; // student doesn't exist in this DB
            var existingHostel = await _context.HostelStudents
                .AnyAsync(hs => hs.SchoolId == _schoolId && hs.StudentId == rohanId && hs.Status == "active");

            if (!existingHostel)
            {
                var boysRoom = await _context.HostelRooms
                    .Where(r => r.SchoolId == _schoolId && r.RoomType == "boys"
                             && r.Status == "available" && r.Occupied < r.Capacity && !r.IsDeleted)
                    .OrderBy(r => r.RoomNumber)
                    .FirstOrDefaultAsync();

                if (boysRoom == null)
                {
                    // Fallback: use any room with available capacity
                    boysRoom = await _context.HostelRooms
                        .Where(r => r.SchoolId == _schoolId && r.Occupied < r.Capacity && !r.IsDeleted)
                        .OrderBy(r => r.RoomNumber)
                        .FirstOrDefaultAsync();
                }

                if (boysRoom != null)
                {
                    _context.HostelStudents.Add(new HostelStudent
                    {
                        Id = Guid.NewGuid(), SchoolId = _schoolId, StudentId = rohanId,
                        RoomId = boysRoom.Id, CheckInDate = DateTime.UtcNow.AddMonths(-3).Date,
                        MonthlyFee = boysRoom.RentPerBed, Status = "active",
                        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                    });
                    boysRoom.Occupied++;
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("✅ Added hostel assignment for Rohan Gupta in room {Room}", boysRoom.RoomNumber);
                }
            }
        }

        public async Task SeedHealthAsync()
        {
            if (await _context.HealthRecords.IgnoreQueryFilters().AnyAsync(h => h.SchoolId == _schoolId))
            {
                _logger.LogInformation("Health records already seeded");
                return;
            }

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            var students = await _context.Students
                .Where(s => s.SchoolId == _schoolId && s.Status.ToLower() == "active")
                .OrderBy(s => s.Name)
                .Take(15)
                .ToListAsync();

            if (!students.Any()) return;

            var doctors = new[] { "Dr. Priya Sharma", "Dr. Ramesh Nair", "Dr. Anita Patel" };
            var bloodGroups = new[] { "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-" };
            var healthRecords = new List<HealthRecord>();

            for (int i = 0; i < students.Count; i++)
            {
                var s = students[i];
                var ageYears = DateTime.UtcNow.Year - s.DateOfBirth.Year;
                var heightCm = 140m + (ageYears - 10) * 3m + (i % 7);
                var weightKg = 35m + (ageYears - 10) * 2m + (i % 5);

                var healthData = new
                {
                    BloodPressureSystolic = 100 + (i % 20),
                    BloodPressureDiastolic = 65 + (i % 10),
                    HeartRate = 70 + (i % 15),
                    Temperature = (decimal)(98.2 + (i % 3) * 0.2),
                    Allergies = (i % 5 == 0) ? new[] { "Dust" } : Array.Empty<string>(),
                    MedicalConditions = Array.Empty<string>(),
                    CurrentMedications = Array.Empty<string>(),
                    HearingLeft = "Normal", HearingRight = "Normal",
                    DentalStatus = "Good", DentalRemarks = (string?)null,
                    DoctorName = doctors[i % doctors.Length],
                    DoctorNotes = (string?)null, Recommendations = (string?)null,
                    NextCheckupDate = (DateTime?)DateTime.UtcNow.AddMonths(6),
                    Status = "normal",
                    Vaccinations = Array.Empty<object>()
                };

                healthRecords.Add(new HealthRecord
                {
                    Id = Guid.NewGuid(), SchoolId = _schoolId, StudentId = s.Id,
                    CheckupDate = DateTime.UtcNow.AddMonths(-1 - i % 3),
                    Height = heightCm, Weight = weightKg,
                    BloodGroup = bloodGroups[i % bloodGroups.Length],
                    VisionLeft = (i % 8 == 0) ? "6/9" : "6/6",
                    VisionRight = (i % 8 == 0) ? "6/9" : "6/6",
                    CheckedBy = doctors[i % doctors.Length],
                    Notes = JsonSerializer.Serialize(healthData),
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                });
            }

            _context.HealthRecords.AddRange(healthRecords);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} health records seeded", healthRecords.Count);
        }

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

        public async Task SeedAssignmentsAsync()
        {
            _logger.LogInformation("📝 Seeding assignments for classes...");

            // Idempotency: skip if assignments already exist for this school
            if (await _context.Assignments.AnyAsync(a => a.SchoolId == _schoolId))
            {
                _logger.LogInformation("✅ Assignments already seeded, skipping");
                return;
            }

            // Get all classes
            var classes = await _context.Classes
                .Where(c => c.SchoolId == _schoolId)
                .ToListAsync();

            if (classes.Count == 0)
            {
                _logger.LogWarning("⚠️ No classes found, skipping assignment seeding");
                return;
            }

            // Get all subjects
            var subjects = await _context.Subjects
                .Where(s => s.SchoolId == _schoolId)
                .ToListAsync();

            if (subjects.Count == 0)
            {
                _logger.LogWarning("⚠️ No subjects found, skipping assignment seeding");
                return;
            }

            // Get a teacher to assign as AssignedById (first available staff member)
            var assignedByStaff = await _context.StaffMembers
                .Where(s => s.SchoolId == _schoolId && !s.IsDeleted)
                .FirstOrDefaultAsync();

            if (assignedByStaff == null)
            {
                _logger.LogWarning("⚠️ No staff members found, skipping assignment seeding");
                return;
            }

            var assignments = new List<Assignment>();
            var today = DateTime.UtcNow.Date;
            var assignmentIndex = 0;

            // Create 2-3 assignments per class-subject combination (sample data)
            foreach (var cls in classes)
            {
                // Select primary subjects for this class (subset to keep data reasonable)
                var classSubjects = subjects.Take(4).ToList(); // Math, English, Science, Social Science

                foreach (var subject in classSubjects)
                {
                    // Create 2 assignments per subject
                    for (int i = 0; i < 2; i++)
                    {
                        assignmentIndex++;
                        var assignedDate = today.AddDays(-Random.Shared.Next(1, 7));
                        var dueDate = assignedDate.AddDays(Random.Shared.Next(3, 10));

                        var assignment = new Assignment
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = _schoolId,
                            ClassId = cls.Id,
                            SectionId = null, // Applies to whole class
                            SubjectId = subject.Id,
                            AssignedById = assignedByStaff.Id,
                            Title = $"{subject.Name} Assignment #{i + 1} - {cls.Name}",
                            Description = $"Complete all exercises from Chapter {assignmentIndex % 5 + 1}. " +
                                        $"Please solve all problems carefully and submit on time. " +
                                        $"This assignment covers topics studied in the recent classes.",
                            AssignedDate = assignedDate,
                            DueDate = dueDate,
                            MaxMarks = 100,
                            Status = "active",
                            AttachmentUrl = null,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow,
                            IsDeleted = false
                        };

                        assignments.Add(assignment);
                    }
                }
            }

            _context.Assignments.AddRange(assignments);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} assignments seeded for {Classes} classes", assignments.Count, classes.Count);
        }

        public async Task EnsureStudentEnrollmentsAsync()
        {
            _logger.LogInformation("🎓 Ensuring StudentEnrollments for all students...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            // Get current academic year (or create one if needed)
            var currentYear = DateTime.UtcNow.Year;
            var academicYear = await _context.AcademicYears
                .FirstOrDefaultAsync(ay => ay.SchoolId == _schoolId && ay.Name.Contains(currentYear.ToString()));

            if (academicYear == null)
            {
                _logger.LogWarning("⚠️ No academic year found for {Year}, creating default", currentYear);
                academicYear = new AcademicYear
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    Name = $"{currentYear}-{currentYear + 1}",
                    StartDate = new DateTime(currentYear, 4, 1),
                    EndDate = new DateTime(currentYear + 1, 3, 31),
                    IsCurrent = true,
                    Status = "active",
                    CreatedAt = DateTime.UtcNow
                };
                _context.AcademicYears.Add(academicYear);
                await _context.SaveChangesAsync();
            }

            // Get all students
            var students = await _context.Students
                .Where(s => s.SchoolId == _schoolId && !s.IsDeleted)
                .ToListAsync();

            if (students.Count == 0)
            {
                _logger.LogWarning("⚠️ No students found, skipping StudentEnrollment seeding");
                return;
            }

            var classMap = await _context.Classes
                .Where(c => c.SchoolId == _schoolId)
                .ToDictionaryAsync(c => c.Name);

            var sectionMap = await _context.Sections
                .Where(s => s.SchoolId == _schoolId)
                .GroupBy(s => s.ClassId)
                .ToDictionaryAsync(g => g.Key, g => g.ToDictionary(s => s.Name, s => s.Id));

            var enrollmentsToAdd = new List<StudentEnrollment>();
            var existingEnrollments = await _context.StudentEnrollments
                .Where(e => e.SchoolId == _schoolId && e.AcademicYearId == academicYear.Id)
                .Select(e => new { e.StudentId, e.ClassId, e.SectionId })
                .ToListAsync();

            foreach (var student in students)
            {
                try
                {
#pragma warning disable CS0618
                    var className = student.Class ?? "Class 1";
                    var sectionName = student.Section ?? "A";
#pragma warning restore CS0618

                    if (!classMap.TryGetValue(className, out var classEntity))
                    {
                        _logger.LogWarning("⚠️ Class '{ClassName}' not found for student {StudentId}", className, student.Id);
                        continue;
                    }

                    if (!sectionMap.TryGetValue(classEntity.Id, out var sections) || !sections.TryGetValue(sectionName, out var sectionId))
                    {
                        _logger.LogWarning("⚠️ Section '{SectionName}' not found in class '{ClassName}' for student {StudentId}", sectionName, className, student.Id);
                        continue;
                    }

                    // Check if enrollment already exists
                    if (existingEnrollments.Any(e => e.StudentId == student.Id && e.ClassId == classEntity.Id && e.SectionId == sectionId))
                    {
                        continue;
                    }

                    var enrollment = new StudentEnrollment
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = _schoolId,
                        StudentId = student.Id,
                        AcademicYearId = academicYear.Id,
                        ClassId = classEntity.Id,
                        SectionId = sectionId,
                        RollNumber = student.RollNumber,
                        Status = "active",
                        EnrollmentDate = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    };

                    enrollmentsToAdd.Add(enrollment);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "⚠️ Error creating enrollment for student {StudentId}", student.Id);
                }
            }

            if (enrollmentsToAdd.Count > 0)
            {
                _context.StudentEnrollments.AddRange(enrollmentsToAdd);
                await _context.SaveChangesAsync();
                _logger.LogInformation("✅ {Count} student enrollments ensured", enrollmentsToAdd.Count);
            }
            else
            {
                _logger.LogInformation("✅ Student enrollments already up to date");
            }
        }

        public async Task EnsureParentNotificationsAsync()
        {
            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            // Look up the demo parent's actual UserLogin ID by email so notifications
            // are always matched regardless of when/how the account was created.
            const string parentEmail = "aj@gmail.com";
            var parentUser = await _context.UserLogins
                .IgnoreQueryFilters()
                .Where(ul => ul.Email.ToLower() == parentEmail && ul.SchoolId == _schoolId && !ul.IsDeleted)
                .FirstOrDefaultAsync();

            if (parentUser == null)
            {
                _logger.LogInformation("Demo parent user not found — skipping parent notifications seed.");
                return;
            }

            var parentId = parentUser.Id;

            // Stable notification IDs — used to check existence idempotently
            var seed = new[]
            {
                new { Id = Guid.Parse("c1000001-0001-4000-8000-000000000001"), Type = "Fee",          Priority = "High",   Title = "Fee Payment Reminder",          Content = "Monthly school fee of ₹4,500 for Riya Gupta (Class 8-A) is due by 25th June 2025. Kindly make the payment to avoid late charges.",                   CreatedAt = new DateTime(2025, 6, 15,  9,  0, 0, DateTimeKind.Utc) },
                new { Id = Guid.Parse("c1000001-0001-4000-8000-000000000002"), Type = "Fee",          Priority = "High",   Title = "Fee Payment Reminder",          Content = "Monthly school fee of ₹4,500 for Rohan Gupta (Class 10-A) is due by 25th June 2025. Please clear the balance at the earliest.",                         CreatedAt = new DateTime(2025, 6, 15,  9,  5, 0, DateTimeKind.Utc) },
                new { Id = Guid.Parse("c1000001-0001-4000-8000-000000000003"), Type = "Exam",         Priority = "Normal", Title = "Unit Test 2 Results Published",  Content = "Rohan Gupta's Unit Test 2 results are now available. Please check the Academics section for detailed marks and grade breakdown.",                       CreatedAt = new DateTime(2025, 6, 14, 14, 30, 0, DateTimeKind.Utc) },
                new { Id = Guid.Parse("c1000001-0001-4000-8000-000000000004"), Type = "Attendance",   Priority = "Normal", Title = "Attendance Alert",               Content = "Riya Gupta was absent on 10th June 2025. If this is an error, please contact the class teacher. Current attendance: 82%.",                               CreatedAt = new DateTime(2025, 6, 10, 16,  0, 0, DateTimeKind.Utc) },
                new { Id = Guid.Parse("c1000001-0001-4000-8000-000000000005"), Type = "Announcement", Priority = "Normal", Title = "Annual Sports Day",              Content = "Annual Sports Day is scheduled for 20th June 2025. Students are requested to be present by 8:00 AM in their house colour T-shirts.",                   CreatedAt = new DateTime(2025, 6, 12, 11,  0, 0, DateTimeKind.Utc) },
                new { Id = Guid.Parse("c1000001-0001-4000-8000-000000000006"), Type = "Exam",         Priority = "Normal", Title = "Mid-Term Results Published",     Content = "Mid-Term examination results for both Riya and Rohan are now available in the Academics section. Please review and encourage your children.",          CreatedAt = new DateTime(2025, 5, 18, 15,  0, 0, DateTimeKind.Utc) },
                new { Id = Guid.Parse("c1000001-0001-4000-8000-000000000007"), Type = "Fee",          Priority = "Normal", Title = "Payment Received — Thank You",   Content = "We have received your fee payment of ₹4,500 for Riya Gupta for the month of May 2025. Receipt has been generated and is available in the Fee section.", CreatedAt = new DateTime(2025, 5, 15, 11,  0, 0, DateTimeKind.Utc) },
                new { Id = Guid.Parse("c1000001-0001-4000-8000-000000000008"), Type = "Announcement", Priority = "High",   Title = "Parent-Teacher Meeting",         Content = "Parent-Teacher Meeting is scheduled on 16th June 2025 from 10 AM to 1 PM. Your presence is requested to discuss your child's academic progress.",      CreatedAt = new DateTime(2025, 6, 16,  8,  0, 0, DateTimeKind.Utc) },
            };

            // Migrate any notifications that have the stable IDs but a wrong RecipientId
            // (happens when a previous seeder run used a hard-coded placeholder GUID).
            var allStableIds = seed.Select(s => s.Id).ToList();
            var wrongRecipient = await _context.Notifications
                .IgnoreQueryFilters()
                .Where(n => allStableIds.Contains(n.Id) && n.RecipientId != parentId)
                .ToListAsync();
            if (wrongRecipient.Any())
            {
                foreach (var notif in wrongRecipient)
                {
                    notif.RecipientId = parentId;
                    notif.UpdatedAt   = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();
                _logger.LogInformation("✅ Migrated {Count} parent notifications to correct RecipientId", wrongRecipient.Count);
            }

            var existingIds = await _context.Notifications
                .IgnoreQueryFilters()
                .Where(n => allStableIds.Contains(n.Id))
                .Select(n => n.Id)
                .ToListAsync();

            var missing = seed.Where(s => !existingIds.Contains(s.Id)).ToList();

            if (missing.Any())
            {
                var toAdd = missing.Select(s => new Notification
                {
                    Id            = s.Id,
                    SchoolId      = _schoolId,
                    RecipientId   = parentId,
                    RecipientType = "Parent",
                    Type          = s.Type,
                    Title         = s.Title,
                    Content       = s.Content,
                    Priority      = s.Priority,
                    IsRead        = false,
                    CreatedAt     = s.CreatedAt,
                    UpdatedAt     = s.CreatedAt,
                }).ToList();

                _context.Notifications.AddRange(toAdd);
                await _context.SaveChangesAsync();
                _logger.LogInformation("✅ Seeded {Count} parent notifications", toAdd.Count);
            }
            else
            {
                _logger.LogInformation("Parent notifications already seeded ({Count} exist)", existingIds.Count);
            }
        }

        public async Task SeedExamTypesAsync()
        {
            if (await _context.ExamTypes.AnyAsync(e => e.SchoolId == _schoolId))
            {
                _logger.LogInformation("Exam types already seeded");
                return;
            }

            var examTypes = new List<ExamType>
            {
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Unit Test",     DefaultMaxMarks = 25,  ExamsPerTerm = 2, IsUnitTest = true,  Description = "Short unit-level tests (typically 25 marks)",              Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Quarterly",     DefaultMaxMarks = 80,  ExamsPerTerm = 1, IsUnitTest = false, Description = "Quarterly exam covering Term 1 syllabus",                  Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Half Yearly",   DefaultMaxMarks = 80,  ExamsPerTerm = 1, IsUnitTest = false, Description = "Half-yearly (mid-term) exam covering first half syllabus", Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Pre-Board",     DefaultMaxMarks = 100, ExamsPerTerm = 1, IsUnitTest = false, Description = "Pre-board practice exam for senior classes",              Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Annual",        DefaultMaxMarks = 100, ExamsPerTerm = 1, IsUnitTest = false, Description = "Annual final examination covering full syllabus",          Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Id = Guid.NewGuid(), SchoolId = _schoolId, Name = "Practical",     DefaultMaxMarks = 30,  ExamsPerTerm = 1, IsUnitTest = false, Description = "Practical / lab-based assessment",                        Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            };

            _context.ExamTypes.AddRange(examTypes);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} exam types seeded", examTypes.Count);
        }

        // ─── RBAC Test Staff ─────────────────────────────────────────────────────
        // Seeds one staff member + UserLogin per role group that needs RBAC testing:
        //   Transport Manager, Accountant (fees/finance), Hostel Warden, Receptionist (admin/office)
        public async Task SeedExaminationsAsync()
        {
            _logger.LogInformation("📝 Seeding examinations...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            // Resolve the current/active academic year so seeded exams appear in the dropdown
            var academicYear = await _context.AcademicYears
                .Where(y => y.SchoolId == _schoolId && !y.IsDeleted)
                .OrderByDescending(y => y.EndDate)
                .Select(y => y.Name)
                .FirstOrDefaultAsync() ?? "2026-27";

            var examIds = new[]
            {
                Guid.Parse("eeeee001-0000-4000-8000-000000000001"),
                Guid.Parse("eeeee001-0000-4000-8000-000000000002"),
                Guid.Parse("eeeee001-0000-4000-8000-000000000003"),
            };

            // Idempotent: only add exams whose deterministic IDs are missing
            var existingIds = await _context.Examinations
                .Where(e => examIds.Contains(e.Id))
                .Select(e => e.Id)
                .ToListAsync();

            var examsToAdd = new List<Exam>();
            if (!existingIds.Contains(examIds[0]))
                examsToAdd.Add(new() { Id = examIds[0], SchoolId = _schoolId, Name = "Mid-Term Mathematics",            Class = "Class 1", Subject = "Mathematics", ExamDate = DateTime.UtcNow.AddMonths(-3), TotalMarks = 100, PassingMarks = 35, AcademicYear = academicYear, Status = "completed", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            if (!existingIds.Contains(examIds[1]))
                examsToAdd.Add(new() { Id = examIds[1], SchoolId = _schoolId, Name = "Unit Test 1 – English",           Class = "Class 2", Subject = "English",      ExamDate = DateTime.UtcNow.AddMonths(-2), TotalMarks =  50, PassingMarks = 18, AcademicYear = academicYear, Status = "completed", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            if (!existingIds.Contains(examIds[2]))
                examsToAdd.Add(new() { Id = examIds[2], SchoolId = _schoolId, Name = "Quarterly Examination – Science", Class = "Class 3", Subject = "Science",      ExamDate = DateTime.UtcNow.AddMonths(-1), TotalMarks =  80, PassingMarks = 28, AcademicYear = academicYear, Status = "completed", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });

            if (examsToAdd.Count > 0)
            {
                _context.Examinations.AddRange(examsToAdd);
                await _context.SaveChangesAsync();
                _logger.LogInformation("✅ Added {Count} seed exams (academic year: {Year})", examsToAdd.Count, academicYear);
            }
            else
            {
                _logger.LogInformation("✅ Seed exams already present");
            }

            // Seed ExamResults — only for seed exams that have no results yet
            var students = await _context.Students
                .Where(s => s.SchoolId == _schoolId)
                .Take(10)
                .ToListAsync();

            if (students.Count == 0)
            {
                _logger.LogWarning("⚠️ No students found, skipping exam results seeding");
                return;
            }

            var rng = new Random(42);
            string[] subjects    = { "Mathematics", "English", "Science" };
            int[]    maxMarkArr  = { 100, 50, 80 };
            int[]    passMarkArr = { 35, 18, 28 };

#pragma warning disable CS0618 // ExamResult kept for backward compat — ExaminationReportService reads _context.ExamResults
            var results = new List<ExamResult>();
            for (int i = 0; i < examIds.Length; i++)
            {
                // Skip if results already exist for this exam
                var hasResults = await _context.ExamResults.AnyAsync(r => r.ExamId == examIds[i] && r.SchoolId == _schoolId);
                if (hasResults) continue;

                foreach (var student in students)
                {
                    int obtained = rng.Next(passMarkArr[i] - 5, maxMarkArr[i] + 1);
                    if (obtained < 0) obtained = 0;
                    decimal pct = Math.Round((decimal)obtained / maxMarkArr[i] * 100, 2);
                    string grade = pct >= 90m ? "A+" : pct >= 80m ? "A" : pct >= 70m ? "B+" :
                                   pct >= 60m ? "B"  : pct >= 50m ? "C" : pct >= 33m ? "D" : "F";
                    results.Add(new ExamResult
                    {
                        Id            = Guid.NewGuid(),
                        SchoolId      = _schoolId,
                        ExamId        = examIds[i],
                        StudentId     = student.Id,
                        Subject       = subjects[i],
                        MarksObtained = obtained,
                        TotalMarks    = maxMarkArr[i],
                        Percentage    = pct,
                        Grade         = grade,
                        IsPass        = obtained >= passMarkArr[i],
                        CreatedAt     = DateTime.UtcNow,
                        UpdatedAt     = DateTime.UtcNow
                    });
                }
            }
#pragma warning restore CS0618

            if (results.Count > 0)
            {
                _context.ExamResults.AddRange(results);
                await _context.SaveChangesAsync();
                _logger.LogInformation("✅ {Count} exam results seeded", results.Count);
            }
            else
            {
                _logger.LogInformation("✅ Exam results already present");
            }
        }

        public async Task SeedRbacTestStaffAsync()        {
            _logger.LogInformation("🔐 Seeding RBAC test staff accounts...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            // (email, username, firstName, lastName, designation, department, role, employeeId)
            var rbacStaff = new[]
            {
                ("transport.mgr@demo.edu",  "transport.mgr",  "Vikram",   "Nair",    "Transport Manager", "Transport",       "Staff", "TRP001"),
                ("accountant@demo.edu",     "accountant",     "Meena",    "Sharma",  "Accountant",        "Finance",         "Staff", "FIN001"),
                ("hostel.warden@demo.edu",  "hostel.warden",  "Suresh",   "Pillai",  "Hostel Warden",     "Hostel",          "Staff", "HST001"),
                ("receptionist@demo.edu",   "receptionist",   "Ananya",   "Verma",   "Receptionist",      "Administration",  "Staff", "ADM001"),
            };

            const string password = "Staff@123";

            foreach (var (email, username, first, last, designation, dept, role, empId) in rbacStaff)
            {
                // Upsert StaffMember first (so we have its Id for LinkedEntityId)
                var existingStaff = await _context.StaffMembers.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.Email == email && s.SchoolId == _schoolId);

                Guid staffEntityId;
                if (existingStaff == null)
                {
                    staffEntityId = Guid.NewGuid();
                    _context.StaffMembers.Add(new Staff
                    {
                        Id = staffEntityId,
                        SchoolId = _schoolId,
                        EmployeeId = empId,
                        FirstName = first,
                        LastName = last,
                        Name = $"{first} {last}",
                        Email = email,
                        Phone = "+91-9876500001",
                        DateOfBirth = new DateTime(1985, 1, 15),
                        Gender = (first == "Meena" || first == "Ananya") ? "Female" : "Male",
                        Address = "School Campus, Mumbai, Maharashtra 400001",
                        Department = dept,
                        Designation = designation,
                        Qualification = "Graduate",
                        Experience = 5,
                        JoiningDate = new DateTime(2022, 6, 1),
                        EmploymentType = "permanent",
                        Salary = 35000m,
                        Status = "active",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync(); // flush so we have the Id
                }
                else
                {
                    staffEntityId = existingStaff.Id;
                }

                // Upsert UserLogin — link via LinkedEntityId = Staff.Id
                var existingLogin = await _context.UserLogins.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Email == email && u.SchoolId == _schoolId);

                if (existingLogin != null)
                {
                    existingLogin.Role = role;
                    existingLogin.Status = "active";
                    existingLogin.LinkedEntityId = staffEntityId;
                    existingLogin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
                    existingLogin.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _context.UserLogins.Add(new UserLogin
                    {
                        Id = Guid.NewGuid(),
                        SchoolId = _schoolId,
                        Username = username,
                        Email = email,
                        FirstName = first,
                        LastName = last,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12),
                        Role = role,
                        Status = "active",
                        LinkedEntityId = staffEntityId,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ RBAC test staff seeded: transport.mgr, accountant, hostel.warden, receptionist @demo.edu (password: Staff@123)");
        }

        // ─── Parent Login ────────────────────────────────────────────────────────────
        // Ensures the demo parent account always exists with a well-known password so
        // testers can log in without knowing the Program.cs bootstrap password.
        // Credentials: aj@gmail.com / Parent@123
        private async Task EnsureParentLoginAsync()
        {
            _logger.LogInformation("👨‍👩‍👧 Ensuring demo parent login (aj@gmail.com)...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            const string parentEmail    = "aj@gmail.com";
            const string parentPassword = "Parent@123";

            var existing = await _context.UserLogins.IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == parentEmail && u.SchoolId == _schoolId && !u.IsDeleted);

            if (existing != null)
            {
                // Ensure role and status are correct; reset to known password so login works
                existing.Role     = "Parent";
                existing.Status   = "active";
                existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(parentPassword, workFactor: 12);
                existing.UpdatedAt    = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                _logger.LogInformation("✅ Demo parent login updated (aj@gmail.com / Parent@123)");
                return;
            }

            // Create fresh parent login
            _context.UserLogins.Add(new UserLogin
            {
                Id            = Guid.NewGuid(),
                SchoolId      = _schoolId,
                Username      = "parent_demo",
                Email         = parentEmail,
                FirstName     = "Arjun",
                LastName      = "Joshi",
                PasswordHash  = BCrypt.Net.BCrypt.HashPassword(parentPassword, workFactor: 12),
                Role          = "Parent",
                Status        = "active",
                LinkedEntityType = "parent",
                CreatedAt     = DateTime.UtcNow,
                UpdatedAt     = DateTime.UtcNow,
            });
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ Demo parent login created: aj@gmail.com / Parent@123");
        }

        // ─── Student Logins ───────────────────────────────────────────────────────
        /// <summary>
        /// Seeds UserLogin rows for three demo students so the student mobile portal is testable.
        /// Uses the static UUIDs assigned to Riya Joshi (index 8) and Rohan Nair (index 9) in
        /// SeedStudentsAsync(), plus the first student in Class 1-A (Aarav Patel, index 0).
        /// Password: Student@123 (BCrypt hashed).
        /// </summary>
        public async Task SeedStudentLoginsAsync()
        {
            _logger.LogInformation("🎓 Seeding student login accounts...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            const string studentPassword = "Student@123";

            // Candidate students: Aarav Patel (Class 1-A first student), Riya Joshi, Rohan Nair.
            // We look them up by email to keep this idempotent.
            var candidates = new[]
            {
                new { Email = "aarav.patel@student.stmarys.edu.in", Username = "aarav.patel",  First = "Aarav",  Last = "Patel"  },
                new { Email = "riya.joshi@student.stmarys.edu.in",  Username = "riya.joshi",   First = "Riya",   Last = "Joshi"  },
                new { Email = "rohan.nair@student.stmarys.edu.in",  Username = "rohan.nair",   First = "Rohan",  Last = "Nair"   },
            };

            foreach (var c in candidates)
            {
                // Skip if login already exists
                var existing = await _context.UserLogins.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == c.Email && u.SchoolId == _schoolId && !u.IsDeleted);

                if (existing != null)
                {
                    // Ensure role + password are correct
                    existing.Role         = "Student";
                    existing.Status       = "active";
                    existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(studentPassword, workFactor: 12);
                    existing.UpdatedAt    = DateTime.UtcNow;
                    continue;
                }

                // Find the linked student entity
                var student = await _context.Students.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.SchoolId == _schoolId && s.Email.ToLower() == c.Email && !s.IsDeleted);

                _context.UserLogins.Add(new UserLogin
                {
                    Id               = Guid.NewGuid(),
                    SchoolId         = _schoolId,
                    Username         = c.Username,
                    Email            = c.Email,
                    FirstName        = c.First,
                    LastName         = c.Last,
                    PasswordHash     = BCrypt.Net.BCrypt.HashPassword(studentPassword, workFactor: 12),
                    Role             = "Student",
                    Status           = "active",
                    LinkedEntityId   = student?.Id,
                    LinkedEntityType = "student",
                    CreatedAt        = DateTime.UtcNow,
                    UpdatedAt        = DateTime.UtcNow,
                    IsDeleted        = false,
                });
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ Student login accounts ensured (Student@123)");
        }

        // ─── School Feature Permissions ───────────────────────────────────────────
        /// <summary>
        /// Ensures all 20 standard modules are enabled in SchoolFeaturePermissions for the demo school.
        /// Without this seed the mobile app-config endpoint returns all module flags as false on a fresh DB,
        /// causing library, transport, hostel and other modules to appear locked on first launch.
        /// </summary>
        private async Task SeedSchoolFeaturePermissionsAsync()
        {
            _logger.LogInformation("🔑 Seeding school feature permissions...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            var modules = new[]
            {
                "students", "staff", "attendance", "fees", "timetable", "examinations",
                "announcements", "reports", "documents", "admissions", "library",
                "transport", "hostel", "health", "payroll", "communication",
                "analytics", "certificates", "store", "wallet",
            };

            foreach (var module in modules)
            {
                var exists = await _context.SchoolFeaturePermissions
                    .IgnoreQueryFilters()
                    .AnyAsync(p => p.SchoolId == _schoolId && p.ModuleName == module && !p.IsDeleted);

                if (!exists)
                {
                    _context.SchoolFeaturePermissions.Add(new SchoolFeaturePermission
                    {
                        Id               = Guid.NewGuid(),
                        SchoolId         = _schoolId,
                        ModuleName       = module,
                        IsEnabled        = true,
                        PermissionLevels = "read,write,delete",
                        PackageName      = "Standard",
                        Notes            = "Seeded by DbSeeder",
                        CreatedAt        = DateTime.UtcNow,
                        UpdatedAt        = DateTime.UtcNow,
                        IsDeleted        = false,
                    });
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ School feature permissions ensured for {Count} modules", modules.Length);
        }

        // ─── Leave Applications ───────────────────────────────────────────────────
        private async Task SeedLeaveApplicationsAsync()
        {
            _logger.LogInformation("📋 Seeding leave applications...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            if (await _context.LeaveRequests.AnyAsync(l => l.SchoolId == _schoolId))
            {
                _logger.LogInformation("✅ Leave applications already seeded");
                return;
            }

            var leaveTypes = await _context.LeaveTypes
                .Where(lt => lt.SchoolId == _schoolId && lt.IsActive)
                .ToListAsync();

            if (!leaveTypes.Any())
            {
                _logger.LogWarning("⚠️ No leave types found, skipping leave application seeding");
                return;
            }

            var staffMembers = await _context.StaffMembers
                .Where(s => s.SchoolId == _schoolId && s.IsActive && !s.IsDeleted)
                .Take(6)
                .ToListAsync();

            var students = await _context.Students
                .Where(s => s.SchoolId == _schoolId && !s.IsDeleted)
                .Take(12)
                .ToListAsync();

            var rng = new Random(789);
            var today = DateTime.UtcNow.Date;
            var requests = new List<StaffLeaveRequest>();

            var staffLeaveReasons = new[]
            {
                "Feeling unwell - fever and cold. Will submit medical certificate.",
                "Family function - sister's wedding. Prior notice as required.",
                "Personal work - property registration. Will complete pending tasks beforehand.",
                "Medical appointment - follow-up checkup scheduled for this day.",
                "Child's school function - mandatory parent attendance event.",
                "Out of station - family emergency, returning next week.",
            };

            var studentLeaveReasons = new[]
            {
                "Suffering from fever and cold. Doctor has advised rest for 2 days.",
                "Family function - attending elder sibling's wedding ceremony.",
                "Medical appointment - scheduled dental procedure.",
                "Out of station with family - visiting grandparents in hometown.",
                "Participating in state-level science olympiad competition.",
                "Religious festival observance at home temple.",
                "Sports event - selected for district cricket team.",
                "Throat infection - ENT specialist visit recommended.",
                "Family emergency - grandfather hospitalised.",
                "Prior engagement - passport application appointment.",
                "Mild viral fever, doctor advised 3 days of rest.",
                "Cultural program at community hall - compulsory family event.",
            };

            var statuses = new[] { "Approved", "Pending", "Approved", "Rejected", "Approved", "Pending" };

            // Staff leave requests
            foreach (var (staff, i) in staffMembers.Select((s, i) => (s, i)))
            {
                var staffLeaveType = leaveTypes.FirstOrDefault(lt => lt.ApplicableTo == "Staff")
                    ?? leaveTypes[i % leaveTypes.Count];
                var startDate = today.AddDays(-rng.Next(5, 45));
                var days = rng.Next(1, 4);
                var status = statuses[i % statuses.Length];

                requests.Add(new StaffLeaveRequest
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    LeaveNumber = $"SL{DateTime.UtcNow.Year}{(i + 1):D4}",
                    ApplicantId = staff.Id,
                    ApplicantType = "Staff",
                    LeaveTypeId = staffLeaveType.Id,
                    StartDate = startDate,
                    EndDate = startDate.AddDays(days),
                    TotalDays = days + 1,
                    Reason = staffLeaveReasons[i % staffLeaveReasons.Length],
                    Status = status,
                    ApplicationDate = startDate.AddDays(-rng.Next(1, 3)),
                    ApprovedByStaffId = status != "Pending" ? staff.Id : null,
                    ApprovedDate = status == "Approved" ? startDate.AddDays(-1) : null,
                    ApproverRemarks = status == "Approved" ? "Approved. Please ensure class work is covered." :
                                      status == "Rejected" ? "Cannot be approved due to upcoming board exams." : null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            // Student leave requests (using StaffLeaveRequest with ApplicantType = "Student")
            foreach (var (student, i) in students.Select((s, i) => (s, i)))
            {
                var studentLeaveType = leaveTypes.FirstOrDefault(lt =>
                    lt.ApplicableTo == "Student" || lt.ApplicableTo == "All")
                    ?? leaveTypes[i % leaveTypes.Count];

                var startDate = today.AddDays(-rng.Next(3, 30));
                var days = rng.Next(1, 3);
                var status = statuses[i % statuses.Length];

                requests.Add(new StaffLeaveRequest
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    LeaveNumber = $"STL{DateTime.UtcNow.Year}{(i + 1):D4}",
                    ApplicantId = student.Id,
                    ApplicantType = "Student",
                    LeaveTypeId = studentLeaveType.Id,
                    StartDate = startDate,
                    EndDate = startDate.AddDays(days),
                    TotalDays = days + 1,
                    Reason = studentLeaveReasons[i % studentLeaveReasons.Length],
                    Status = status,
                    ApplicationDate = startDate.AddDays(-1),
                    ApprovedDate = status == "Approved" ? startDate : null,
                    ApproverRemarks = status == "Approved" ? "Approved. Please complete missed work upon return." :
                                      status == "Rejected" ? "Not approved - class test scheduled on this date." : null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            _context.LeaveRequests.AddRange(requests);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} leave applications seeded ({Staff} staff, {Students} students)",
                requests.Count, staffMembers.Count, students.Count);
        }

        // ─── Assignment Submissions ───────────────────────────────────────────────
        private async Task SeedAssignmentSubmissionsAsync()
        {
            _logger.LogInformation("📝 Seeding assignment submissions...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            var assignments = await _context.Assignments
                .Where(a => a.SchoolId == _schoolId && !a.IsDeleted)
                .Take(20)
                .ToListAsync();

            if (!assignments.Any())
            {
                _logger.LogWarning("⚠️ No assignments found, skipping submission seeding");
                return;
            }

            var assignmentIds = assignments.Select(a => a.Id).ToList();
            if (await _context.AssignmentSubmissions.AnyAsync(s => assignmentIds.Contains(s.AssignmentId)))
            {
                _logger.LogInformation("✅ Assignment submissions already seeded");
                return;
            }

            var students = await _context.Students
                .Where(s => s.SchoolId == _schoolId && !s.IsDeleted)
                .Take(15)
                .ToListAsync();

            var assignedByStaff = await _context.StaffMembers
                .Where(s => s.SchoolId == _schoolId && !s.IsDeleted)
                .FirstOrDefaultAsync();

            if (assignedByStaff == null || !students.Any()) return;

            var rng = new Random(321);
            var submissions = new List<AssignmentSubmission>();

            var submissionContents = new[]
            {
                "I have completed all the given exercises. Please find my solutions attached.",
                "Attempted all problems. Some were challenging but I gave my best effort.",
                "Completed the assignment on time. Used the examples from the textbook.",
                "All questions answered. I double-checked my work before submitting.",
                "Done as per instructions. Referenced chapter 3 for the last section.",
            };

            var feedbacks = new[]
            {
                "Excellent work! Very well organized and accurate solutions.",
                "Good effort. Please review Question 4 as the approach could be improved.",
                "Well done! Your understanding of the topic is clear.",
                "Satisfactory. Work on presenting your steps more clearly.",
                "Outstanding submission. Keep up the great work!",
                "Good, but missed a few steps in the solution. Please refer to class notes.",
            };

            foreach (var assignment in assignments)
            {
                // 70-90% of students submit
                var submitterCount = rng.Next((int)(students.Count * 0.7), students.Count + 1);
                var submitters = students.OrderBy(_ => rng.Next()).Take(submitterCount).ToList();

                foreach (var student in submitters)
                {
                    var daysAfterAssigned = rng.Next(1, 6);
                    var submissionDate = assignment.AssignedDate.AddDays(daysAfterAssigned);
                    if (submissionDate > assignment.DueDate.AddDays(2))
                        submissionDate = assignment.DueDate.AddDays(-1);

                    var isGraded = rng.Next(0, 100) < 65;
                    var marksObtained = isGraded
                        ? Math.Round((decimal)rng.Next(55, (int)assignment.MaxMarks + 1), 1)
                        : (decimal?)null;

                    submissions.Add(new AssignmentSubmission
                    {
                        Id = Guid.NewGuid(),
                        AssignmentId = assignment.Id,
                        StudentId = student.Id,
                        SubmissionDate = submissionDate,
                        Content = submissionContents[rng.Next(submissionContents.Length)],
                        Status = isGraded ? "graded" : "submitted",
                        MarksObtained = marksObtained,
                        Feedback = isGraded ? feedbacks[rng.Next(feedbacks.Length)] : null,
                        GradedById = isGraded ? assignedByStaff.Id : null,
                        GradedDate = isGraded ? submissionDate.AddDays(rng.Next(1, 4)) : null,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            _context.AssignmentSubmissions.AddRange(submissions);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} assignment submissions seeded across {Assignments} assignments",
                submissions.Count, assignments.Count);
        }

        // ─── Admission Applications ───────────────────────────────────────────────
        public async Task SeedAdmissionApplicationsAsync()
        {
            _logger.LogInformation("📋 Seeding admission applications...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            if (await _context.Admissions.AnyAsync(a => a.SchoolId == _schoolId))
            {
                _logger.LogInformation("✅ Admission applications already seeded");
                return;
            }

            var rng = new Random(777);
            var statuses = new[] { "Pending", "Pending", "Pending", "Shortlisted", "Shortlisted", "Approved", "Approved", "Enrolled", "Rejected", "Inquiry" };
            var classes  = new[] { "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10" };

            var applicants = new[]
            {
                ("Rahul", "Verma",    "Sunita Verma",    "9876501001", "sunita.v@gmail.com",    "M"),
                ("Priya", "Sharma",   "Rajesh Sharma",   "9876501002", "rajesh.s@gmail.com",    "F"),
                ("Ankit", "Gupta",    "Meena Gupta",     "9876501003", "meena.g@yahoo.com",     "M"),
                ("Sneha", "Patil",    "Suresh Patil",    "9876501004", "suresh.p@gmail.com",    "F"),
                ("Rohan", "Joshi",    "Kavita Joshi",    "9876501005", "kavita.j@gmail.com",    "M"),
                ("Nisha", "Reddy",    "Venkat Reddy",    "9876501006", "venkat.r@hotmail.com",  "F"),
                ("Aryan", "Mehta",    "Pooja Mehta",     "9876501007", "pooja.m@gmail.com",     "M"),
                ("Kavya", "Iyer",     "Krishnan Iyer",   "9876501008", "krishnan.i@gmail.com",  "F"),
                ("Vivek", "Pandey",   "Geeta Pandey",    "9876501009", "geeta.p@gmail.com",     "M"),
                ("Divya", "Nair",     "Suresh Nair",     "9876501010", "suresh.n@gmail.com",    "F"),
            };

            var admissions = new List<Admission>();
            for (var i = 0; i < applicants.Length; i++)
            {
                var (first, last, parent, phone, email, gender) = applicants[i];
                var status = statuses[i % statuses.Length];
                var appDate = DateTime.UtcNow.AddDays(-rng.Next(1, 30));

                admissions.Add(new Admission
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    ApplicationNumber = $"ADM{DateTime.UtcNow.Year}{(i + 1001):D4}",
                    FirstName = first,
                    LastName = last,
                    ParentName = parent,
                    ParentPhone = phone,
                    ParentEmail = email,
                    ApplyingForClass = classes[rng.Next(classes.Length)],
                    ApplicationDate = appDate,
                    Status = status,
                    DateOfBirth = new DateTime(DateTime.UtcNow.Year - rng.Next(5, 14), rng.Next(1, 12), rng.Next(1, 28)),
                    Gender = gender,
                    Address = $"{rng.Next(1, 100)}, Demo Nagar, Mumbai, Maharashtra",
                    Remarks = status == "Rejected" ? "Seats not available for requested class." :
                              status == "Approved" ? "All documents verified. Eligible for admission." :
                              status == "Shortlisted" ? "Call for interview scheduled." : null,
                    CreatedAt = appDate,
                    UpdatedAt = appDate,
                });
            }

            _context.Admissions.AddRange(admissions);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} admission applications seeded ({Pending} pending)",
                admissions.Count, admissions.Count(a => a.Status == "Pending"));
        }

        // ─── Student Documents ────────────────────────────────────────────────────
        public async Task SeedStudentDocumentsAsync()
        {
            _logger.LogInformation("📄 Seeding student documents...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            if (await _context.StudentDocuments.AnyAsync(d => d.SchoolId == _schoolId))
            {
                _logger.LogInformation("✅ Student documents already seeded");
                return;
            }

            var students = await _context.Students
                .Where(s => s.SchoolId == _schoolId && !s.IsDeleted)
                .Take(5)
                .ToListAsync();

            if (!students.Any())
            {
                _logger.LogWarning("⚠️ No students found for document seeding");
                return;
            }

            var docTypes = new[] { "aadharCard", "birthCertificate", "tcFromPreviousSchool", "photo" };
            var verificationStatuses = new[] { "pending", "pending", "pending", "verified", "verified" };
            var documents = new List<StudentDocument>();
            var rng = new Random(888);

            foreach (var (student, si) in students.Select((s, i) => (s, i)))
            {
                var docType = docTypes[si % docTypes.Length];
                documents.Add(new StudentDocument
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    StudentId = student.Id,
                    DocumentType = docType,
                    FileName = $"{docType}_{student.AdmissionNumber}.pdf",
                    FileUrl = $"/documents/placeholder/{student.AdmissionNumber}/{docType}.pdf",
                    VerificationStatus = verificationStatuses[si % verificationStatuses.Length],
                    UploadedAt = DateTime.UtcNow.AddDays(-rng.Next(1, 15)),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
            }

            _context.StudentDocuments.AddRange(documents);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} student documents seeded ({Pending} pending verification)",
                documents.Count, documents.Count(d => d.VerificationStatus == "pending"));
        }

        // ─── Today's Attendance ───────────────────────────────────────────────────
        public async Task EnsureTodayAttendanceAsync()
        {
            _logger.LogInformation("📅 Ensuring today's attendance records...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            var today = DateTime.UtcNow.Date;

            if (await _context.AttendanceRecords.AnyAsync(a => a.SchoolId == _schoolId && a.Date == today && a.EntityType == "Student"))
            {
                _logger.LogInformation("✅ Today's attendance already exists");
                return;
            }

            var students = await _context.Students
                .Where(s => s.SchoolId == _schoolId && s.Status == "active" && !s.IsDeleted)
                .Take(50)
                .ToListAsync();

            if (!students.Any()) return;

            var rng = new Random(today.DayOfYear);
            var records = new List<AttendanceRecord>();

            foreach (var student in students)
            {
                var roll = rng.Next(1, 101);
                var status = roll <= 80 ? "present" : roll <= 95 ? "absent" : "late";
                records.Add(new AttendanceRecord
                {
                    Id = Guid.NewGuid(),
                    SchoolId = _schoolId,
                    EntityType = "Student",
                    StudentId = student.Id,
                    Date = today,
                    Status = status,
                    Remarks = status == "absent" ? "Not present" : null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
            }

            _context.AttendanceRecords.AddRange(records);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} attendance records seeded for today ({Present} present, {Absent} absent)",
                records.Count,
                records.Count(r => r.Status == "present"),
                records.Count(r => r.Status == "absent"));
        }

        // ─── Overdue Fee Records ──────────────────────────────────────────────────
        // ─── Library Issues — 5 active issues, 2 overdue ─────────────────────────
        public async Task SeedLibraryIssuesAsync()
        {
            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            if (await _context.BookIssues.AnyAsync(b => b.SchoolId == _schoolId))
            {
                _logger.LogInformation("✅ Library issues already seeded");
                return;
            }

            var books = await _context.Books
                .Where(b => b.SchoolId == _schoolId && !b.IsDeleted)
                .Take(5)
                .ToListAsync();

            var students = await _context.Students
                .Where(s => s.SchoolId == _schoolId && s.Status.ToLower() == "active" && !s.IsDeleted)
                .Take(5)
                .ToListAsync();

            if (!books.Any() || !students.Any()) return;

            var today = DateTime.UtcNow.Date;
            var issues = new List<BookIssue>();
            for (var i = 0; i < Math.Min(books.Count, students.Count); i++)
            {
                var isOverdue = i < 2;
                var issueDate = isOverdue ? today.AddDays(-20) : today.AddDays(-i);
                var dueDate   = isOverdue ? today.AddDays(-5)  : today.AddDays(14 - i);
                issues.Add(new BookIssue
                {
                    Id         = Guid.NewGuid(),
                    SchoolId   = _schoolId,
                    BookId     = books[i].Id,
                    StudentId  = students[i].Id,
                    IssueDate  = issueDate,
                    DueDate    = dueDate,
                    ReturnDate = null,
                    Status     = isOverdue ? "overdue" : "issued",
                    Fine       = isOverdue ? Math.Max(0, (today - dueDate).Days * 2m) : 0,
                    CreatedAt  = issueDate,
                    UpdatedAt  = issueDate,
                });
            }

            _context.BookIssues.AddRange(issues);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} library issues seeded ({Overdue} overdue)", issues.Count, issues.Count(i => i.Status == "overdue"));
        }

        // ─── Visitor Entries — 5 visitors (3 currently inside) ───────────────────
        public async Task SeedVisitorEntriesAsync()
        {
            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            if (await _context.VisitorLogs.AnyAsync(v => v.SchoolId == _schoolId))
            {
                _logger.LogInformation("✅ Visitor entries already seeded");
                return;
            }

            var today = DateTime.UtcNow.Date;
            var purposes = new[] { "Parent Visit", "Official Work", "Meeting", "Delivery", "Interview" };
            var personToMeet = new[] { "Principal", "Class Teacher", "Admin Office", "HR Manager", "Accounts" };

            var visitors = new List<Visitor>();
            var logs     = new List<VisitorLog>();
            var preRegs  = new List<VisitorPreRegistration>();

            for (var i = 0; i < 5; i++)
            {
                var visitor = new Visitor
                {
                    Id        = Guid.NewGuid(),
                    SchoolId  = _schoolId,
                    Name      = $"Visitor {i + 1}",
                    Phone     = $"987650{2000 + i}",
                    IdType    = "Aadhaar",
                    IdNumber  = $"1234 5678 {9000 + i}",
                    CreatedAt = today,
                    UpdatedAt = today,
                };
                visitors.Add(visitor);

                var checkIn = today.AddHours(9 + i);
                logs.Add(new VisitorLog
                {
                    Id           = Guid.NewGuid(),
                    SchoolId     = _schoolId,
                    VisitorId    = visitor.Id,
                    VisitNumber  = $"V{DateTime.UtcNow.Year}{i + 1001}",
                    CheckInTime  = checkIn,
                    CheckOutTime = i >= 3 ? (DateTime?)checkIn.AddHours(1) : null,
                    Purpose      = purposes[i],
                    PersonToMeet = personToMeet[i],
                    CreatedAt    = checkIn,
                    UpdatedAt    = checkIn,
                });
            }

            // 3 pending pre-registrations
            var adminStaff = await _context.UserLogins
                .Where(u => u.SchoolId == _schoolId && u.Role == "Admin" && !u.IsDeleted)
                .Select(u => u.Id)
                .FirstOrDefaultAsync();

            for (var j = 0; j < 3; j++)
            {
                preRegs.Add(new VisitorPreRegistration
                {
                    Id              = Guid.NewGuid(),
                    SchoolId        = _schoolId,
                    VisitorName     = $"Expected Visitor {j + 1}",
                    VisitorPhone    = $"987650{3000 + j}",
                    Purpose         = purposes[j],
                    PersonToMeet    = personToMeet[j],
                    ExpectedDate    = today,
                    ExpectedTime    = TimeSpan.FromHours(11 + j),
                    Status          = "Pending",
                    RegisteredBy    = adminStaff == Guid.Empty ? Guid.NewGuid() : adminStaff,
                    CreatedAt       = today.AddDays(-1),
                    UpdatedAt       = today.AddDays(-1),
                });
            }

            _context.Visitors.AddRange(visitors);
            _context.VisitorLogs.AddRange(logs);
            _context.VisitorPreRegistrations.AddRange(preRegs);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {V} visitors, {L} logs, {P} pre-registrations seeded", visitors.Count, logs.Count, preRegs.Count);
        }

        // ─── Hostel Attendance — today's attendance for hostel students ───────────
        public async Task SeedHostelAttendanceAsync()
        {
            _logger.LogInformation("🏠 Skipping hostel attendance seed (no HostelAttendance entity yet)");
            await Task.CompletedTask;
        }

        public async Task EnsureOverdueFeeRecordsAsync()
        {
            _logger.LogInformation("💸 Ensuring overdue fee records...");

            if (_schoolId == Guid.Empty)
                _schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

            var overdueCount = await _context.FeeRecords
                .CountAsync(f => f.SchoolId == _schoolId && f.Status == "Overdue" && f.PendingAmount > 0);

            if (overdueCount >= 10)
            {
                _logger.LogInformation("✅ Sufficient overdue fee records already exist ({Count})", overdueCount);
                return;
            }

            // Mark some existing Pending records as Overdue by backdating their due date
            var pendingRecords = await _context.FeeRecords
                .Where(f => f.SchoolId == _schoolId && f.PendingAmount > 0 && !f.IsDeleted)
                .Take(15)
                .ToListAsync();

            if (!pendingRecords.Any()) return;

            var rng = new Random(999);
            var now = DateTime.UtcNow;

            foreach (var (record, i) in pendingRecords.Select((r, i) => (r, i)))
            {
                record.DueDate = now.AddDays(-rng.Next(30, 90));
                record.Status = "Overdue";
                record.UpdatedAt = now;
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ {Count} fee records marked as overdue", pendingRecords.Count);
        }

        // ─────────────────────────────────────────────────────────────────────
        // BEHAVIOUR RECORDS — merits and demerits for test student/parent views
        // ─────────────────────────────────────────────────────────────────────
        public async Task SeedBehaviourRecordsAsync()
        {
            _logger.LogInformation("🏅 Seeding behaviour records...");

            if (await _context.BehaviourRecords.AnyAsync(b => b.SchoolId == _schoolId))
            {
                _logger.LogInformation("✅ Behaviour records already present");
                return;
            }

            var students = await _context.Students
                .Where(s => s.SchoolId == _schoolId && !s.IsDeleted)
                .Take(10)
                .ToListAsync();

            if (!students.Any()) return;

            var staff = await _context.StaffMembers
                .Where(s => s.SchoolId == _schoolId && !s.IsDeleted)
                .Select(s => s.Id)
                .FirstOrDefaultAsync();

            var rng = new Random(42);
            var records = new List<BehaviourRecord>();

            string[] merits   = { "Academic Excellence", "Sports Achievement", "Community Service" };
            string[] demerits = { "Tardiness", "Disruptive Behaviour", "Dress Code Violation", "Mobile Phone Violation" };

            foreach (var student in students)
            {
                // 2-3 merit records
                for (int i = 0; i < rng.Next(2, 4); i++)
                {
                    records.Add(new BehaviourRecord
                    {
                        SchoolId          = _schoolId,
                        StudentId         = student.Id,
                        ReportedByStaffId = staff,
                        IncidentType      = "positive",
                        Category          = merits[rng.Next(merits.Length)],
                        IncidentDate      = DateTime.UtcNow.AddDays(-rng.Next(10, 180)),
                        Description       = "Student demonstrated exceptional performance.",
                        Points            = rng.Next(5, 15),
                        Status            = "resolved",
                        ParentNotified    = true,
                        CreatedAt         = DateTime.UtcNow,
                        UpdatedAt         = DateTime.UtcNow,
                    });
                }

                // 1-2 demerit records
                for (int i = 0; i < rng.Next(1, 3); i++)
                {
                    records.Add(new BehaviourRecord
                    {
                        SchoolId          = _schoolId,
                        StudentId         = student.Id,
                        ReportedByStaffId = staff,
                        IncidentType      = "negative",
                        Category          = demerits[rng.Next(demerits.Length)],
                        IncidentDate      = DateTime.UtcNow.AddDays(-rng.Next(5, 90)),
                        Description       = "Student was found violating school conduct guidelines.",
                        ActionTaken       = "Verbal warning issued. Parent informed.",
                        Points            = -(rng.Next(2, 8)),
                        Status            = i == 0 ? "open" : "resolved",
                        ParentNotified    = true,
                        CreatedAt         = DateTime.UtcNow,
                        UpdatedAt         = DateTime.UtcNow,
                    });
                }
            }

            _context.BehaviourRecords.AddRange(records);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ Seeded {Count} behaviour records", records.Count);
        }

        // ─────────────────────────────────────────────────────────────────────
        // PTM DATA — sessions and available slots for parent booking tests
        // ─────────────────────────────────────────────────────────────────────
        public async Task SeedPtmDataAsync()
        {
            _logger.LogInformation("📅 Seeding PTM sessions...");

            if (await _context.PtmSessions.AnyAsync(p => p.SchoolId == _schoolId))
            {
                _logger.LogInformation("✅ PTM sessions already present");
                return;
            }

            // Get a teacher for slot assignment
            var teacherIds = await _context.StaffMembers
                .Where(s => s.SchoolId == _schoolId && !s.IsDeleted)
                .Select(s => s.Id)
                .Take(3)
                .ToListAsync();

            if (!teacherIds.Any()) return;

            var sessionDate = DateTime.UtcNow.AddDays(14).Date; // 2 weeks from now
            var session = new PtmSession
            {
                SchoolId            = _schoolId,
                Title               = "Term 1 Parent-Teacher Meeting 2025-26",
                Description         = "Annual parent-teacher interaction session for Term 1. Parents can discuss their child's academic progress.",
                SessionDate         = sessionDate,
                StartTime           = new TimeSpan(9, 0, 0),
                EndTime             = new TimeSpan(13, 0, 0),
                SlotDurationMinutes = 10,
                Location            = "School Auditorium",
                Status              = "scheduled",
                CreatedAt           = DateTime.UtcNow,
                UpdatedAt           = DateTime.UtcNow,
            };
            _context.PtmSessions.Add(session);
            await _context.SaveChangesAsync();

            // Generate slots: 4-hour window / 10-min slots = 24 slots per teacher
            var slots = new List<PtmSlot>();
            var slotDuration = TimeSpan.FromMinutes(10);

            foreach (var teacherId in teacherIds)
            {
                var slotTime = sessionDate + session.StartTime;
                var endTime  = sessionDate + session.EndTime;
                while (slotTime + slotDuration <= endTime)
                {
                    slots.Add(new PtmSlot
                    {
                        SchoolId     = _schoolId,
                        SessionId    = session.Id,
                        TeacherId    = teacherId,
                        SlotDateTime = slotTime,
                        Status       = "available",
                        CreatedAt    = DateTime.UtcNow,
                        UpdatedAt    = DateTime.UtcNow,
                    });
                    slotTime += slotDuration;
                }
            }

            _context.PtmSlots.AddRange(slots);
            await _context.SaveChangesAsync();
            _logger.LogInformation("✅ Seeded 1 PTM session with {Count} slots", slots.Count);
        }
    }
}
