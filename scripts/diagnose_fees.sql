-- Check student count
SELECT COUNT(*) as total_students FROM "Students" WHERE "IsDeleted" = false;

-- Check if fee records have valid student IDs
SELECT 
  fr."Id",
  fr."StudentId",
  s."Name" as student_name,
  s."IsDeleted" as student_deleted,
  fr."TotalAmount",
  fr."Status",
  fr."AcademicYear"
FROM "FeeRecords" fr
LEFT JOIN "Students" s ON s."Id" = fr."StudentId"
WHERE fr."IsDeleted" = false
ORDER BY fr."CreatedAt" DESC
LIMIT 15;

-- Check FeeStructures
SELECT COUNT(*) as total_structures FROM "FeeStructures" WHERE "IsDeleted" = false;
SELECT "Name", "Class", "AcademicYear", "TotalAmount", "Status" FROM "FeeStructures" WHERE "IsDeleted" = false ORDER BY "CreatedAt" DESC LIMIT 10;
