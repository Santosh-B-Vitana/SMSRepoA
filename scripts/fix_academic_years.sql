-- List AY-prefixed academic years
SELECT "Id", "Name", "IsCurrent" FROM "AcademicYears" WHERE "Name" LIKE 'AY%' ORDER BY "Name";

-- Delete AY-prefixed academic years (they are auto-generated junk)
DELETE FROM "AcademicYears" WHERE "Name" LIKE 'AY%';

-- Ensure exactly one year is active (the one with IsCurrent=true)
-- Update all non-current years to have Status = 'inactive' (cosmetic — isCurrent is the real flag)
UPDATE "AcademicYears" SET "Status" = 'inactive', "UpdatedAt" = NOW() WHERE "IsCurrent" = false AND "IsDeleted" = false;
UPDATE "AcademicYears" SET "Status" = 'active',   "UpdatedAt" = NOW() WHERE "IsCurrent" = true  AND "IsDeleted" = false;

-- Show final state
SELECT "Name", "IsCurrent", "Status" FROM "AcademicYears" WHERE "IsDeleted" = false ORDER BY "Name";
