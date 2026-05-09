using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SmsApi.Models.DTOs;
using SmsApi.Services.Migration;

namespace SmsApi.Services;

/// <summary>
/// Orchestrates v1 (SQL Server / .NET Framework 4.x) to v2 (PostgreSQL / .NET 8) student data migration.
///
/// This service accepts a batch of v1 student records (already exported as DTOs),
/// maps them to v2 format, and calls the existing <see cref="StudentService"/> BulkImport
/// pipeline which handles duplicate detection, validation, and DB insertion.
///
/// Guardians, TCs and extended records are written individually after the bulk
/// student import succeeds so referential integrity is maintained.
/// </summary>
public class V1MigrationService
{
    private readonly IStudentService _studentService;
    private readonly ILogger<V1MigrationService> _logger;

    public V1MigrationService(
        IStudentService studentService,
        ILogger<V1MigrationService> logger)
    {
        _studentService = studentService;
        _logger = logger;
    }

    // ─── Primary migration entry point ───────────────────────────────────────

    /// <summary>
    /// Migrates a batch of v1 student records to the target school in v2.
    ///
    /// Order of operations:
    ///  1. Map v1 students → CreateStudentRequest[]
    ///  2. BulkImport into v2 DB (handles duplicates gracefully)
    ///  3. For each successfully imported student: post guardians, TC, documents
    /// </summary>
    public async Task<MigrationResult> MigrateStudentsAsync(
        Guid targetSchoolId,
        Guid adminUserId,
        V1MigrationBatch batch)
    {
        var result = new MigrationResult();
        var mapper = new V1StudentMigrationMapper(targetSchoolId);

        // ── Step 1: Map student records ──────────────────────────────────────
        List<CreateStudentRequest> requests;
        try
        {
            requests = mapper.MapStudents(batch.Students, batch.OfficialInfos);
            _logger.LogInformation("Mapped {Count} v1 student records for school {SchoolId}",
                requests.Count, targetSchoolId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to map v1 student records");
            result.Errors.Add($"Mapping error: {ex.Message}");
            return result;
        }

        result.TotalProcessed = requests.Count;

        // ── Step 2: Bulk import ──────────────────────────────────────────────
        BulkOperationResult importResult;
        try
        {
            importResult = await _studentService.BulkImportStudentsAsync(
                targetSchoolId, requests, adminUserId);

            result.SuccessCount = importResult.SuccessCount;
            result.FailureCount = importResult.FailureCount;
            result.MigratedIds.AddRange(importResult.SuccessfulIds);

            foreach (var err in importResult.Errors)
                result.Errors.Add(err);

            _logger.LogInformation(
                "Bulk import complete: {Success} imported, {Failed} failed",
                result.SuccessCount, result.FailureCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Bulk import failed");
            result.Errors.Add($"Bulk import exception: {ex.Message}");
            result.FailureCount = requests.Count;
            return result;
        }

        // ── Step 3: Post-import extended records ─────────────────────────────
        // Resolve admission-number → v2 ID by querying per student (SuccessfulAdmissionNumbers
        // is available but we need the actual GUID). Map by index when both lists are aligned.
        var admNoToId = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < importResult.SuccessfulAdmissionNumbers.Count && i < importResult.SuccessfulIds.Count; i++)
            admNoToId[importResult.SuccessfulAdmissionNumbers[i]] = importResult.SuccessfulIds[i];

        foreach (var v1Student in batch.Students)
        {
            if (!admNoToId.TryGetValue(
                NormaliseAdmNo(v1Student.AdmissionNo, v1Student.GRNumber, v1Student.Id),
                out var v2Id))
                continue;  // student was skipped or failed — no post-processing

            await PostImportGuardiansAsync(v2Id, targetSchoolId, adminUserId, v1Student, batch, mapper, result);
            await PostImportTransferCertificateAsync(v2Id, targetSchoolId, adminUserId, v1Student, batch, mapper, result);
        }

        return result;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task PostImportGuardiansAsync(
        Guid studentId, Guid schoolId, Guid adminUserId,
        V1Student v1Student, V1MigrationBatch batch,
        V1StudentMigrationMapper mapper, MigrationResult result)
    {
        var guardians = batch.Guardians
            .Where(g => g.StudentId == v1Student.Id)
            .ToList();

        if (!guardians.Any()) return;

        foreach (var v1Guardian in guardians)
        {
            try
            {
                var dto = mapper.MapGuardian(v1Guardian);
                await _studentService.AddGuardianAsync(schoolId, studentId, dto, adminUserId);
            }
            catch (Exception ex)
            {
                var msg = $"Guardian for student {v1Student.Id}: {ex.Message}";
                _logger.LogWarning(msg);
                result.Warnings.Add(msg);
            }
        }
    }

    private async Task PostImportTransferCertificateAsync(
        Guid studentId, Guid schoolId, Guid adminUserId,
        V1Student v1Student, V1MigrationBatch batch,
        V1StudentMigrationMapper mapper, MigrationResult result)
    {
        var tc = batch.TransferCertificates
            .FirstOrDefault(t => t.StudentId == v1Student.Id);

        if (tc == null) return;

        try
        {
            var dto = mapper.MapTransferCertificate(tc);
            await _studentService.CreateTransferCertificateAsync(schoolId, studentId, dto, adminUserId);

            if (tc.IsTCIssued && tc.IssuedDate.HasValue)
            {
                await _studentService.IssueTCAsync(schoolId, studentId, new IssueTCRequest
                {
                    IssuedDate = tc.IssuedDate.Value,
                    TCNumber   = tc.TCNumber,
                }, adminUserId);
            }
        }
        catch (Exception ex)
        {
            var msg = $"TC for student {v1Student.Id}: {ex.Message}";
            _logger.LogWarning(msg);
            result.Warnings.Add(msg);
        }
    }

    private static string NormaliseAdmNo(string? admNo, string? grNo, int id) =>
        !string.IsNullOrWhiteSpace(admNo) ? admNo.Trim()
        : !string.IsNullOrWhiteSpace(grNo) ? $"GR-{grNo.Trim()}"
        : $"V1-MIGRATED-{id}";
}

// ─── Batch Input DTO ──────────────────────────────────────────────────────────

/// <summary>
/// Payload accepted by POST /api/Students/migrate-v1
/// All collections are optional — only Students is required.
/// </summary>
public sealed class V1MigrationBatch
{
    public List<V1Student>               Students             { get; set; } = new();
    public List<V1StudentOfficialInfo>   OfficialInfos        { get; set; } = new();
    public List<V1Guardian>              Guardians            { get; set; } = new();
    public List<V1Document>              Documents            { get; set; } = new();
    public List<V1TransferCertificate>   TransferCertificates { get; set; } = new();
}
