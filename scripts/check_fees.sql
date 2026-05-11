-- Count and sample fee records
SELECT COUNT(*) as total_fee_records FROM "FeeRecords" WHERE "IsDeleted" = false;

-- Sample records with student names
SELECT fr."Id", s."Name" as student, fr."TotalAmount", fr."PaidAmount", fr."Status", fr."AcademicYear"
FROM "FeeRecords" fr
LEFT JOIN "Students" s ON s."Id" = fr."StudentId"
WHERE fr."IsDeleted" = false
ORDER BY fr."CreatedAt" DESC
LIMIT 10;
