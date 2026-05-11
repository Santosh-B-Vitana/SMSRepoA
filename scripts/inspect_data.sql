-- Show all classes
SELECT "Id", "Name", "Code", "Status" FROM "Classes" WHERE "IsDeleted" = false ORDER BY "Name" LIMIT 50;
