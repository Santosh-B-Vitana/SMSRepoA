using Microsoft.EntityFrameworkCore;
using PhoneNumbers;
using SmsApi.Data;
using SmsApi.Models.Entities;

namespace SmsApi.Services.WhatsApp;

public interface IWhatsAppContactResolver
{
    /// <summary>
    /// Returns the primary WhatsApp-eligible phone number for a student event (parent/guardian contact).
    /// Checks opt-out and blacklist status. Returns null if contact cannot receive WhatsApp messages.
    /// </summary>
    Task<ResolvedContact?> ResolveForStudentAsync(Guid studentId, Guid schoolId, CancellationToken ct = default);

    /// <summary>
    /// Returns the WhatsApp-eligible phone number for a staff member.
    /// </summary>
    Task<ResolvedContact?> ResolveForStaffAsync(Guid staffId, Guid schoolId, CancellationToken ct = default);

    /// <summary>
    /// Normalizes any phone number to E.164 format (+91XXXXXXXXXX).
    /// Returns null if the number is not valid.
    /// </summary>
    string? NormalizeToE164(string rawPhone, string defaultRegion = "IN");

    /// <summary>
    /// Ensures a WhatsappContact record exists for the given entity; creates or updates it.
    /// </summary>
    Task<WhatsappContact> EnsureContactAsync(
        Guid schoolId, string entityType, Guid entityId,
        string name, string rawPhone, CancellationToken ct = default);
}

public record ResolvedContact(
    string Phone,       // E.164
    string Name,
    string EntityType,
    Guid EntityId,
    Guid? ContactId
);

public class WhatsAppContactResolver : IWhatsAppContactResolver
{
    private readonly AppDbContext _db;
    private readonly ILogger<WhatsAppContactResolver> _logger;
    private static readonly PhoneNumberUtil PhoneUtil = PhoneNumberUtil.GetInstance();

    public WhatsAppContactResolver(AppDbContext db, ILogger<WhatsAppContactResolver> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<ResolvedContact?> ResolveForStudentAsync(
        Guid studentId, Guid schoolId, CancellationToken ct = default)
    {
        // Try new Person chain first, then StudentGuardian, then Student.GuardianPhone
        var student = await _db.Students
            .Include(s => s.Person)
            .FirstOrDefaultAsync(s => s.Id == studentId && s.SchoolId == schoolId, ct);

        if (student == null) return null;

        string? rawPhone = null;
        string contactName = "Parent/Guardian";

        // Priority 1: Person.Phone (new identity chain)
        if (student.PersonId.HasValue && student.Person != null && !string.IsNullOrWhiteSpace(student.Person.Phone))
        {
            rawPhone = student.Person.Phone;
            contactName = student.Person.FullName ?? student.GuardianName ?? "Parent";
        }

        // Priority 2: StudentGuardian.Phone (primary guardian)
        if (string.IsNullOrWhiteSpace(rawPhone))
        {
            var guardian = await _db.StudentGuardians
                .Where(g => g.StudentId == studentId && g.SchoolId == schoolId && !g.IsDeleted)
                .OrderByDescending(g => g.CreatedAt)
                .FirstOrDefaultAsync(ct);
            if (guardian != null && !string.IsNullOrWhiteSpace(guardian.Phone))
            {
                rawPhone = guardian.Phone;
                contactName = guardian.Name ?? "Parent/Guardian";
            }
        }

        // Priority 3: Student.GuardianPhone (legacy field)
        if (string.IsNullOrWhiteSpace(rawPhone) && !string.IsNullOrWhiteSpace(student.GuardianPhone))
        {
            rawPhone = student.GuardianPhone;
            contactName = student.GuardianName ?? "Parent/Guardian";
        }

        if (string.IsNullOrWhiteSpace(rawPhone)) return null;

        var normalizedPhone = NormalizeToE164(rawPhone);
        if (normalizedPhone == null)
        {
            _logger.LogWarning("Student {StudentId} has invalid phone number: {Phone}", studentId, rawPhone);
            return null;
        }

        // Check opt-out/blacklist status
        var contact = await _db.WhatsappContacts
            .FirstOrDefaultAsync(c =>
                c.SchoolId == schoolId &&
                c.EntityType == "Student" &&
                c.EntityId == studentId, ct);

        if (contact != null && (contact.IsOptedOut || contact.IsBlacklisted))
        {
            _logger.LogDebug("Student {StudentId} contact is opted out or blacklisted", studentId);
            return null;
        }

        return new ResolvedContact(normalizedPhone, contactName, "Student", studentId, contact?.Id);
    }

    public async Task<ResolvedContact?> ResolveForStaffAsync(
        Guid staffId, Guid schoolId, CancellationToken ct = default)
    {
        var staff = await _db.StaffMembers
            .Include(s => s.Person)
            .FirstOrDefaultAsync(s => s.Id == staffId && s.SchoolId == schoolId, ct);

        if (staff == null) return null;

        string? rawPhone = null;
        string contactName = staff.Name ?? $"{staff.FirstName} {staff.LastName}";

        // Priority 1: Person.Phone
        if (staff.PersonId.HasValue && staff.Person != null && !string.IsNullOrWhiteSpace(staff.Person.Phone))
            rawPhone = staff.Person.Phone;

        // Priority 2: Staff.Phone (legacy)
        if (string.IsNullOrWhiteSpace(rawPhone) && !string.IsNullOrWhiteSpace(staff.Phone))
            rawPhone = staff.Phone;

        if (string.IsNullOrWhiteSpace(rawPhone)) return null;

        var normalizedPhone = NormalizeToE164(rawPhone);
        if (normalizedPhone == null) return null;

        // Check opt-out/blacklist
        var contact = await _db.WhatsappContacts
            .FirstOrDefaultAsync(c =>
                c.SchoolId == schoolId &&
                c.EntityType == "Staff" &&
                c.EntityId == staffId, ct);

        if (contact != null && (contact.IsOptedOut || contact.IsBlacklisted))
            return null;

        return new ResolvedContact(normalizedPhone, contactName, "Staff", staffId, contact?.Id);
    }

    public string? NormalizeToE164(string rawPhone, string defaultRegion = "IN")
    {
        if (string.IsNullOrWhiteSpace(rawPhone)) return null;

        try
        {
            // Clean up common formatting
            var cleaned = rawPhone.Trim().Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "");

            var parsed = PhoneUtil.Parse(cleaned, defaultRegion);
            if (!PhoneUtil.IsValidNumber(parsed)) return null;

            return PhoneUtil.Format(parsed, PhoneNumberFormat.E164);
        }
        catch (NumberParseException ex)
        {
            _logger.LogDebug("Phone parse failed for '{Phone}': {Error}", rawPhone, ex.Message);
            return null;
        }
    }

    public async Task<WhatsappContact> EnsureContactAsync(
        Guid schoolId, string entityType, Guid entityId,
        string name, string rawPhone, CancellationToken ct = default)
    {
        var normalizedPhone = NormalizeToE164(rawPhone) ?? rawPhone;

        var existing = await _db.WhatsappContacts
            .FirstOrDefaultAsync(c =>
                c.SchoolId == schoolId &&
                c.EntityType == entityType &&
                c.EntityId == entityId, ct);

        if (existing != null)
        {
            // Update phone if changed
            if (existing.Phone != normalizedPhone)
            {
                existing.Phone = normalizedPhone;
                existing.ValidationStatus = "Unknown";
                existing.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
            }
            return existing;
        }

        // Create new contact (default: opted in)
        var contact = new WhatsappContact
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            EntityType = entityType,
            EntityId = entityId,
            Name = name,
            Phone = normalizedPhone,
            CountryCode = "+91",
            IsValidated = false,
            IsOptedIn = true,
            IsOptedOut = false,
            IsBlacklisted = false,
            OptInAt = DateTime.UtcNow,
            ValidationStatus = "Unknown",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.WhatsappContacts.Add(contact);
        await _db.SaveChangesAsync(ct);
        return contact;
    }
}
