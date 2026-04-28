using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;
using SmsApi.Services;
using Xunit;

namespace SmsApi.Tests.Unit.LeaveManagement
{
    public class LeaveManagementServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly LeaveManagementService _service;
        private readonly Guid _schoolId = Guid.NewGuid();
        private readonly Guid _otherSchoolId = Guid.NewGuid();

        public LeaveManagementServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            _context = new AppDbContext(options);
            _service = new LeaveManagementService(_context);
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        private async Task<Guid> SeedUserAsync(Guid? userId = null, Guid? schoolId = null)
        {
            var id = userId ?? Guid.NewGuid();
            var sId = schoolId ?? _schoolId;

            _context.UserLogins.Add(new UserLogin
            {
                Id = id,
                SchoolId = sId,
                Username = $"user-{Guid.NewGuid():N}",
                Email = $"user-{Guid.NewGuid():N}@school.com",
                PasswordHash = "hash",
                Role = "Staff",
                Status = "active",
                IsDeleted = false,
                FirstName = "Test",
                LastName = "User"
            });

            await _context.SaveChangesAsync();
            return id;
        }

        private async Task<LeaveType> SeedLeaveTypeAsync(bool requiresDocument = false, int minNoticeDays = 0)
        {
            var leaveType = new LeaveType
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                Name = "Sick Leave",
                ApplicableTo = "Staff",
                MaxDaysPerYear = 12,
                RequiresApproval = true,
                RequiresDocument = requiresDocument,
                MinNoticeDays = minNoticeDays,
                IsCarryForward = false,
                IsPaid = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.LeaveTypes.Add(leaveType);
            await _context.SaveChangesAsync();
            return leaveType;
        }

        private async Task SeedLeaveBalanceAsync(Guid userId, Guid leaveTypeId, int available = 10)
        {
            _context.LeaveBalances.Add(new LeaveBalance
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                UserId = userId,
                UserType = "Staff",
                LeaveTypeId = leaveTypeId,
                AcademicYear = DateTime.UtcNow.Year.ToString(),
                TotalAllowed = available,
                Used = 0,
                Available = available,
                CarriedForward = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task CreateLeaveType_Throws_WhenNameIsInvalid()
        {
            var request = new CreateLeaveTypeRequest
            {
                SchoolId = _schoolId,
                Name = " ",
                ApplicableTo = "Staff",
                MaxDaysPerYear = 10,
                MinNoticeDays = 0
            };

            var act = () => _service.CreateLeaveTypeAsync(request);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*name is required*");
        }

        [Fact]
        public async Task CreateLeaveType_Throws_WhenApplicableToInvalid()
        {
            var request = new CreateLeaveTypeRequest
            {
                SchoolId = _schoolId,
                Name = "Annual Leave",
                ApplicableTo = "Visitor",
                MaxDaysPerYear = 10,
                MinNoticeDays = 0
            };

            var act = () => _service.CreateLeaveTypeAsync(request);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*ApplicableTo*");
        }

        [Fact]
        public async Task CreateLeaveType_Throws_OnDuplicateNameInSameScope()
        {
            await SeedLeaveTypeAsync();

            var request = new CreateLeaveTypeRequest
            {
                SchoolId = _schoolId,
                Name = "sick leave",
                ApplicableTo = "staff",
                MaxDaysPerYear = 12,
                MinNoticeDays = 0
            };

            var act = () => _service.CreateLeaveTypeAsync(request);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already exists*");
        }

        [Fact]
        public async Task CreateLeaveRequest_Throws_WhenApplicantMissingInSchool()
        {
            var leaveType = await SeedLeaveTypeAsync();

            var request = new CreateLeaveRequestRequest
            {
                SchoolId = _schoolId,
                ApplicantId = Guid.NewGuid(),
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(1),
                EndDate = DateTime.UtcNow.Date.AddDays(1),
                Reason = "Medical"
            };

            var act = () => _service.CreateLeaveRequestAsync(request);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Applicant does not exist*");
        }

        [Fact]
        public async Task CreateLeaveRequest_Throws_WhenDateInPast()
        {
            var userId = await SeedUserAsync();
            var leaveType = await SeedLeaveTypeAsync();
            await SeedLeaveBalanceAsync(userId, leaveType.Id);

            var request = new CreateLeaveRequestRequest
            {
                SchoolId = _schoolId,
                ApplicantId = userId,
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(-1),
                EndDate = DateTime.UtcNow.Date.AddDays(1),
                Reason = "Medical"
            };

            var act = () => _service.CreateLeaveRequestAsync(request);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*past*");
        }

        [Fact]
        public async Task CreateLeaveRequest_Throws_WhenDocumentRequiredButMissing()
        {
            var userId = await SeedUserAsync();
            var leaveType = await SeedLeaveTypeAsync(requiresDocument: true);
            await SeedLeaveBalanceAsync(userId, leaveType.Id);

            var request = new CreateLeaveRequestRequest
            {
                SchoolId = _schoolId,
                ApplicantId = userId,
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(1),
                EndDate = DateTime.UtcNow.Date.AddDays(2),
                Reason = "Medical proof required",
                DocumentUrl = null
            };

            var act = () => _service.CreateLeaveRequestAsync(request);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Document is required*");
        }

        [Fact]
        public async Task CreateLeaveRequest_AutoInitializesBalance_WhenBalanceMissing()
        {
            // The service auto-initializes leave balance from the leave type policy on first request.
            // This is the "self-heal" path — no exception should be thrown.
            var userId = await SeedUserAsync();
            var leaveType = await SeedLeaveTypeAsync();

            var request = new CreateLeaveRequestRequest
            {
                SchoolId = _schoolId,
                ApplicantId = userId,
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(1),
                EndDate = DateTime.UtcNow.Date.AddDays(2),
                Reason = "Medical"
            };

            var result = await _service.CreateLeaveRequestAsync(request);

            result.Should().NotBeNull();
            result.LeaveTypeId.Should().Be(leaveType.Id);
        }

        [Fact]
        public async Task CreateLeaveRequest_Throws_WhenInsufficientBalance()
        {
            var userId = await SeedUserAsync();
            var leaveType = await SeedLeaveTypeAsync();
            await SeedLeaveBalanceAsync(userId, leaveType.Id, available: 1);

            var request = new CreateLeaveRequestRequest
            {
                SchoolId = _schoolId,
                ApplicantId = userId,
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(1),
                EndDate = DateTime.UtcNow.Date.AddDays(3),
                Reason = "Medical"
            };

            var act = () => _service.CreateLeaveRequestAsync(request);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Insufficient leave balance*");
        }

        [Fact]
        public async Task CreateLeaveRequest_Throws_OnOverlappingPendingRequest()
        {
            var userId = await SeedUserAsync();
            var leaveType = await SeedLeaveTypeAsync();
            await SeedLeaveBalanceAsync(userId, leaveType.Id, available: 10);

            _context.LeaveRequests.Add(new StaffLeaveRequest
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolId,
                LeaveNumber = "LEAVE-OLD",
                ApplicantId = userId,
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(5),
                EndDate = DateTime.UtcNow.Date.AddDays(6),
                TotalDays = 2,
                Reason = "Old",
                Status = "pending",
                ApplicationDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            var request = new CreateLeaveRequestRequest
            {
                SchoolId = _schoolId,
                ApplicantId = userId,
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(6),
                EndDate = DateTime.UtcNow.Date.AddDays(7),
                Reason = "Overlap"
            };

            var act = () => _service.CreateLeaveRequestAsync(request);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*overlapping leave request*");
        }

        [Fact]
        public async Task CreateLeaveRequest_CreatesPendingRequest_WithUniqueLeaveNumber()
        {
            var userId = await SeedUserAsync();
            var leaveType = await SeedLeaveTypeAsync();
            await SeedLeaveBalanceAsync(userId, leaveType.Id, available: 10);

            var request = new CreateLeaveRequestRequest
            {
                SchoolId = _schoolId,
                ApplicantId = userId,
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(1),
                EndDate = DateTime.UtcNow.Date.AddDays(2),
                Reason = "Medical"
            };

            var result = await _service.CreateLeaveRequestAsync(request);

            result.Status.Should().Be("pending");
            result.TotalDays.Should().Be(2);
            result.LeaveNumber.Should().StartWith("LEAVE-");
            result.LeaveNumber.Length.Should().BeGreaterThan(20);
        }

        [Fact]
        public async Task ApproveLeave_Throws_WhenApproverIsApplicant()
        {
            var userId = await SeedUserAsync();
            var leaveType = await SeedLeaveTypeAsync();
            await SeedLeaveBalanceAsync(userId, leaveType.Id, available: 10);

            var created = await _service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
            {
                SchoolId = _schoolId,
                ApplicantId = userId,
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(2),
                EndDate = DateTime.UtcNow.Date.AddDays(2),
                Reason = "Medical"
            });

            var act = () => _service.ApproveLeaveAsync(created.Id, new ApproveLeaveRequest
            {
                ApprovedBy = userId,
                ApproverRemarks = "ok"
            }, _schoolId);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*cannot approve their own*");
        }

        [Fact]
        public async Task ApproveLeave_Throws_WhenBalanceNotEnoughAtApprovalTime()
        {
            var userId = await SeedUserAsync();
            var approverId = await SeedUserAsync(Guid.NewGuid(), _schoolId);
            var leaveType = await SeedLeaveTypeAsync();
            await SeedLeaveBalanceAsync(userId, leaveType.Id, available: 1);

            var created = await _service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
            {
                SchoolId = _schoolId,
                ApplicantId = userId,
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(3),
                EndDate = DateTime.UtcNow.Date.AddDays(3),
                Reason = "Medical"
            });

            var balance = await _context.LeaveBalances.FirstAsync();
            balance.Available = 0;
            await _context.SaveChangesAsync();

            var act = () => _service.ApproveLeaveAsync(created.Id, new ApproveLeaveRequest
            {
                ApprovedBy = approverId,
                ApproverRemarks = "ok"
            }, _schoolId);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Insufficient leave balance*");
        }

        [Fact]
        public async Task ApproveLeave_UpdatesStatusAndBalance()
        {
            var userId = await SeedUserAsync();
            var approverId = await SeedUserAsync(Guid.NewGuid(), _schoolId);
            var leaveType = await SeedLeaveTypeAsync();
            await SeedLeaveBalanceAsync(userId, leaveType.Id, available: 5);

            var created = await _service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
            {
                SchoolId = _schoolId,
                ApplicantId = userId,
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(2),
                EndDate = DateTime.UtcNow.Date.AddDays(3),
                Reason = "Medical"
            });

            var approved = await _service.ApproveLeaveAsync(created.Id, new ApproveLeaveRequest
            {
                ApprovedBy = approverId,
                ApproverRemarks = "approved"
            }, _schoolId);

            approved.Should().NotBeNull();
            approved!.Status.Should().Be("approved");

            var balance = await _context.LeaveBalances.FirstAsync();
            balance.Used.Should().Be(2);
            balance.Available.Should().Be(3);
        }

        [Fact]
        public async Task RejectLeave_Throws_WhenReasonMissing()
        {
            var userId = await SeedUserAsync();
            var approverId = await SeedUserAsync(Guid.NewGuid(), _schoolId);
            var leaveType = await SeedLeaveTypeAsync();
            await SeedLeaveBalanceAsync(userId, leaveType.Id, available: 5);

            var created = await _service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
            {
                SchoolId = _schoolId,
                ApplicantId = userId,
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(2),
                EndDate = DateTime.UtcNow.Date.AddDays(2),
                Reason = "Medical"
            });

            var act = () => _service.RejectLeaveAsync(created.Id, new RejectLeaveRequest
            {
                RejectedBy = approverId,
                ApproverRemarks = " "
            }, _schoolId);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Rejection reason is required*");
        }

        [Fact]
        public async Task GetLeaveRequests_NormalizesInvalidPagination()
        {
            var userId = await SeedUserAsync();
            var leaveType = await SeedLeaveTypeAsync();
            await SeedLeaveBalanceAsync(userId, leaveType.Id, available: 5);

            await _service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
            {
                SchoolId = _schoolId,
                ApplicantId = userId,
                ApplicantType = "Staff",
                LeaveTypeId = leaveType.Id,
                StartDate = DateTime.UtcNow.Date.AddDays(1),
                EndDate = DateTime.UtcNow.Date.AddDays(1),
                Reason = "Medical"
            });

            var result = await _service.GetLeaveRequestsAsync(_schoolId, page: 0, pageSize: -10);

            result.Page.Should().Be(1);
            result.PageSize.Should().Be(10);
            result.TotalCount.Should().BeGreaterThan(0);
        }

        [Fact]
        public async Task GetLeaveBalance_Throws_ForInvalidUserType()
        {
            var userId = await SeedUserAsync();

            var act = () => _service.GetLeaveBalanceAsync(userId, "Visitor", _schoolId);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*Invalid user type*");
        }
    }
}
