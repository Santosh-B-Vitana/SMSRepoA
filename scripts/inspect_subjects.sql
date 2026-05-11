-- Show all subjects
SELECT "Id", "Name", "Code", "Type", "Status" FROM "Subjects" WHERE "IsDeleted" = false ORDER BY "Name" LIMIT 60;
