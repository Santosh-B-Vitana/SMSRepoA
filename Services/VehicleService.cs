using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IVehicleService
    {
        Task<VehicleListResponse> GetVehiclesAsync(Guid schoolId, string? status, string? type);
        Task<VehicleResponse?> GetVehicleByIdAsync(Guid id, Guid schoolId);
        Task<VehicleResponse> CreateVehicleAsync(Guid schoolId, CreateVehicleRequest request);
        Task<VehicleResponse?> UpdateVehicleAsync(Guid id, Guid schoolId, UpdateVehicleRequest request);
        Task<bool> DeleteVehicleAsync(Guid id, Guid schoolId);
        Task<List<VehicleResponse>> GetExpiryAlertsAsync(Guid schoolId, int daysAhead = 30);
    }

    public class VehicleService : IVehicleService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<VehicleService> _logger;

        public VehicleService(AppDbContext db, ILogger<VehicleService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<VehicleListResponse> GetVehiclesAsync(Guid schoolId, string? status, string? type)
        {
            var query = _db.Vehicles.Where(v => v.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(v => v.Status == status);
            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(v => v.VehicleType == type);

            var vehicles = await query
                .Include(v => v.Routes)
                .OrderBy(v => v.RegistrationNumber)
                .ToListAsync();

            var responses = vehicles.Select(v => MapVehicle(v)).ToList();
            var alertCount = responses.Sum(r => r.ComplianceAlerts.Count);

            return new VehicleListResponse
            {
                Vehicles = responses,
                Total = responses.Count,
                AlertCount = alertCount
            };
        }

        public async Task<VehicleResponse?> GetVehicleByIdAsync(Guid id, Guid schoolId)
        {
            var vehicle = await _db.Vehicles
                .Include(v => v.Routes)
                .FirstOrDefaultAsync(v => v.Id == id && v.SchoolId == schoolId);

            return vehicle == null ? null : MapVehicle(vehicle);
        }

        public async Task<VehicleResponse> CreateVehicleAsync(Guid schoolId, CreateVehicleRequest request)
        {
            // Registration number must be unique per school
            var exists = await _db.Vehicles.AnyAsync(v =>
                v.SchoolId == schoolId &&
                v.RegistrationNumber.ToLower() == request.RegistrationNumber.ToLower());

            if (exists)
                throw new InvalidOperationException($"Vehicle with registration '{request.RegistrationNumber}' already exists.");

            var vehicle = new Vehicle
            {
                SchoolId = schoolId,
                RegistrationNumber = request.RegistrationNumber.ToUpper().Trim(),
                Make = request.Make,
                Model = request.Model,
                Year = request.Year,
                VehicleType = request.VehicleType,
                SeatingCapacity = request.SeatingCapacity,
                Color = request.Color,
                FuelType = request.FuelType,
                FitnessCertExpiry = request.FitnessCertExpiry,
                InsuranceExpiry = request.InsuranceExpiry,
                PUCExpiry = request.PUCExpiry,
                RoadTaxExpiry = request.RoadTaxExpiry,
                PermitExpiry = request.PermitExpiry,
                LastServiceDate = request.LastServiceDate,
                NextServiceDue = request.NextServiceDue,
                OdometerKm = request.OdometerKm,
                DriverStaffId = request.DriverStaffId,
                DriverName = request.DriverName,
                DriverPhone = request.DriverPhone,
                DriverLicenseNumber = request.DriverLicenseNumber,
                DriverLicenseExpiry = request.DriverLicenseExpiry,
                Notes = request.Notes,
                Status = "active"
            };

            _db.Vehicles.Add(vehicle);
            await _db.SaveChangesAsync();

            return (await GetVehicleByIdAsync(vehicle.Id, schoolId))!;
        }

        public async Task<VehicleResponse?> UpdateVehicleAsync(Guid id, Guid schoolId, UpdateVehicleRequest request)
        {
            var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == id && v.SchoolId == schoolId);
            if (vehicle == null) return null;

            // Check reg number uniqueness if being changed
            if (request.RegistrationNumber != null &&
                !string.Equals(vehicle.RegistrationNumber, request.RegistrationNumber, StringComparison.OrdinalIgnoreCase))
            {
                var regExists = await _db.Vehicles.AnyAsync(v =>
                    v.SchoolId == schoolId && v.Id != id &&
                    v.RegistrationNumber.ToLower() == request.RegistrationNumber.ToLower());

                if (regExists)
                    throw new InvalidOperationException($"Vehicle registration '{request.RegistrationNumber}' is already in use.");

                vehicle.RegistrationNumber = request.RegistrationNumber.ToUpper().Trim();
            }

            if (request.Make != null) vehicle.Make = request.Make;
            if (request.Model != null) vehicle.Model = request.Model;
            if (request.Year.HasValue) vehicle.Year = request.Year;
            if (request.VehicleType != null) vehicle.VehicleType = request.VehicleType;
            if (request.SeatingCapacity.HasValue) vehicle.SeatingCapacity = request.SeatingCapacity.Value;
            if (request.Color != null) vehicle.Color = request.Color;
            if (request.FuelType != null) vehicle.FuelType = request.FuelType;
            if (request.FitnessCertExpiry.HasValue) vehicle.FitnessCertExpiry = request.FitnessCertExpiry;
            if (request.InsuranceExpiry.HasValue) vehicle.InsuranceExpiry = request.InsuranceExpiry;
            if (request.PUCExpiry.HasValue) vehicle.PUCExpiry = request.PUCExpiry;
            if (request.RoadTaxExpiry.HasValue) vehicle.RoadTaxExpiry = request.RoadTaxExpiry;
            if (request.PermitExpiry.HasValue) vehicle.PermitExpiry = request.PermitExpiry;
            if (request.LastServiceDate.HasValue) vehicle.LastServiceDate = request.LastServiceDate;
            if (request.NextServiceDue.HasValue) vehicle.NextServiceDue = request.NextServiceDue;
            if (request.OdometerKm.HasValue) vehicle.OdometerKm = request.OdometerKm;
            if (request.DriverStaffId.HasValue) vehicle.DriverStaffId = request.DriverStaffId;
            if (request.DriverName != null) vehicle.DriverName = request.DriverName;
            if (request.DriverPhone != null) vehicle.DriverPhone = request.DriverPhone;
            if (request.DriverLicenseNumber != null) vehicle.DriverLicenseNumber = request.DriverLicenseNumber;
            if (request.DriverLicenseExpiry.HasValue) vehicle.DriverLicenseExpiry = request.DriverLicenseExpiry;
            if (request.Status != null) vehicle.Status = request.Status;
            if (request.Notes != null) vehicle.Notes = request.Notes;

            await _db.SaveChangesAsync();
            return await GetVehicleByIdAsync(id, schoolId);
        }

        public async Task<bool> DeleteVehicleAsync(Guid id, Guid schoolId)
        {
            var vehicle = await _db.Vehicles
                .Include(v => v.Routes)
                .FirstOrDefaultAsync(v => v.Id == id && v.SchoolId == schoolId);

            if (vehicle == null) return false;

            // Unlink from routes before deleting (soft delete handles the rest)
            if (vehicle.Routes.Any())
            {
                foreach (var route in vehicle.Routes)
                    route.VehicleId = null;
            }

            _db.Vehicles.Remove(vehicle);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<List<VehicleResponse>> GetExpiryAlertsAsync(Guid schoolId, int daysAhead = 30)
        {
            var vehicles = await _db.Vehicles
                .Include(v => v.Routes)
                .Where(v => v.SchoolId == schoolId && v.Status == "active")
                .ToListAsync();

            return vehicles
                .Select(v => MapVehicle(v))
                .Where(r => r.ComplianceAlerts.Any())
                .OrderBy(r => r.ComplianceAlerts.Min(a => a.DaysUntilExpiry))
                .ToList();
        }

        private static VehicleResponse MapVehicle(Vehicle v)
        {
            var now = DateTime.UtcNow.Date;
            var alerts = new List<VehicleComplianceAlert>();

            void CheckExpiry(string docType, DateTime? expiry)
            {
                if (!expiry.HasValue) return;
                var days = (int)(expiry.Value.Date - now).TotalDays;
                if (days <= 30)
                {
                    alerts.Add(new VehicleComplianceAlert
                    {
                        DocumentType = docType,
                        ExpiryDate = expiry.Value,
                        DaysUntilExpiry = days,
                        Severity = days < 0 ? "expired" : "expiring_soon"
                    });
                }
            }

            CheckExpiry("Fitness Certificate", v.FitnessCertExpiry);
            CheckExpiry("Insurance", v.InsuranceExpiry);
            CheckExpiry("PUC Certificate", v.PUCExpiry);
            CheckExpiry("Road Tax", v.RoadTaxExpiry);
            CheckExpiry("Permit", v.PermitExpiry);
            CheckExpiry("Driver License", v.DriverLicenseExpiry);
            if (v.NextServiceDue.HasValue)
                CheckExpiry("Service Due", v.NextServiceDue);

            return new VehicleResponse
            {
                Id = v.Id,
                SchoolId = v.SchoolId,
                RegistrationNumber = v.RegistrationNumber,
                Make = v.Make,
                Model = v.Model,
                Year = v.Year,
                VehicleType = v.VehicleType,
                SeatingCapacity = v.SeatingCapacity,
                Color = v.Color,
                FuelType = v.FuelType,
                FitnessCertExpiry = v.FitnessCertExpiry,
                InsuranceExpiry = v.InsuranceExpiry,
                PUCExpiry = v.PUCExpiry,
                RoadTaxExpiry = v.RoadTaxExpiry,
                PermitExpiry = v.PermitExpiry,
                LastServiceDate = v.LastServiceDate,
                NextServiceDue = v.NextServiceDue,
                OdometerKm = v.OdometerKm,
                DriverStaffId = v.DriverStaffId,
                DriverName = v.DriverName,
                DriverPhone = v.DriverPhone,
                DriverLicenseNumber = v.DriverLicenseNumber,
                DriverLicenseExpiry = v.DriverLicenseExpiry,
                Status = v.Status,
                Notes = v.Notes,
                AssignedRouteName = v.Routes?.FirstOrDefault(r => r.Status == "active")?.RouteName,
                ComplianceAlerts = alerts,
                CreatedAt = v.CreatedAt,
                UpdatedAt = v.UpdatedAt
            };
        }
    }
}
