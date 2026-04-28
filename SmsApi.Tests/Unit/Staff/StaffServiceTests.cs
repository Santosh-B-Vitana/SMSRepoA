using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.Staff
{
    /// <summary>
    /// Comprehensive unit tests for StaffService — 80+ tests covering:
    /// CreateStaff, GetStaff, GetStaffById, UpdateStaff, DeleteStaff,
    /// BulkUpdateStatus, Stats, Qualifications, PF/ESI, BankDetails,
    /// LeaveBalance, Documents, PerformanceReviews, BulkImport, Export, Template.
    /// Each test gets a fresh InMemory database instance.
    /// </summary>
    public class StaffServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly StaffService _service;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _otherSchoolId = Guid.NewGuid();
        private int _phoneCounter = 100000000;

        public StaffServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            _context = new AppDbContext(options);
            _service = new StaffService(_context, NullLogger<StaffService>.Instance);
        }

        public void Dispose() => _context.Dispose();

        // ─────────────────────────────────────────────────────────────────────
        // Helpers
        // ─────────────────────────────────────────────────────────────────────

        private string NextPhone() => $"9{_phoneCounter++:D9}";

        private CreateStaffRequest ValidRequest(
            string? employeeId = "EMP-001",
            string email = "test.staff@school.com",
            string gender = "male",
            string department = "Mathematics",
            string status = "active",
            string employmentType = "permanent",
            decimal salary = 45000m,
            DateTime? dob = null) => new CreateStaffRequest
            {
                SchoolId = _schoolId,
                EmployeeId = employeeId,
                FirstName = "Test",
                LastName = "Staff",
                Gender = gender,
                DateOfBirth = dob ?? new DateTime(1990, 6, 15),
                Department = department,
                Designation = "Teacher",
                JoiningDate = DateTime.UtcNow.AddYears(-2),
                Phone = NextPhone(),
                Email = email,
                Address = "123 Main St",
                City = "Mumbai",
                State = "Maharashtra",
                EmploymentType = employmentType,
                Status = status,
                Salary = salary,
                AadharNumber = "1234-5678-9012",
                PanNumber = "ABCDE1234F",
                BankAccountNumber = "123456789012"
            };

        private async Task<StaffResponse> CreateOneAsync(
            string employeeId = "EMP-001",
            string email = "emp001@school.com",
            string department = "Mathematics",
            string status = "active",
            string employmentType = "permanent") =>
            await _service.CreateStaffAsync(ValidRequest(employeeId, email, department: department, status: status, employmentType: employmentType));

        // ═════════════════════════════════════════════════════════════════════
        // 1. CreateStaffAsync
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task CreateStaff_HappyPath_ReturnsStaffWithCorrectFields()
        {
            var result = await _service.CreateStaffAsync(ValidRequest());

            result.Should().NotBeNull();
            result.FirstName.Should().Be("Test");
            result.LastName.Should().Be("Staff");
            result.Department.Should().Be("Mathematics");
            result.Email.Should().Be("test.staff@school.com");
            result.Status.Should().Be("active");
        }

        [Fact]
        public async Task CreateStaff_AutoGeneratesEmployeeId_WhenNotProvided()
        {
            var request = ValidRequest(employeeId: null);
            var result = await _service.CreateStaffAsync(request);

            result.EmployeeId.Should().StartWith("EMP");
        }

        [Fact]
        public async Task CreateStaff_Throws_OnDuplicateEmployeeId()
        {
            await CreateOneAsync("EMP-DUPE");

            var act = async () => await _service.CreateStaffAsync(ValidRequest("EMP-DUPE", "new@school.com"));
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*employee ID already exists*");
        }

        [Fact]
        public async Task CreateStaff_Throws_OnDuplicateEmail()
        {
            await CreateOneAsync("EMP-001", "dup@school.com");

            var act = async () => await _service.CreateStaffAsync(ValidRequest("EMP-002", "dup@school.com"));
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*email already exists*");
        }

        [Fact]
        public async Task CreateStaff_Throws_OnDuplicatePhone()
        {
            var first = ValidRequest("EMP-PH-1", "phone1@school.com");
            first.Phone = "9001112223";
            await _service.CreateStaffAsync(first);

            var request = ValidRequest("EMP-PH-2", "phone2@school.com");
            request.Phone = "9001112223";

            var act = async () => await _service.CreateStaffAsync(request);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*phone already exists*");
        }

        [Fact]
        public async Task CreateStaff_Throws_WhenReportingToId_IsFromDifferentSchool()
        {
            var managerOtherSchool = new Models.Entities.Staff
            {
                Id = Guid.NewGuid(),
                SchoolId = _otherSchoolId,
                EmployeeId = "OTH-MGR",
                FirstName = "Other",
                LastName = "Manager",
                Email = "manager@otherschool.com",
                Phone = "9000000001",
                Gender = "male",
                DateOfBirth = new DateTime(1985, 1, 1),
                Department = "Admin",
                Designation = "Principal",
                JoiningDate = DateTime.UtcNow.AddYears(-3),
                Address = "Other",
                EmploymentType = "permanent",
                Status = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.StaffMembers.Add(managerOtherSchool);
            await _context.SaveChangesAsync();

            var request = ValidRequest("EMP-RPT-1", "rpt1@school.com");
            request.ReportingToId = managerOtherSchool.Id;

            var act = async () => await _service.CreateStaffAsync(request);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*ReportingToId*same school*");
        }

        [Fact]
        public async Task CreateStaff_Throws_OnInvalidGender()
        {
            var request = ValidRequest(gender: "alien");
            var act = async () => await _service.CreateStaffAsync(request);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Gender*");
        }

        [Fact]
        public async Task CreateStaff_Throws_OnInvalidEmploymentType()
        {
            var request = ValidRequest(employmentType: "freelancer");
            var act = async () => await _service.CreateStaffAsync(request);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*EmploymentType*");
        }

        [Fact]
        public async Task CreateStaff_Throws_OnInvalidStatus()
        {
            var request = ValidRequest(status: "suspended");
            var act = async () => await _service.CreateStaffAsync(request);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Status*");
        }

        [Fact]
        public async Task CreateStaff_Throws_WhenDobInFuture()
        {
            var request = ValidRequest(dob: DateTime.UtcNow.AddDays(1));
            var act = async () => await _service.CreateStaffAsync(request);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*DateOfBirth*past*");
        }

        [Fact]
        public async Task CreateStaff_Throws_WhenAgeUnder18()
        {
            var request = ValidRequest(dob: DateTime.UtcNow.AddYears(-17));
            var act = async () => await _service.CreateStaffAsync(request);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*18 years*");
        }

        [Fact]
        public async Task CreateStaff_Throws_WhenSalaryNegative()
        {
            var request = ValidRequest(salary: -100m);
            var act = async () => await _service.CreateStaffAsync(request);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Salary*negative*");
        }

        [Fact]
        public async Task CreateStaff_AcceptsZeroSalary()
        {
            var request = ValidRequest(salary: 0m);
            var result = await _service.CreateStaffAsync(request);
            result.Salary.Should().Be(0m);
        }

        [Fact]
        public async Task CreateStaff_SetsDefaultLeaveBalances()
        {
            var result = await CreateOneAsync();
            var entity = await _context.StaffMembers.FindAsync(result.Id);
            entity!.CasualLeave.Should().Be(12);
            entity.SickLeave.Should().Be(12);
            entity.EarnedLeave.Should().Be(15);
            entity.MaternityLeave.Should().Be(180);
            entity.PaternityLeave.Should().Be(15);
        }

        [Fact]
        public async Task CreateStaff_AllValidGenders_Accepted()
        {
            string[] genders = { "male", "female", "other", "prefer_not_to_say" };
            for (int i = 0; i < genders.Length; i++)
            {
                var r = ValidRequest($"EMP-G{i}", $"g{i}@school.com", genders[i]);
                var result = await _service.CreateStaffAsync(r);
                result.Gender.Should().Be(genders[i]);
            }
        }

        // ═════════════════════════════════════════════════════════════════════
        // 2. GetStaffMembersAsync
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetStaff_ReturnsOnlySchoolStaff_Isolation()
        {
            await CreateOneAsync("EMP-A", "a@school1.com");
            // Add staff to other school directly
            _context.StaffMembers.Add(new SmsApi.Models.Entities.Staff
            {
                Id = Guid.NewGuid(), SchoolId = _otherSchoolId,
                EmployeeId = "OTHER-001", FirstName = "Other", LastName = "School",
                Email = "other@school2.com", Phone = "0000000000", Gender = "female",
                DateOfBirth = new DateTime(1985, 1, 1), Department = "Science",
                Designation = "Teacher", JoiningDate = DateTime.UtcNow, Status = "active",
                Address = "Other Addr", EmploymentType = "permanent"
            });
            await _context.SaveChangesAsync();

            var result = await _service.GetStaffMembersAsync(_schoolId, 1, 10, null, null);
            result.Total.Should().Be(1);
            result.Staff.All(s => s.Department == "Mathematics").Should().BeTrue();
        }

        [Fact]
        public async Task GetStaff_SearchByFirstName_ReturnsMatch()
        {
            await CreateOneAsync("EMP-001", "match@school.com");
            var req2 = ValidRequest("EMP-002", "nomatch@school.com");
            req2.FirstName = "John"; req2.Email = "john@school.com";
            await _service.CreateStaffAsync(req2);

            var result = await _service.GetStaffMembersAsync(_schoolId, 1, 10, "Test", null);
            result.Staff.Should().ContainSingle(s => s.Email == "match@school.com");
        }

        [Fact]
        public async Task GetStaff_SearchByEmployeeId_ReturnsMatch()
        {
            await CreateOneAsync("SEARCH-001");
            await CreateOneAsync("SEARCH-002", "emp2@school.com");

            var result = await _service.GetStaffMembersAsync(_schoolId, 1, 10, "SEARCH-001", null);
            result.Staff.Should().ContainSingle(s => s.EmployeeId == "SEARCH-001");
        }

        [Fact]
        public async Task GetStaff_FilterByStatus_ReturnsOnly_MatchingStatus()
        {
            await CreateOneAsync("EMP-ACT", "active@school.com", status: "active");
            await CreateOneAsync("EMP-INA", "inactive@school.com", status: "inactive");

            var result = await _service.GetStaffMembersAsync(_schoolId, 1, 10, null, "active");
            result.Total.Should().Be(1);
            result.Staff.All(s => s.Status == "active").Should().BeTrue();
        }

        [Fact]
        public async Task GetStaff_FilterByDepartment_ReturnsOnlyThatDept()
        {
            await CreateOneAsync("EMP-M", "math@school.com", "Mathematics");
            await CreateOneAsync("EMP-S", "sci@school.com", "Science");

            var result = await _service.GetStaffMembersAsync(_schoolId, 1, 10, null, null,
                department: "Science");
            result.Total.Should().Be(1);
            result.Staff[0].Department.Should().Be("Science");
        }

        [Fact]
        public async Task GetStaff_FilterByDesignation_Works()
        {
            await CreateOneAsync("EMP-T1", "t1@s.com");
            var r2 = ValidRequest("EMP-T2", "t2@s.com"); r2.Designation = "Principal";
            await _service.CreateStaffAsync(r2);

            var result = await _service.GetStaffMembersAsync(_schoolId, 1, 10, null, null,
                designation: "Principal");
            result.Total.Should().Be(1);
            result.Staff[0].Designation.Should().Be("Principal");
        }

        [Fact]
        public async Task GetStaff_FilterByEmploymentType_Works()
        {
            await CreateOneAsync("EMP-P", "perm@s.com", employmentType: "permanent");
            await _service.CreateStaffAsync(ValidRequest("EMP-C", "cont@s.com", employmentType: "contract"));

            var result = await _service.GetStaffMembersAsync(_schoolId, 1, 10, null, null,
                employmentType: "contract");
            result.Total.Should().Be(1);
            result.Staff[0].EmployeeId.Should().Be("EMP-C");
        }

        [Fact]
        public async Task GetStaff_SortByName_Ascending()
        {
            var rZ = ValidRequest("EMP-Z", "z@s.com"); rZ.FirstName = "Zara";
            var rA = ValidRequest("EMP-A", "a@s.com"); rA.FirstName = "Alice";
            var rM = ValidRequest("EMP-M", "m@s.com"); rM.FirstName = "Mike";
            await _service.CreateStaffAsync(rZ);
            await _service.CreateStaffAsync(rA);
            await _service.CreateStaffAsync(rM);

            var result = await _service.GetStaffMembersAsync(_schoolId, 1, 10, null, null,
                sortBy: "name", sortOrder: "asc");
            result.Staff[0].FirstName.Should().Be("Alice");
            result.Staff[^1].FirstName.Should().Be("Zara");
        }

        [Fact]
        public async Task GetStaff_SortByDepartment_Descending()
        {
            await CreateOneAsync("EMP-M", "m@s.com", "Mathematics");
            await CreateOneAsync("EMP-S", "s@s.com", "Science");
            await CreateOneAsync("EMP-A", "a@s.com", "Art");

            var result = await _service.GetStaffMembersAsync(_schoolId, 1, 10, null, null,
                sortBy: "department", sortOrder: "desc");
            result.Staff[0].Department.Should().Be("Science");
        }

        [Fact]
        public async Task GetStaff_Pagination_Page2ReturnsSecondBatch()
        {
            for (int i = 1; i <= 5; i++)
                await CreateOneAsync($"EMP-{i:D3}", $"emp{i}@school.com");

            var page1 = await _service.GetStaffMembersAsync(_schoolId, 1, 3, null, null);
            var page2 = await _service.GetStaffMembersAsync(_schoolId, 2, 3, null, null);

            page1.Staff.Count.Should().Be(3);
            page2.Staff.Count.Should().Be(2);
            page1.Staff.Select(s => s.Id).Should().NotIntersectWith(page2.Staff.Select(s => s.Id));
        }

        [Fact]
        public async Task GetStaff_TotalPages_CalculatedCorrectly()
        {
            for (int i = 1; i <= 10; i++)
                await CreateOneAsync($"EMP-{i:D3}", $"emp{i}@school.com");

            var result = await _service.GetStaffMembersAsync(_schoolId, 1, 3, null, null);
            result.Total.Should().Be(10);
            result.TotalPages.Should().Be(4); // ceil(10/3) = 4
        }

        [Fact]
        public async Task GetStaff_ReturnsEmpty_WhenNoMatchingStaff()
        {
            var result = await _service.GetStaffMembersAsync(_schoolId, 1, 10, "nonexistent", null);
            result.Total.Should().Be(0);
            result.Staff.Should().BeEmpty();
        }

        // ═════════════════════════════════════════════════════════════════════
        // 3. GetStaffByIdAsync
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetStaffById_ReturnsMaskedAadharNumber()
        {
            var created = await CreateOneAsync();
            var result = await _service.GetStaffByIdAsync(created.Id, _schoolId);
            result!.AadharNumber.Should().Be("XXXX-XXXX-9012");
            result.AadharNumber.Should().NotContain("1234-5678");
        }

        [Fact]
        public async Task GetStaffById_ReturnsMaskedPanNumber()
        {
            var created = await CreateOneAsync();
            var result = await _service.GetStaffByIdAsync(created.Id, _schoolId);
            result!.PanNumber.Should().Be("XXXXXX234F");
        }

        [Fact]
        public async Task GetStaffById_ReturnsMaskedBankAccount()
        {
            var created = await CreateOneAsync();
            var result = await _service.GetStaffByIdAsync(created.Id, _schoolId);
            result!.BankAccountNumber.Should().Be("XXXX-XXXX-9012");
            result.BankAccountNumber.Should().NotContain("12345678");
        }

        [Fact]
        public async Task GetStaffById_ReturnsNull_ForWrongSchool()
        {
            var created = await CreateOneAsync();
            var result = await _service.GetStaffByIdAsync(created.Id, _otherSchoolId);
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetStaffById_ReturnsNull_ForNonExistentId()
        {
            var result = await _service.GetStaffByIdAsync(Guid.NewGuid(), _schoolId);
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetStaffById_HandlesMasking_WhenPiiFieldsAreNull()
        {
            var request = ValidRequest(); request.AadharNumber = null; request.PanNumber = null; request.BankAccountNumber = null;
            var created = await _service.CreateStaffAsync(request);
            var result = await _service.GetStaffByIdAsync(created.Id, _schoolId);
            result!.AadharNumber.Should().BeNull();
            result.PanNumber.Should().BeNull();
            result.BankAccountNumber.Should().BeNull();
        }

        // ═════════════════════════════════════════════════════════════════════
        // 4. UpdateStaffAsync
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task UpdateStaff_PartialUpdate_OnlyChangesProvidedFields()
        {
            var created = await CreateOneAsync();
            var updateReq = new UpdateStaffRequest { Department = "Science" };

            var result = await _service.UpdateStaffAsync(created.Id, _schoolId, updateReq);

            result!.Department.Should().Be("Science");
            result.FirstName.Should().Be("Test"); // unchanged
            result.Email.Should().Be("emp001@school.com"); // unchanged
        }

        [Fact]
        public async Task UpdateStaff_UpdatesStatus()
        {
            var created = await CreateOneAsync();
            var updateReq = new UpdateStaffRequest { Status = "inactive" };
            var result = await _service.UpdateStaffAsync(created.Id, _schoolId, updateReq);
            result!.Status.Should().Be("inactive");
        }

        [Fact]
        public async Task UpdateStaff_ReturnsNull_WhenNotFound()
        {
            var result = await _service.UpdateStaffAsync(Guid.NewGuid(), _schoolId, new UpdateStaffRequest());
            result.Should().BeNull();
        }

        [Fact]
        public async Task UpdateStaff_ReturnsNull_ForWrongSchool()
        {
            var created = await CreateOneAsync();
            var result = await _service.UpdateStaffAsync(created.Id, _otherSchoolId, new UpdateStaffRequest { Department = "Science" });
            result.Should().BeNull();
        }

        [Fact]
        public async Task UpdateStaff_UpdatesLinkedUserLoginStatus_WhenEmailMatches()
        {
            var created = await CreateOneAsync("EMP-LOGIN", "login@school.com");

            // Add a UserLogin linked by email
            _context.UserLogins.Add(new UserLogin
            {
                Id = Guid.NewGuid(), SchoolId = _schoolId, Email = "login@school.com",
                PasswordHash = "hash", Role = "Staff", Status = "active", IsDeleted = false,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            await _service.UpdateStaffAsync(created.Id, _schoolId, new UpdateStaffRequest { Status = "inactive" });

            var login = await _context.UserLogins.FirstAsync(u => u.Email == "login@school.com");
            login.Status.Should().Be("inactive");
        }

        [Fact]
        public async Task UpdateStaff_Throws_OnInvalidStatus()
        {
            var created = await CreateOneAsync("EMP-US-1", "us1@school.com");

            var act = async () => await _service.UpdateStaffAsync(created.Id, _schoolId, new UpdateStaffRequest
            {
                Status = "suspended"
            });

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Status must be one of*");
        }

        [Fact]
        public async Task UpdateStaff_Throws_OnDuplicatePhone()
        {
            var one = await CreateOneAsync("EMP-UP-1", "up1@school.com");
            var two = await CreateOneAsync("EMP-UP-2", "up2@school.com");

            var oneEntity = await _context.StaffMembers.FirstAsync(s => s.Id == one.Id);
            oneEntity.Phone = "9123456789";
            await _context.SaveChangesAsync();

            var act = async () => await _service.UpdateStaffAsync(two.Id, _schoolId, new UpdateStaffRequest
            {
                Phone = "9123456789"
            });

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*phone already exists*");
        }

        [Fact]
        public async Task UpdateStaff_Throws_WhenReportingToId_SameAsSelf()
        {
            var created = await CreateOneAsync("EMP-UP-RPT", "uprpt@school.com");

            var act = async () => await _service.UpdateStaffAsync(created.Id, _schoolId, new UpdateStaffRequest
            {
                ReportingToId = created.Id
            });

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*cannot be the same*");
        }

        // ═════════════════════════════════════════════════════════════════════
        // 5. DeleteStaffAsync
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task DeleteStaff_SoftDelete_SetsIsDeletedTrue()
        {
            var created = await CreateOneAsync();
            var result = await _service.DeleteStaffAsync(created.Id, _schoolId);
            result.Should().BeTrue();

            var entity = await _context.StaffMembers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Id == created.Id);
            entity!.IsDeleted.Should().BeTrue();
            entity.DeletedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task DeleteStaff_SoftDeleted_NotReturnedInList()
        {
            var created = await CreateOneAsync();
            await _service.DeleteStaffAsync(created.Id, _schoolId);

            var result = await _service.GetStaffMembersAsync(_schoolId, 1, 10, null, null);
            result.Total.Should().Be(0);
        }

        [Fact]
        public async Task DeleteStaff_ReturnsFalse_ForNonExistentId()
        {
            var result = await _service.DeleteStaffAsync(Guid.NewGuid(), _schoolId);
            result.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteStaff_ReturnsFalse_ForWrongSchool()
        {
            var created = await CreateOneAsync();
            var result = await _service.DeleteStaffAsync(created.Id, _otherSchoolId);
            result.Should().BeFalse();
        }

        // ═════════════════════════════════════════════════════════════════════
        // 6. BulkUpdateStaffStatusAsync
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task BulkUpdateStatus_Updates_MultipleStaff()
        {
            var s1 = await CreateOneAsync("EMP-B1", "b1@s.com");
            var s2 = await CreateOneAsync("EMP-B2", "b2@s.com");

            var request = new BulkUpdateStaffStatusRequest
            {
                StaffIds = new List<Guid> { s1.Id, s2.Id },
                Status = "inactive"
            };

            var result = await _service.BulkUpdateStaffStatusAsync(_schoolId, request);
            result.SuccessCount.Should().Be(2);
            result.FailureCount.Should().Be(0);
        }

        [Fact]
        public async Task BulkUpdateStatus_Tracks_NotFoundIds()
        {
            var created = await CreateOneAsync();
            var missingId = Guid.NewGuid();

            var request = new BulkUpdateStaffStatusRequest
            {
                StaffIds = new List<Guid> { created.Id, missingId },
                Status = "inactive"
            };

            var result = await _service.BulkUpdateStaffStatusAsync(_schoolId, request);
            result.SuccessCount.Should().Be(1);
            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch($"*{missingId}*not found*");
        }

        [Fact]
        public async Task BulkUpdateStatus_Caps_At500Rows()
        {
            var ids = Enumerable.Range(0, 501).Select(_ => Guid.NewGuid()).ToList();
            var request = new BulkUpdateStaffStatusRequest { StaffIds = ids, Status = "active" };

            var result = await _service.BulkUpdateStaffStatusAsync(_schoolId, request);
            result.FailureCount.Should().Be(501);
            result.Errors.Should().ContainMatch("*500*");
        }

        [Fact]
        public async Task BulkUpdateStatus_InvalidStatus_ReturnsError()
        {
            var created = await CreateOneAsync();
            var request = new BulkUpdateStaffStatusRequest
            {
                StaffIds = new List<Guid> { created.Id },
                Status = "flying"
            };

            var result = await _service.BulkUpdateStaffStatusAsync(_schoolId, request);
            result.Errors.Should().ContainMatch("*Invalid status*");
        }

        [Fact]
        public async Task BulkUpdateStatus_PopulatesSuccessfulIds()
        {
            var s1 = await CreateOneAsync("EMP-S1", "s1@s.com");
            var s2 = await CreateOneAsync("EMP-S2", "s2@s.com");

            var request = new BulkUpdateStaffStatusRequest
            {
                StaffIds = new List<Guid> { s1.Id, s2.Id },
                Status = "inactive"
            };

            var result = await _service.BulkUpdateStaffStatusAsync(_schoolId, request);
            result.SuccessfulIds.Should().ContainInOrder(s1.Id, s2.Id);
        }

        // ═════════════════════════════════════════════════════════════════════
        // 7. GetStaffStatsAsync
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetStaffStats_ReturnsCorrectCounts()
        {
            await CreateOneAsync("E1", "e1@s.com", "Mathematics", "active");
            await CreateOneAsync("E2", "e2@s.com", "Mathematics", "active");
            await CreateOneAsync("E3", "e3@s.com", "Science", "inactive");
            await CreateOneAsync("E4", "e4@s.com", "Science", "on_leave");

            var stats = await _service.GetStaffStatsAsync(_schoolId);
            stats.TotalStaff.Should().Be(4);
            stats.ActiveStaff.Should().Be(2);
            stats.InactiveStaff.Should().Be(1);
            stats.OnLeave.Should().Be(1);
        }

        [Fact]
        public async Task GetStaffStats_ByDepartment_Correct()
        {
            await CreateOneAsync("E1", "e1@s.com", "Mathematics");
            await CreateOneAsync("E2", "e2@s.com", "Mathematics");
            await CreateOneAsync("E3", "e3@s.com", "Science");

            var stats = await _service.GetStaffStatsAsync(_schoolId);
            stats.ByDepartment["Mathematics"].Should().Be(2);
            stats.ByDepartment["Science"].Should().Be(1);
        }

        [Fact]
        public async Task GetStaffStats_ByDesignation_Correct()
        {
            await CreateOneAsync("E1", "e1@s.com");
            await CreateOneAsync("E2", "e2@s.com");

            var stats = await _service.GetStaffStatsAsync(_schoolId);
            stats.ByDesignation["Teacher"].Should().Be(2);
        }

        [Fact]
        public async Task GetStaffStats_ReturnsZeroCounts_EmptySchool()
        {
            var stats = await _service.GetStaffStatsAsync(Guid.NewGuid());
            stats.TotalStaff.Should().Be(0);
            stats.ActiveStaff.Should().Be(0);
        }

        // ═════════════════════════════════════════════════════════════════════
        // 8. QualificationsAsync
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task AddQualification_CreatesAndReturnsDto()
        {
            var staff = await CreateOneAsync();
            var dto = new CreateQualificationDto
            {
                QualificationType = "Degree",
                DegreeName = "B.Ed",
                InstitutionName = "Mumbai University",
                YearOfPassing = 2012
            };

            var result = await _service.AddQualificationAsync(_schoolId, staff.Id, dto, Guid.NewGuid());
            result.DegreeName.Should().Be("B.Ed");
            result.InstitutionName.Should().Be("Mumbai University");
        }

        [Fact]
        public async Task GetQualifications_ReturnsEmpty_ForWrongSchool()
        {
            var staff = await CreateOneAsync();
            await _service.AddQualificationAsync(_schoolId, staff.Id,
                new CreateQualificationDto { QualificationType = "Degree", DegreeName = "B.Ed" }, Guid.NewGuid());

            var result = await _service.GetQualificationsAsync(staff.Id, _otherSchoolId);
            result.Should().BeEmpty();
        }

        [Fact]
        public async Task UpdateQualification_UpdatesFields()
        {
            var staff = await CreateOneAsync();
            var added = await _service.AddQualificationAsync(_schoolId, staff.Id,
                new CreateQualificationDto { QualificationType = "Degree", DegreeName = "B.Ed" }, Guid.NewGuid());

            var updated = await _service.UpdateQualificationAsync(_schoolId, added.Id,
                new UpdateQualificationDto { DegreeName = "M.Ed" });

            updated.DegreeName.Should().Be("M.Ed");
        }

        [Fact]
        public async Task DeleteQualification_RemovesRecord()
        {
            var staff = await CreateOneAsync();
            var added = await _service.AddQualificationAsync(_schoolId, staff.Id,
                new CreateQualificationDto { QualificationType = "Degree", DegreeName = "B.Ed" }, Guid.NewGuid());

            var deleted = await _service.DeleteQualificationAsync(_schoolId, added.Id);
            deleted.Should().BeTrue();

            var list = await _service.GetQualificationsAsync(staff.Id, _schoolId);
            list.Should().BeEmpty();
        }

        [Fact]
        public async Task DeleteQualification_ReturnsFalse_WrongSchool()
        {
            var staff = await CreateOneAsync();
            var added = await _service.AddQualificationAsync(_schoolId, staff.Id,
                new CreateQualificationDto { QualificationType = "Degree", DegreeName = "B.Ed" }, Guid.NewGuid());

            var result = await _service.DeleteQualificationAsync(_otherSchoolId, added.Id);
            result.Should().BeFalse();
        }

        // ═════════════════════════════════════════════════════════════════════
        // 9. PF/ESI Details
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetPFESIDetails_ReturnsStaffData()
        {
            var staff = await CreateOneAsync();
            var result = await _service.GetPFESIDetailsAsync(staff.Id, _schoolId);
            result.StaffId.Should().Be(staff.Id);
        }

        [Fact]
        public async Task UpdatePFESIDetails_PersistsChanges()
        {
            var staff = await CreateOneAsync();
            var dto = new UpdatePFESIDto { PfNumber = "PF-NEW", EsiNumber = "ESI-NEW" };
            var result = await _service.UpdatePFESIDetailsAsync(_schoolId, staff.Id, dto);
            result.PfNumber.Should().Be("PF-NEW");
            result.EsiNumber.Should().Be("ESI-NEW");
        }

        [Fact]
        public async Task GetPFESIDetails_ThrowsForNonExistentStaff()
        {
            var act = async () => await _service.GetPFESIDetailsAsync(Guid.NewGuid(), _schoolId);
            await act.Should().ThrowAsync<Exception>().WithMessage("*not found*");
        }

        // ═════════════════════════════════════════════════════════════════════
        // 10. Bank Details
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetBankDetails_ReturnsMaskedAccountNumber()
        {
            var staff = await CreateOneAsync();
            var entity = await _context.StaffMembers.FindAsync(staff.Id);
            entity!.BankAccountNumber = "9876543210";
            await _context.SaveChangesAsync();

            var result = await _service.GetBankDetailsAsync(staff.Id, _schoolId);
            result.BankAccountNumber.Should().Be("XXXX-XXXX-3210");
        }

        [Fact]
        public async Task UpdateBankDetails_PersistsChanges()
        {
            var staff = await CreateOneAsync();
            var dto = new UpdateBankDetailsDto { BankName = "HDFC", IfscCode = "HDFC0001234" };
            var result = await _service.UpdateBankDetailsAsync(_schoolId, staff.Id, dto);
            result.BankName.Should().Be("HDFC");
            result.IfscCode.Should().Be("HDFC0001234");
        }

        // ═════════════════════════════════════════════════════════════════════
        // 11. Leave Balance
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetLeaveBalance_ReturnsDefaults()
        {
            var staff = await CreateOneAsync();
            var result = await _service.GetStaffLeaveBalanceAsync(staff.Id, _schoolId);
            result.CasualLeave.Should().Be(12);
            result.SickLeave.Should().Be(12);
            result.EarnedLeave.Should().Be(15);
            result.MaternityLeave.Should().Be(180);
            result.PaternityLeave.Should().Be(15);
        }

        [Fact]
        public async Task UpdateLeaveBalance_UpdatesProvidedFields()
        {
            var staff = await CreateOneAsync();
            var dto = new UpdateLeaveBalanceDto { CasualLeave = 20, SickLeave = 15 };
            var result = await _service.UpdateLeaveBalanceAsync(_schoolId, staff.Id, dto);
            result.CasualLeave.Should().Be(20);
            result.SickLeave.Should().Be(15);
            result.EarnedLeave.Should().Be(15); // unchanged
        }

        [Fact]
        public async Task UpdateLeaveBalance_ThrowsForNonExistentStaff()
        {
            var act = async () => await _service.UpdateLeaveBalanceAsync(_schoolId, Guid.NewGuid(),
                new UpdateLeaveBalanceDto { CasualLeave = 10 });
            await act.Should().ThrowAsync<Exception>().WithMessage("*not found*");
        }

        // ═════════════════════════════════════════════════════════════════════
        // 12. BulkImportStaffAsync
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task BulkImport_ValidBatch_ImportsAll()
        {
            var requests = new List<CreateStaffRequest>
            {
                ValidRequest("IMP-001", "imp1@s.com"),
                ValidRequest("IMP-002", "imp2@s.com"),
                ValidRequest("IMP-003", "imp3@s.com")
            };
            requests[1].Email = "imp2@s.com";
            requests[2].Email = "imp3@s.com";

            var result = await _service.BulkImportStaffAsync(_schoolId, requests);
            result.SuccessCount.Should().Be(3);
            result.FailureCount.Should().Be(0);
            result.Errors.Should().BeEmpty();
        }

        [Fact]
        public async Task BulkImport_DbDuplicateEmployeeId_FailsThatRow()
        {
            await CreateOneAsync("DB-DUP", "db1@s.com");

            var requests = new List<CreateStaffRequest>
            {
                ValidRequest("DB-DUP", "new1@s.com") // duplicate EmployeeId in DB
            };

            var result = await _service.BulkImportStaffAsync(_schoolId, requests);
            result.SuccessCount.Should().Be(0);
            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*DB-DUP*already exists*");
        }

        [Fact]
        public async Task BulkImport_SameBatchDuplicateEmail_FailsSecondRow()
        {
            var requests = new List<CreateStaffRequest>
            {
                ValidRequest("BATCH-001", "dup@s.com"),
                ValidRequest("BATCH-002", "dup@s.com") // same email in batch
            };

            var result = await _service.BulkImportStaffAsync(_schoolId, requests);
            result.SuccessCount.Should().Be(1);
            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*Duplicate*dup@s.com*");
        }

        [Fact]
        public async Task BulkImport_SameBatchDuplicatePhone_FailsSecondRow()
        {
            var requests = new List<CreateStaffRequest>
            {
                ValidRequest("BPH-001", "bph1@s.com"),
                ValidRequest("BPH-002", "bph2@s.com")
            };

            requests[0].Phone = "9001001001";
            requests[1].Phone = "9001001001";

            var result = await _service.BulkImportStaffAsync(_schoolId, requests);
            result.SuccessCount.Should().Be(1);
            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*Duplicate phone*9001001001*");
        }

        [Fact]
        public async Task BulkImport_InvalidReportingToId_FailsThatRow()
        {
            var requests = new List<CreateStaffRequest>
            {
                ValidRequest("BRPT-001", "brpt1@s.com")
            };
            requests[0].ReportingToId = Guid.NewGuid();

            var result = await _service.BulkImportStaffAsync(_schoolId, requests);
            result.SuccessCount.Should().Be(0);
            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*ReportingToId*same school*");
        }

        [Fact]
        public async Task BulkImport_InvalidGender_FailsThatRow()
        {
            var requests = new List<CreateStaffRequest>
            {
                ValidRequest(gender: "robot")
            };

            var result = await _service.BulkImportStaffAsync(_schoolId, requests);
            result.SuccessCount.Should().Be(0);
            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*Gender*");
        }

        [Fact]
        public async Task BulkImport_FutureDob_FailsThatRow()
        {
            var requests = new List<CreateStaffRequest>
            {
                ValidRequest(dob: DateTime.UtcNow.AddYears(5))
            };

            var result = await _service.BulkImportStaffAsync(_schoolId, requests);
            result.FailureCount.Should().Be(1);
            result.Errors.Should().ContainMatch("*DateOfBirth*past*");
        }

        [Fact]
        public async Task BulkImport_501Rows_FailsImmediately()
        {
            var requests = Enumerable.Range(1, 501)
                .Select(i => ValidRequest($"IMP-{i:D4}", $"imp{i}@s.com"))
                .ToList();

            var result = await _service.BulkImportStaffAsync(_schoolId, requests);
            result.FailureCount.Should().Be(501);
            result.Errors.Should().ContainMatch("*500*");
        }

        [Fact]
        public async Task BulkImport_MixedValidInvalid_CountsCorrectly()
        {
            var requests = new List<CreateStaffRequest>
            {
                ValidRequest("MIX-001", "mix1@s.com"),        // valid
                ValidRequest(gender: "robot"),                  // invalid gender
                ValidRequest("MIX-003", "mix3@s.com"),        // valid
            };
            requests[2].Email = "mix3@s.com"; // ensure unique

            var result = await _service.BulkImportStaffAsync(_schoolId, requests);
            result.SuccessCount.Should().Be(2);
            result.FailureCount.Should().Be(1);
        }

        [Fact]
        public async Task BulkImport_SuccessfulIds_Populated()
        {
            var requests = new List<CreateStaffRequest>
            {
                ValidRequest("SID-001", "sid1@s.com"),
                ValidRequest("SID-002", "sid2@s.com")
            };

            var result = await _service.BulkImportStaffAsync(_schoolId, requests);
            result.SuccessfulIds.Should().HaveCount(2);
        }

        // ═════════════════════════════════════════════════════════════════════
        // 13. ExportStaffToCsvAsync
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task ExportStaff_ReturnsCsvBytes()
        {
            await CreateOneAsync();
            var bytes = await _service.ExportStaffToCsvAsync(_schoolId, null, null, null);
            bytes.Should().NotBeNullOrEmpty();
        }

        [Fact]
        public async Task ExportStaff_ContainsHeaderRow()
        {
            await CreateOneAsync();
            var bytes = await _service.ExportStaffToCsvAsync(_schoolId, null, null, null);
            var csv = Encoding.UTF8.GetString(bytes);
            csv.Should().Contain("EmployeeId");
            csv.Should().Contain("FirstName");
            csv.Should().Contain("LastName");
            csv.Should().Contain("Department");
        }

        [Fact]
        public async Task ExportStaff_MasksPii_InCsv()
        {
            await CreateOneAsync(); // has AadharNumber = "1234-5678-9012"
            var bytes = await _service.ExportStaffToCsvAsync(_schoolId, null, null, null);
            var csv = Encoding.UTF8.GetString(bytes);
            csv.Should().NotContain("1234-5678-9012"); // raw aadhar
            csv.Should().Contain("XXXX-XXXX-9012"); // masked
        }

        [Fact]
        public async Task ExportStaff_FilterByStatus_OnlyIncludesMatchingStaff()
        {
            await CreateOneAsync("E-ACT", "act@s.com", status: "active");
            await CreateOneAsync("E-INA", "ina@s.com", status: "inactive");

            var bytes = await _service.ExportStaffToCsvAsync(_schoolId, null, "active", null);
            var csv = Encoding.UTF8.GetString(bytes);
            csv.Should().Contain("E-ACT");
            csv.Should().NotContain("E-INA");
        }

        [Fact]
        public async Task ExportStaff_ReturnsHeaderOnly_WhenNoStaff()
        {
            var bytes = await _service.ExportStaffToCsvAsync(Guid.NewGuid(), null, null, null);
            var csv = Encoding.UTF8.GetString(bytes);
            csv.Trim().Should().Contain("EmployeeId"); // header present
        }

        // ═════════════════════════════════════════════════════════════════════
        // 14. Import Template
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public void GetImportTemplate_ContainsRequiredHeaders()
        {
            var template = StaffService.GetImportTemplate();
            template.Should().Contain("EmployeeId");
            template.Should().Contain("FirstName");
            template.Should().Contain("LastName");
            template.Should().Contain("Gender");
            template.Should().Contain("DateOfBirth");
            template.Should().Contain("Email");
            template.Should().Contain("Department");
            template.Should().Contain("Designation");
            template.Should().Contain("EmploymentType");
            template.Should().Contain("Salary");
        }

        [Fact]
        public void GetImportTemplate_ContainsExampleRow()
        {
            var template = StaffService.GetImportTemplate();
            var lines = template.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            lines.Length.Should().BeGreaterThan(1); // header + example
        }

        // ═════════════════════════════════════════════════════════════════════
        // 15. PII Masking logic
        // ═════════════════════════════════════════════════════════════════════

        [Theory]
        [InlineData("123456789012", "XXXX-XXXX-9012")]
        [InlineData("1234-5678-9012", "XXXX-XXXX-9012")]
        [InlineData("1234 5678 9012", "XXXX-XXXX-9012")]
        public async Task AadharMasking_ShowsOnlyLast4(string rawAadhar, string expectedMask)
        {
            var request = ValidRequest(); request.AadharNumber = rawAadhar;
            var created = await _service.CreateStaffAsync(request);
            var result = await _service.GetStaffByIdAsync(created.Id, _schoolId);
            result!.AadharNumber.Should().Be(expectedMask);
        }

        [Theory]
        [InlineData("ABCDE1234F", "XXXXXX234F")]
        [InlineData("ZZZZZ9876X", "XXXXXX876X")]
        public async Task PanMasking_ShowsOnlyLast4(string rawPan, string expectedMask)
        {
            var request = ValidRequest("EMP-PAN", $"pan{rawPan}@s.com"); request.PanNumber = rawPan;
            var created = await _service.CreateStaffAsync(request);
            var result = await _service.GetStaffByIdAsync(created.Id, _schoolId);
            result!.PanNumber.Should().Be(expectedMask);
        }

        [Theory]
        [InlineData("9876543210", "XXXX-XXXX-3210")]
        [InlineData("1111222233334444", "XXXX-XXXX-4444")]
        public async Task BankAccountMasking_ShowsOnlyLast4(string rawAccount, string expectedMask)
        {
            var request = ValidRequest("EMP-BNK", $"bnk{rawAccount}@s.com"); request.BankAccountNumber = rawAccount;
            var created = await _service.CreateStaffAsync(request);
            var result = await _service.GetStaffByIdAsync(created.Id, _schoolId);
            result!.BankAccountNumber.Should().Be(expectedMask);
        }

        // ═════════════════════════════════════════════════════════════════════
        // 16. Performance Reviews
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task AddPerformanceReview_CreatesReview()
        {
            var staff = await CreateOneAsync();
            var dto = new CreatePerformanceReviewDto
            {
                ReviewDate = DateTime.UtcNow.AddMonths(-1),
                ReviewPeriod = "2024-Q1",
                OverallRating = 4,
                Strengths = "Excellent",
                Goals = "Continue"
            };

            var result = await _service.AddPerformanceReviewAsync(_schoolId, staff.Id, dto, Guid.NewGuid());
            result.ReviewPeriod.Should().Be("2024-Q1");
            result.OverallRating.Should().Be(4);
            result.Status.Should().Be("submitted");
        }

        [Fact]
        public async Task GetPerformanceReviews_ReturnedOrderedByDateDesc()
        {
            var staff = await CreateOneAsync();
            var older = new CreatePerformanceReviewDto { ReviewDate = DateTime.UtcNow.AddMonths(-6), ReviewPeriod = "Q1" };
            var newer = new CreatePerformanceReviewDto { ReviewDate = DateTime.UtcNow.AddMonths(-1), ReviewPeriod = "Q3" };
            await _service.AddPerformanceReviewAsync(_schoolId, staff.Id, older, Guid.NewGuid());
            await _service.AddPerformanceReviewAsync(_schoolId, staff.Id, newer, Guid.NewGuid());

            var result = await _service.GetPerformanceReviewsAsync(staff.Id, _schoolId);
            result[0].ReviewPeriod.Should().Be("Q3"); // most recent first
        }

        [Fact]
        public async Task GetPerformanceReviews_ReturnsEmpty_ForWrongSchool()
        {
            var staff = await CreateOneAsync();
            await _service.AddPerformanceReviewAsync(_schoolId, staff.Id,
                new CreatePerformanceReviewDto { ReviewDate = DateTime.UtcNow, ReviewPeriod = "Q1" }, Guid.NewGuid());

            var result = await _service.GetPerformanceReviewsAsync(staff.Id, _otherSchoolId);
            result.Should().BeEmpty();
        }

        // ═════════════════════════════════════════════════════════════════════
        // 17. Documents
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task UploadDocument_CreatesDocumentEntry()
        {
            var staff = await CreateOneAsync();
            var doc = await _service.UploadDocumentAsync(staff.Id, _schoolId, "Degree", "degree.pdf", new byte[] { 1, 2, 3 });
            doc.Name.Should().Be("Degree");
            doc.Type.Should().Be("Degree");
        }

        [Fact]
        public async Task GetStaffDocuments_ReturnsDocumentList()
        {
            var staff = await CreateOneAsync();
            await _service.UploadDocumentAsync(staff.Id, _schoolId, "Degree", "degree.pdf", Array.Empty<byte>());
            await _service.UploadDocumentAsync(staff.Id, _schoolId, "PAN", "pan.pdf", Array.Empty<byte>());

            var docs = await _service.GetStaffDocumentsAsync(staff.Id, _schoolId);
            docs.Should().HaveCount(2);
        }

        [Fact]
        public async Task DeleteDocument_RemovesDocument()
        {
            var staff = await CreateOneAsync();
            var doc = await _service.UploadDocumentAsync(staff.Id, _schoolId, "Degree", "degree.pdf", Array.Empty<byte>());
            var deleted = await _service.DeleteDocumentAsync(doc.Id, _schoolId);
            deleted.Should().BeTrue();

            var docs = await _service.GetStaffDocumentsAsync(staff.Id, _schoolId);
            docs.Should().BeEmpty();
        }

        [Fact]
        public async Task DeleteDocument_ReturnsFalse_ForWrongSchool()
        {
            var staff = await CreateOneAsync();
            var doc = await _service.UploadDocumentAsync(staff.Id, _schoolId, "Degree", "degree.pdf", Array.Empty<byte>());
            var result = await _service.DeleteDocumentAsync(doc.Id, _otherSchoolId);
            result.Should().BeFalse();
        }

        // ═════════════════════════════════════════════════════════════════════
        // 18. GetDepartments / GetDesignations / GetSubordinates
        // ═════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetDepartments_ReturnsUniqueDepartments()
        {
            await CreateOneAsync("E1", "e1@s.com", "Mathematics");
            await CreateOneAsync("E2", "e2@s.com", "Mathematics");
            await CreateOneAsync("E3", "e3@s.com", "Science");

            var depts = await _service.GetDepartmentsAsync(_schoolId);
            depts.Should().HaveCount(2);
            depts.Should().Contain("Mathematics");
            depts.Should().Contain("Science");
        }

        [Fact]
        public async Task GetDesignations_ReturnsUniqueDesignations()
        {
            await CreateOneAsync("E1", "e1@s.com");
            await CreateOneAsync("E2", "e2@s.com");

            var designations = await _service.GetDesignationsAsync(_schoolId);
            designations.Should().Contain("Teacher");
        }

        [Fact]
        public async Task GetSubordinates_ReturnsStaffReportingToId()
        {
            var manager = await CreateOneAsync("MGR", "mgr@s.com");
            var sub1Request = ValidRequest("SUB-001", "sub1@s.com"); sub1Request.ReportingToId = manager.Id;
            var sub2Request = ValidRequest("SUB-002", "sub2@s.com"); sub2Request.ReportingToId = manager.Id;
            await _service.CreateStaffAsync(sub1Request);
            await _service.CreateStaffAsync(sub2Request);

            var subordinates = await _service.GetSubordinatesAsync(manager.Id, _schoolId);
            subordinates.Should().HaveCount(2);
        }

        // ═════════════════════════════════════════════════════════════════════
        // 19. StaffListResponse.TotalPages
        // ═════════════════════════════════════════════════════════════════════

        [Theory]
        [InlineData(10, 10, 1)]
        [InlineData(11, 10, 2)]
        [InlineData(0, 10, 0)]
        [InlineData(100, 10, 10)]
        [InlineData(1, 10, 1)]
        public void StaffListResponse_TotalPages_CalculatedCorrectly(int total, int pageSize, int expectedPages)
        {
            var response = new StaffListResponse { Total = total, PageSize = pageSize };
            response.TotalPages.Should().Be(expectedPages);
        }

        [Fact]
        public void StaffListResponse_TotalPages_ZeroWhenPageSizeZero()
        {
            var response = new StaffListResponse { Total = 10, PageSize = 0 };
            response.TotalPages.Should().Be(0);
        }
    }
}
