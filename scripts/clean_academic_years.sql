-- View all academic years with all fields
SELECT "Id", "SchoolId", "Name", "IsCurrent", "Status", "CreatedAt" FROM "AcademicYears" WHERE "IsDeleted" = false ORDER BY "SchoolId", "Name";

-- Delete orphan rows with SchoolId = all-zeros (not tied to any real school)
DELETE FROM "AcademicYears" WHERE "SchoolId" = '00000000-0000-0000-0000-000000000000' AND "IsDeleted" = false;

-- For the real school: keep only one IsCurrent=true (the 2025-2026 one)
-- Ensure no duplicate IsCurrent=true rows for the school
UPDATE "AcademicYears"
SET "IsCurrent" = false, "Status" = 'inactive', "UpdatedAt" = NOW()
WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000'
  AND "IsCurrent" = true
  AND "Name" <> '2025-2026'
  AND "IsDeleted" = false;

-- Final state
SELECT "Name", "SchoolId", "IsCurrent", "Status" FROM "AcademicYears" WHERE "IsDeleted" = false ORDER BY "Name";
