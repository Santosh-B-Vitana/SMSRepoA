# AWS RDS Migration Guide — SMS API

> Complete fresh-start guide for deploying the School Management System on AWS RDS PostgreSQL.  
> This guide covers infrastructure setup, full schema deployment via EF Core migrations, and all seed data required to connect a new school to the application.

**Version:** 1.0 | **Target DB:** AWS RDS PostgreSQL 16 | **Created:** May 11, 2026

---

## Table of Contents

1. [AWS RDS Setup](#1-aws-rds-setup)
2. [Connection String Configuration](#2-connection-string-configuration)
3. [Environment Variables Reference](#3-environment-variables-reference)
4. [Schema Deployment (EF Core Migrations)](#4-schema-deployment-ef-core-migrations)
5. [Full Table Reference](#5-full-table-reference)
6. [Seed Data — Complete Fresh Start SQL](#6-seed-data--complete-fresh-start-sql)
7. [Performance Indexes](#7-performance-indexes)
8. [Multi-Tenancy Notes](#8-multi-tenancy-notes)
9. [Post-Seed Verification Checklist](#9-post-seed-verification-checklist)
10. [Backup Strategy](#10-backup-strategy)

---

## 1. AWS RDS Setup

### Recommended Instance Configuration

| Parameter | Recommended Value | Notes |
|-----------|-----------------|-------|
| Engine | PostgreSQL 16.x | Minimum: PostgreSQL 15 |
| Instance class | `db.t3.medium` (dev), `db.t3.large` (prod) | 2 vCPU / 4 GB RAM for medium |
| Multi-AZ | Yes (production) | Automatic failover |
| Storage | 100 GB gp3 SSD | Auto-scaling enabled |
| Storage encryption | Yes (AWS KMS) | Required for FERPA/data compliance |
| Backup retention | 7 days (dev), 30 days (prod) | Point-in-time recovery |
| Maintenance window | Sunday 03:00–04:00 UTC | Off-peak for schools |
| Parameter group | `default.postgres16` with `timezone = 'UTC'` | All timestamps stored as UTC |
| VPC | Private subnet (no public access) | API connects via security group |
| SSL/TLS | Require | Use `SSL Mode=Require` in connection string |

### Security Group Rules

```
Inbound:
  Port 5432 (PostgreSQL) from API EC2/ECS Security Group only
  NO public internet access

Outbound:
  All traffic (default)
```

### RDS Parameter Group Overrides

```ini
timezone = UTC
log_connections = on              -- log all new connections
log_disconnections = on
log_duration = off                -- enable only for debugging (performance impact)
log_min_duration_statement = 1000 -- log queries slower than 1s
shared_preload_libraries = pg_stat_statements
pg_stat_statements.track = all
```

---

## 2. Connection String Configuration

### `appsettings.Production.json`

```json
{
  "DatabaseProvider": "PostgreSQL",
  "ConnectionStrings": {
    "DefaultConnection": "Host=YOUR-RDS-ENDPOINT.rds.amazonaws.com;Port=5432;Database=smsdb;Username=smsapi;Password=YOUR_DB_PASSWORD;SSL Mode=Require;Trust Server Certificate=true;Application Name=SmsApi;Connection Lifetime=300;Pooling=true;Minimum Pool Size=5;Maximum Pool Size=50"
  }
}
```

### Connection String Parameters Explained

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `Host` | RDS endpoint | Hostname from RDS console |
| `Port` | `5432` | Default PostgreSQL port |
| `Database` | `smsdb` | Database name (create this first) |
| `Username` | `smsapi` | Dedicated app user (not `postgres`) |
| `Password` | `<strong password>` | Min 20 chars, alphanumeric + special |
| `SSL Mode` | `Require` | Enforce TLS in transit |
| `Connection Lifetime` | `300` | Recycle connections every 5 min |
| `Minimum Pool Size` | `5` | Pre-warm connection pool |
| `Maximum Pool Size` | `50` | Adjust based on instance class |

### Initial Database Setup (run once as `postgres` superuser)

```sql
-- Connect to RDS as master user (postgres or your admin user)

-- 1. Create the application database
CREATE DATABASE smsdb
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE   = 'en_US.UTF-8'
  TEMPLATE template0;

-- 2. Create a dedicated application user (NEVER use the master user in app)
CREATE USER smsapi WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD_HERE';

-- 3. Grant required privileges
GRANT CONNECT ON DATABASE smsdb TO smsapi;
\c smsdb
GRANT USAGE ON SCHEMA public TO smsapi;
GRANT CREATE ON SCHEMA public TO smsapi;        -- needed for EF migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO smsapi;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO smsapi;

-- 4. Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

---

## 3. Environment Variables Reference

All secrets are injected as environment variables. The `appsettings.Production.json` uses `${VAR_NAME}` placeholders that are resolved at runtime.

### Required Environment Variables

```bash
# ─── Database ─────────────────────────────────────────────────────────────────
DB_HOST=YOUR-RDS-ENDPOINT.ap-south-1.rds.amazonaws.com
DB_NAME=smsdb
DB_USER=smsapi
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD_MIN_20_CHARS

# ─── JWT Authentication ───────────────────────────────────────────────────────
JWT_SECRET=your-jwt-secret-minimum-256-bit-random-key-here-do-not-reuse-dev-key
JWT_ISSUER=SmsApi
JWT_AUDIENCE=SmsApiClient
# Expiry is set in appsettings (default: 60 minutes)

# ─── Redis (ElastiCache or Redis Cloud) ───────────────────────────────────────
REDIS_CONNECTION=your-elasticache-endpoint.cache.amazonaws.com:6379,ssl=true,password=YOUR_REDIS_PASSWORD

# ─── File Storage (AWS S3) ────────────────────────────────────────────────────
AWS_S3_BUCKET=your-school-sms-uploads
AWS_S3_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key

# ─── CORS ─────────────────────────────────────────────────────────────────────
FRONTEND_URL=https://app.yourschool.edu
ADMIN_PANEL_URL=https://admin.yourschool.edu
ALLOWED_HOSTS=app.yourschool.edu,admin.yourschool.edu

# ─── Payment Gateway (Cashfree) ───────────────────────────────────────────────
CASHFREE_APP_ID=your-cashfree-app-id
CASHFREE_SECRET_KEY=your-cashfree-secret-key
CASHFREE_BASE_URL=https://api.cashfree.com/pg

# ─── Email (SMTP) ─────────────────────────────────────────────────────────────
SMTP_SERVER=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SENDER_EMAIL=noreply@yourschool.edu
SENDER_PASSWORD=your-ses-smtp-password

# ─── Observability ────────────────────────────────────────────────────────────
OTEL_EXPORTER_OTLP_ENDPOINT=http://your-seq-or-grafana-endpoint:4317
SEQ_SERVER_URL=http://your-seq-instance:5341

# ─── File Storage Local Fallback ──────────────────────────────────────────────
FILE_STORAGE_PATH=/app/uploads
```

### AWS ECS / App Runner Task Definition Environment Variables

```json
{
  "environment": [
    { "name": "ASPNETCORE_ENVIRONMENT", "value": "Production" },
    { "name": "DB_HOST", "value": "YOUR-RDS-ENDPOINT.rds.amazonaws.com" },
    { "name": "DB_NAME", "value": "smsdb" }
  ],
  "secrets": [
    { "name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:sms/db-password" },
    { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:sms/jwt-secret" },
    { "name": "CASHFREE_SECRET_KEY", "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:sms/cashfree-secret" }
  ]
}
```

> **Security note:** Store all passwords and API keys in AWS Secrets Manager. Never hardcode credentials in task definitions, Dockerfiles, or source code.

---

## 4. Schema Deployment (EF Core Migrations)

### Step 1 — Set Connection String

```bash
# Set the production connection string as an environment variable
export ConnectionStrings__DefaultConnection="Host=YOUR-RDS-ENDPOINT.rds.amazonaws.com;Database=smsdb;Username=smsapi;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
```

### Step 2 — Apply All Migrations

```bash
# From the project root (SMSRepoA/)
dotnet ef database update --project SmsApi.csproj

# Or specify the connection string explicitly
dotnet ef database update \
  --connection "Host=YOUR-RDS-ENDPOINT.rds.amazonaws.com;Database=smsdb;Username=smsapi;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
```

This applies all EF Core migrations in order, including:
- Initial schema (all tables)
- `20260510082118_AddGuardianStaffIdToStudent` — adds `GuardianStaffId` FK on Students

### Step 3 — Verify Migration

```sql
-- Check all migrations are applied
SELECT migration_id, product_version
FROM "__EFMigrationsHistory"
ORDER BY migration_id;

-- Verify key tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Step 4 — Run Seed Data (see Section 6)

After migrations, run the seed SQL from Section 6 to populate the minimum required data.

---

## 5. Full Table Reference

All tables inherit the **BaseEntity** columns:

| Column | Type | Description |
|--------|------|-------------|
| `Id` | `UUID` PRIMARY KEY | Auto-generated via `gen_random_uuid()` |
| `CreatedAt` | `TIMESTAMPTZ NOT NULL` | Creation timestamp (UTC) |
| `UpdatedAt` | `TIMESTAMPTZ NOT NULL` | Last update timestamp (UTC) |
| `CreatedBy` | `UUID NULLABLE` | FK → Users/Persons |
| `UpdatedBy` | `UUID NULLABLE` | FK → Users/Persons |
| `IsDeleted` | `BOOLEAN NOT NULL DEFAULT FALSE` | Soft delete flag |
| `DeletedAt` | `TIMESTAMPTZ NULLABLE` | Deletion timestamp |
| `RowVersion` | `BYTEA` | Optimistic concurrency token |

### Identity & Auth Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `Schools` | `Id, Name, Code, Address, Phone, Email, LogoUrl, IsActive` | Multi-tenant school record |
| `Persons` | `Id, SchoolId, FirstName, LastName, Email, Phone, Role, HashedPassword, IsActive` | Core identity for all users |
| `UserLogins` | `Id, PersonId, Username, HashedPassword, LastLoginAt, FailedAttempts, LockedUntil` | Auth credentials + brute-force state |
| `RefreshTokens` | `Id, PersonId, Token, ExpiresAt, IsRevoked` | JWT refresh token store |
| `PasswordResetTokens` | `Id, PersonId, Token, ExpiresAt, IsUsed` | Password reset workflow |
| `AuditLogs` | `Id, SchoolId, UserId, Action, EntityType, EntityId, OldValues, NewValues, IpAddress` | Full audit trail |

### Academic Core Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `AcademicYears` | `Id, SchoolId, Name, StartDate, EndDate, IsCurrent, Status` | Academic year; exactly one `IsCurrent=true` per school |
| `Classes` | `Id, SchoolId, Name, DisplayOrder, SectionCount` | School-wide grade levels (no year FK) |
| `Sections` | `Id, ClassId, SchoolId, Name, MaxStrength, ClassTeacherId` | Divisions within a class |
| `Subjects` | `Id, SchoolId, Name, Code, SubjectTypeId, MaxTheoryMarks, MaxPracticalMarks` | Subject catalogue |
| `SubjectTypes` | `Id, SchoolId, Name` | e.g. Core, Elective, Co-curricular |
| `ClassSubjects` | `Id, ClassId, SubjectId, TeacherId, AcademicYearId` | Subject assigned to class + optional teacher |
| `StudentEnrollments` | `Id, StudentId, ClassId, SectionId, AcademicYearId, IsActive, RollNumber` | Current/historical class enrollment |
| `TeacherAssignments` | `Id, StaffId, ClassId, SectionId, SubjectId, AcademicYearId` | Teacher-subject-class mapping |
| `TimetableEntries` | `Id, SchoolId, ClassId, SectionId, SubjectId, TeacherId, DayOfWeek, PeriodNumber, StartTime, EndTime` | Period schedule |
| `Holidays` | `Id, SchoolId, Name, Date, Type` | School calendar holidays |

### Student Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `Students` | `Id, SchoolId, Name, FirstName, LastName, AdmissionNumber, DateOfBirth, Gender, Status, ClassId, SectionId, AcademicYearId, GuardianStaffId (nullable FK → Staff)` | Core student record |
| `Guardians` | `Id, SchoolId, Name, Email, Phone, Relation, AadharNumber, Occupation` | Normalized parent/guardian |
| `GuardianStudents` | `Id, GuardianId, StudentId, IsPrimary, CanPickup, CanViewFees, CanViewGrades` | Guardian–student link with permissions |
| `StudentDocuments` | `Id, StudentId, DocumentType, FileUrl, VerifiedAt` | Uploaded ID proofs, photos, etc. |
| `StudentSiblings` | `Id, StudentId, SiblingStudentId` | Sibling link for family fee discounts |
| `StudentAnnualHealthRecords` | `Id, StudentId, AcademicYearId, Height, Weight, VisionL, VisionR, HearingL, HearingR` | Annual health check data |
| `TransferCertificates` | `Id, StudentId, IssueDate, Reason, TCNumber, Status` | TC issuance tracking |
| `PromotionHistories` | `Id, StudentId, FromClassId, ToClassId, AcademicYearId, PromotedBy, PromotedAt` | Class promotion audit |

### Staff Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `StaffMembers` | `Id, SchoolId, EmployeeId, FirstName, LastName, Email, Phone, Department, Designation, DateOfJoining, EmploymentType, PanNumber, AadharNumber, BankAccountNumber, PfNumber, EsiNumber, UanNumber` | Staff master record |
| `StaffDocuments` | `Id, StaffId, DocumentType, FileUrl` | Staff document uploads |
| `StaffQualifications` | `Id, StaffId, Degree, University, Year` | Educational qualifications |
| `PerformanceReviews` | `Id, StaffId, ReviewerId, ReviewDate, Score, Remarks` | Annual performance review |
| `SalaryStructures` | `Id, StaffId, BasicSalary, HRA, DA, TA, MedicalAllowance, GrossSalary, EffectiveFrom` | Pay structure |
| `PayrollRecords` | `Id, StaffId, AcademicYearId, Month, Year, GrossSalary, NetSalary, PfDeduction, EsiDeduction, TaxDeduction, Status` | Monthly payroll |

### Attendance Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `StudentAttendances` | `Id, StudentId, ClassId, SectionId, Date, Status[Present/Absent/Late/Excused], MarkedBy` | Daily student attendance |
| `StaffAttendances` | `Id, StaffId, Date, Status, CheckInTime, CheckOutTime` | Staff attendance |

### Fee & Finance Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `FeeStructures` | `Id, SchoolId, ClassId, AcademicYearId, ComponentName, Amount, DueDate` | Fee component per class/year |
| `FeeRecords` | `Id, StudentId, AcademicYearId, FeeStructureId, TotalAmount, PaidAmount, DueAmount, Status` | Student-level fee ledger |
| `PaymentTransactions` | `Id, FeeRecordId, StudentId, Amount, PaymentDate, PaymentMethod, CashfreeOrderId, Status` | Payment records |
| `LateFeeConfigs` | `Id, SchoolId, AcademicYearId, GraceDays, LateFeeAmount, LateFeeType[Fixed/Percentage]` | Late fee rules |
| `FinanceAccounts` | `Id, SchoolId, Name, AccountType[ASSET/LIABILITY/EQUITY/INCOME/EXPENSE], Balance` | Chart of accounts |
| `FinanceTransactions` | `Id, AccountId, CategoryId, Amount, Type[DEBIT/CREDIT], Date, Description, Reference` | Double-entry transactions |
| `FinanceCategories` | `Id, SchoolId, Name, Type[INCOME/EXPENSE], Budget` | Budget categories |
| `PettyCashEntries` | `Id, SchoolId, Amount, Purpose, Status[PENDING/APPROVED/REJECTED], RequestedBy, ApprovedBy` | Petty cash workflow |

### Examination & Grades Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `Examinations` | `Id, SchoolId, ClassId, SubjectId, ExamTypeId, Name, MaxMarks, PassMarks, ExamDate, AcademicYearId` | Exam definition |
| `ExamTypes` | `Id, SchoolId, Name` | e.g. Unit Test, Half Yearly, Annual |
| `ExamResults` | `Id, ExaminationId, StudentId, MarksObtained, Grade, IsAbsent` | Individual student result |
| `GradeConfigurations` | `Id, SchoolId, ExamTypeId, ScaleType[Percentage/GPA/Grade]` | Grading scale config |
| `GradeTiers` | `Id, GradeConfigId, MinScore, MaxScore, Grade, GpaValue, Description` | Grade bands |
| `ReportCards` | `Id, StudentId, AcademicYearId, ExamTypeId, GeneratedAt, PdfUrl` | Generated report cards |

### Communication Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `Announcements` | `Id, SchoolId, Title, Content, TargetRole, PublishedAt, ExpiresAt` | School-wide announcements |
| `Messages` | `Id, SchoolId, SenderId, RecipientId, Subject, Body, IsRead` | Direct messages |
| `Notifications` | `Id, SchoolId, RecipientId, Title, Body, Type, IsRead, CreatedAt` | Push/in-app notifications |

### Other Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `Books` | `Id, SchoolId, ISBN, Title, Author, Publisher, Category, TotalCopies, AvailableCopies` | Library catalogue |
| `BookIssues` | `Id, BookId, StudentId, IssueDate, DueDate, ReturnDate, FineAmount` | Book issue/return |
| `TransportRoutes` | `Id, SchoolId, RouteName, StopsJson, VehicleNumber, DriverName` | Bus routes |
| `TransportStudents` | `Id, StudentId, RouteId, PickupStop, DropStop` | Student route assignment |
| `HostelRooms` | `Id, SchoolId, RoomNumber, Capacity, Type, Floor` | Hostel rooms |
| `HostelStudents` | `Id, StudentId, RoomId, AdmissionDate, DepartureDate` | Hostel occupancy |
| `HealthRecords` | `Id, StudentId, BloodGroup, Allergies, MedicalConditions, EmergencyContact` | Medical info |
| `Visitors` | `Id, SchoolId, Name, Phone, Purpose, HostPersonId, CheckInAt, CheckOutAt, IdProofType` | Visitor log |
| `LeaveTypes` | `Id, SchoolId, Name, MaxDaysPerYear, IsPaid` | CL, SL, EL, Maternity etc. |
| `LeaveRequests` | `Id, StaffId, LeaveTypeId, FromDate, ToDate, Days, Reason, Status, ApprovedBy` | Staff leave |
| `LeaveBalances` | `Id, StaffId, LeaveTypeId, AcademicYearId, TotalDays, UsedDays, BalanceDays` | Leave balance |

---

## 6. Seed Data — Complete Fresh Start SQL

Run this SQL **after** applying EF Core migrations. Replace placeholder values (marked `<<...>>`) with your school's actual data.

```sql
-- ============================================================
-- SMS API — Fresh Start Seed Data
-- Run against: smsdb (AWS RDS PostgreSQL)
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. SCHOOL
-- ─────────────────────────────────────────────────────────────
-- Use a fixed UUID so all other records reference it consistently.
-- Replace with your own generated UUID.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Schools" WHERE "Id" = '550e8400-e29b-41d4-a716-446655440000') THEN
    INSERT INTO "Schools" (
      "Id", "Name", "Code", "Address", "City", "State", "Pincode",
      "Phone", "Email", "Website", "LogoUrl",
      "BoardType", "MediumOfInstruction",
      "IsActive", "CreatedAt", "UpdatedAt", "IsDeleted"
    ) VALUES (
      '550e8400-e29b-41d4-a716-446655440000',
      '<<Your School Name>>',          -- e.g. 'Vitana Public School'
      '<<SCHOOL_CODE>>',               -- e.g. 'VPS001' (unique short code)
      '<<Full Address>>',
      '<<City>>',
      '<<State>>',                     -- e.g. 'Telangana'
      '<<Pincode>>',
      '<<Phone>>',                     -- e.g. '+91-40-12345678'
      '<<admin@yourschool.edu>>',
      '<<https://www.yourschool.edu>>',
      NULL,                            -- LogoUrl: upload logo to S3, update later
      'CBSE',                          -- or 'ICSE', 'STATE', 'IB'
      'English',
      TRUE,
      NOW(), NOW(), FALSE
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. ADMIN USER (Person + UserLogin)
-- ─────────────────────────────────────────────────────────────
-- The password hash below is for: 'Admin@123456' (bcrypt, cost 12)
-- IMPORTANT: Change the password immediately after first login.
-- Generate a new hash: dotnet run --project SmsApi.csproj -- hash-password "YourNewPassword"
-- Or use: https://bcrypt-generator.com/ with cost factor 12

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Persons" WHERE "Email" = '<<admin@yourschool.edu>>') THEN

    -- Insert Person record
    INSERT INTO "Persons" (
      "Id", "SchoolId", "FirstName", "LastName",
      "Email", "Phone", "Role",
      "IsActive", "CreatedAt", "UpdatedAt", "IsDeleted"
    ) VALUES (
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      '550e8400-e29b-41d4-a716-446655440000',
      '<<Admin First Name>>',
      '<<Admin Last Name>>',
      '<<admin@yourschool.edu>>',
      '<<Admin Phone>>',
      'admin',
      TRUE, NOW(), NOW(), FALSE
    );

    -- Insert UserLogin record
    INSERT INTO "UserLogins" (
      "Id", "PersonId", "Username", "HashedPassword",
      "FailedAttempts", "IsActive",
      "CreatedAt", "UpdatedAt", "IsDeleted"
    ) VALUES (
      'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      '<<admin@yourschool.edu>>',
      '$2a$12$YOUR_BCRYPT_HASH_HERE',   -- Replace with actual bcrypt hash
      0, TRUE,
      NOW(), NOW(), FALSE
    );

  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. ACADEMIC YEAR (current year must have IsCurrent = TRUE)
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  -- Ensure no stale current year exists
  UPDATE "AcademicYears"
  SET "IsCurrent" = FALSE, "UpdatedAt" = NOW()
  WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000';

  -- Insert the current academic year
  IF NOT EXISTS (
    SELECT 1 FROM "AcademicYears"
    WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000'
      AND "Name" = '2025-2026'
  ) THEN
    INSERT INTO "AcademicYears" (
      "Id", "SchoolId", "Name", "StartDate", "EndDate",
      "IsCurrent", "Status",
      "CreatedAt", "UpdatedAt", "IsDeleted"
    ) VALUES
    -- Previous year (inactive)
    (
      gen_random_uuid(),
      '550e8400-e29b-41d4-a716-446655440000',
      '2024-2025', '2024-04-01', '2025-03-31',
      FALSE, 'inactive',
      NOW(), NOW(), FALSE
    ),
    -- Current active year
    (
      'c3d4e5f6-a7b8-9012-cdef-123456789012',
      '550e8400-e29b-41d4-a716-446655440000',
      '2025-2026', '2025-04-01', '2026-03-31',
      TRUE, 'active',
      NOW(), NOW(), FALSE
    ),
    -- Next year (upcoming)
    (
      gen_random_uuid(),
      '550e8400-e29b-41d4-a716-446655440000',
      '2026-2027', '2026-04-01', '2027-03-31',
      FALSE, 'inactive',
      NOW(), NOW(), FALSE
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. CLASSES (school-wide, no academic year FK)
-- Adjust to match your school's actual grades.
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Classes" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000') THEN
    INSERT INTO "Classes" (
      "Id", "SchoolId", "Name", "DisplayOrder", "SectionCount",
      "CreatedAt", "UpdatedAt", "IsDeleted"
    ) VALUES
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Pre-KG',   0,  1, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'LKG',      1,  2, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'UKG',      2,  2, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Grade 1',  3,  3, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Grade 2',  4,  3, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Grade 3',  5,  3, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Grade 4',  6,  3, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Grade 5',  7,  3, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Grade 6',  8,  3, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Grade 7',  9,  3, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Grade 8',  10, 3, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Grade 9',  11, 3, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Grade 10', 12, 3, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Grade 11', 13, 2, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Grade 12', 14, 2, NOW(), NOW(), FALSE);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 5. SECTIONS (one row per class + section letter combination)
-- ─────────────────────────────────────────────────────────────
-- This inserts A/B/C sections for each class.
-- Run after classes are created.
DO $$
DECLARE
  cls RECORD;
  section_letters TEXT[] := ARRAY['A', 'B', 'C'];
  letter TEXT;
  section_count INT;
BEGIN
  FOR cls IN
    SELECT "Id", "Name", "SectionCount"
    FROM "Classes"
    WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000'
      AND "IsDeleted" = FALSE
  LOOP
    section_count := LEAST(cls."SectionCount", array_length(section_letters, 1));
    FOR i IN 1..section_count LOOP
      letter := section_letters[i];
      IF NOT EXISTS (
        SELECT 1 FROM "Sections"
        WHERE "ClassId" = cls."Id" AND "Name" = letter
      ) THEN
        INSERT INTO "Sections" (
          "Id", "ClassId", "SchoolId", "Name", "MaxStrength",
          "CreatedAt", "UpdatedAt", "IsDeleted"
        ) VALUES (
          gen_random_uuid(), cls."Id",
          '550e8400-e29b-41d4-a716-446655440000',
          letter, 40,
          NOW(), NOW(), FALSE
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 6. SUBJECT TYPES
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "SubjectTypes" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000') THEN
    INSERT INTO "SubjectTypes" ("Id", "SchoolId", "Name", "CreatedAt", "UpdatedAt", "IsDeleted") VALUES
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Core',          NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Elective',      NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Co-curricular', NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Language',      NOW(), NOW(), FALSE);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 7. SUBJECTS (school-level catalogue)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  core_type_id UUID;
  elective_type_id UUID;
  lang_type_id UUID;
  cocurr_type_id UUID;
BEGIN
  SELECT "Id" INTO core_type_id    FROM "SubjectTypes" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "Name" = 'Core';
  SELECT "Id" INTO elective_type_id FROM "SubjectTypes" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "Name" = 'Elective';
  SELECT "Id" INTO lang_type_id    FROM "SubjectTypes" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "Name" = 'Language';
  SELECT "Id" INTO cocurr_type_id  FROM "SubjectTypes" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "Name" = 'Co-curricular';

  IF NOT EXISTS (SELECT 1 FROM "Subjects" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000') THEN
    INSERT INTO "Subjects" (
      "Id", "SchoolId", "Name", "Code", "SubjectTypeId",
      "MaxTheoryMarks", "MaxPracticalMarks",
      "CreatedAt", "UpdatedAt", "IsDeleted"
    ) VALUES
    -- Core subjects
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Mathematics',         'MATH',  core_type_id,    80, 20, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Science',             'SCI',   core_type_id,    80, 20, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Social Studies',      'SST',   core_type_id,   100,  0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'English',             'ENG',   lang_type_id,   100,  0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Hindi',               'HIN',   lang_type_id,   100,  0, NOW(), NOW(), FALSE),
    -- Senior secondary (Grade 11-12)
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Physics',             'PHY',   core_type_id,    70, 30, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Chemistry',           'CHEM',  core_type_id,    70, 30, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Biology',             'BIO',   core_type_id,    70, 30, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'History',             'HIST',  core_type_id,   100,  0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Geography',           'GEO',   core_type_id,   100,  0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Economics',           'ECO',   core_type_id,   100,  0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Computer Science',    'CS',    elective_type_id, 70, 30, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Information Technology', 'IT', elective_type_id, 50, 50, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Accountancy',         'ACC',   core_type_id,    80, 20, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Business Studies',    'BS',    core_type_id,   100,  0, NOW(), NOW(), FALSE),
    -- Co-curricular
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Physical Education',  'PE',    cocurr_type_id,  50, 50, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Art & Craft',         'ART',   cocurr_type_id,  50, 50, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Music',               'MUS',   cocurr_type_id,  50, 50, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Value Education',     'VE',    cocurr_type_id, 100,  0, NOW(), NOW(), FALSE);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 8. EXAM TYPES
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "ExamTypes" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000') THEN
    INSERT INTO "ExamTypes" ("Id", "SchoolId", "Name", "CreatedAt", "UpdatedAt", "IsDeleted") VALUES
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Unit Test 1',         NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Unit Test 2',         NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Half Yearly',         NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Unit Test 3',         NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Pre-Board',           NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Annual / Final',      NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Class Test',          NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Assignment',          NOW(), NOW(), FALSE);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 9. LEAVE TYPES
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "LeaveTypes" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000') THEN
    INSERT INTO "LeaveTypes" (
      "Id", "SchoolId", "Name", "MaxDaysPerYear", "IsPaid",
      "CreatedAt", "UpdatedAt", "IsDeleted"
    ) VALUES
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Casual Leave (CL)',      12,  TRUE, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Sick Leave (SL)',         12,  TRUE, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Earned Leave (EL)',       30,  TRUE, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Maternity Leave (ML)',   180,  TRUE, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Paternity Leave (PL)',     5,  TRUE, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Loss of Pay (LOP)',       365, FALSE, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Compensatory Off (CO)',   10,  TRUE, NOW(), NOW(), FALSE);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 10. FINANCE ACCOUNTS (Chart of Accounts)
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "FinanceAccounts" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000') THEN
    INSERT INTO "FinanceAccounts" (
      "Id", "SchoolId", "Name", "AccountType", "Balance",
      "CreatedAt", "UpdatedAt", "IsDeleted"
    ) VALUES
    -- Asset accounts
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Cash Account',               'ASSET',     0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Bank Account — Operations',  'ASSET',     0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Bank Account — Fee',         'ASSET',     0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Petty Cash',                 'ASSET',  5000, NOW(), NOW(), FALSE),
    -- Income accounts
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Tuition Fee Income',         'INCOME',    0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Admission Fee Income',       'INCOME',    0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Store Sales Income',         'INCOME',    0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Transport Fee Income',       'INCOME',    0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Hostel Fee Income',          'INCOME',    0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Other Income',               'INCOME',    0, NOW(), NOW(), FALSE),
    -- Expense accounts
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Salary Expense',             'EXPENSE',   0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Utilities Expense',          'EXPENSE',   0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Maintenance Expense',        'EXPENSE',   0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Stationery & Supplies',      'EXPENSE',   0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Technology Expense',         'EXPENSE',   0, NOW(), NOW(), FALSE);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 11. FINANCE CATEGORIES
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "FinanceCategories" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000') THEN
    INSERT INTO "FinanceCategories" (
      "Id", "SchoolId", "Name", "Type", "Budget",
      "CreatedAt", "UpdatedAt", "IsDeleted"
    ) VALUES
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Tuition Fee',       'INCOME',  0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Admission Fee',     'INCOME',  0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Store Sales',       'INCOME',  0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Donation',          'INCOME',  0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Other Income',      'INCOME',  0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Staff Salaries',    'EXPENSE', 0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Utilities',         'EXPENSE', 0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Maintenance',       'EXPENSE', 0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Stationery',        'EXPENSE', 0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Technology',        'EXPENSE', 0, NOW(), NOW(), FALSE),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 'Petty Cash',        'EXPENSE', 0, NOW(), NOW(), FALSE);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 12. GRADE CONFIGURATION (CBSE-style percentage scale)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  unit_test_id UUID;
  half_yearly_id UUID;
  annual_id UUID;
  grade_config_id UUID;
BEGIN
  SELECT "Id" INTO unit_test_id  FROM "ExamTypes" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "Name" = 'Unit Test 1';
  SELECT "Id" INTO half_yearly_id FROM "ExamTypes" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "Name" = 'Half Yearly';
  SELECT "Id" INTO annual_id     FROM "ExamTypes" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "Name" = 'Annual / Final';

  IF NOT EXISTS (SELECT 1 FROM "GradeConfigurations" WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000') THEN
    -- Insert configuration for Annual exam
    INSERT INTO "GradeConfigurations" ("Id", "SchoolId", "ExamTypeId", "ScaleType", "CreatedAt", "UpdatedAt", "IsDeleted")
    VALUES (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', annual_id, 'Percentage', NOW(), NOW(), FALSE)
    RETURNING "Id" INTO grade_config_id;

    -- CBSE grade tiers
    INSERT INTO "GradeTiers" ("Id", "GradeConfigId", "MinScore", "MaxScore", "Grade", "GpaValue", "Description", "CreatedAt", "UpdatedAt", "IsDeleted") VALUES
    (gen_random_uuid(), grade_config_id, 91, 100, 'A1', 10.0, 'Outstanding',   NOW(), NOW(), FALSE),
    (gen_random_uuid(), grade_config_id, 81,  90, 'A2',  9.0, 'Excellent',     NOW(), NOW(), FALSE),
    (gen_random_uuid(), grade_config_id, 71,  80, 'B1',  8.0, 'Very Good',     NOW(), NOW(), FALSE),
    (gen_random_uuid(), grade_config_id, 61,  70, 'B2',  7.0, 'Good',          NOW(), NOW(), FALSE),
    (gen_random_uuid(), grade_config_id, 51,  60, 'C1',  6.0, 'Average',       NOW(), NOW(), FALSE),
    (gen_random_uuid(), grade_config_id, 41,  50, 'C2',  5.0, 'Satisfactory',  NOW(), NOW(), FALSE),
    (gen_random_uuid(), grade_config_id, 33,  40, 'D',   4.0, 'Pass',          NOW(), NOW(), FALSE),
    (gen_random_uuid(), grade_config_id,  0,  32, 'E',   0.0, 'Fail',          NOW(), NOW(), FALSE);
  END IF;
END $$;

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- VERIFICATION QUERY
-- ─────────────────────────────────────────────────────────────
SELECT 'Schools'           AS table_name, COUNT(*) AS rows FROM "Schools"            WHERE "IsDeleted" = FALSE
UNION ALL
SELECT 'AcademicYears',    COUNT(*) FROM "AcademicYears"     WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "IsDeleted" = FALSE
UNION ALL
SELECT 'Classes',          COUNT(*) FROM "Classes"           WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "IsDeleted" = FALSE
UNION ALL
SELECT 'Sections',         COUNT(*) FROM "Sections"          WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "IsDeleted" = FALSE
UNION ALL
SELECT 'Subjects',         COUNT(*) FROM "Subjects"          WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "IsDeleted" = FALSE
UNION ALL
SELECT 'SubjectTypes',     COUNT(*) FROM "SubjectTypes"       WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "IsDeleted" = FALSE
UNION ALL
SELECT 'ExamTypes',        COUNT(*) FROM "ExamTypes"          WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "IsDeleted" = FALSE
UNION ALL
SELECT 'LeaveTypes',       COUNT(*) FROM "LeaveTypes"         WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "IsDeleted" = FALSE
UNION ALL
SELECT 'FinanceAccounts',  COUNT(*) FROM "FinanceAccounts"    WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "IsDeleted" = FALSE
UNION ALL
SELECT 'FinanceCategories',COUNT(*) FROM "FinanceCategories"  WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "IsDeleted" = FALSE
UNION ALL
SELECT 'Active AcademicYear (must be 1)', COUNT(*) FROM "AcademicYears"
  WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000' AND "IsCurrent" = TRUE AND "IsDeleted" = FALSE
ORDER BY table_name;
```

---

## 7. Performance Indexes

Run after seed data is loaded:

```sql
-- Tenant isolation (most critical — on every query)
CREATE INDEX IF NOT EXISTS idx_students_school_deleted
  ON "Students"("SchoolId") WHERE "IsDeleted" = FALSE;

CREATE INDEX IF NOT EXISTS idx_staff_school_deleted
  ON "StaffMembers"("SchoolId") WHERE "IsDeleted" = FALSE;

-- Guardian-Staff relationship (new May 2026)
CREATE INDEX IF NOT EXISTS idx_students_guardian_staff
  ON "Students"("GuardianStaffId") WHERE "GuardianStaffId" IS NOT NULL;

-- Single active year lookup (must be instant)
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_one_current
  ON "AcademicYears"("SchoolId") WHERE "IsCurrent" = TRUE AND "IsDeleted" = FALSE;

-- Enrollment lookup
CREATE INDEX IF NOT EXISTS idx_enrollments_student_year
  ON "StudentEnrollments"("StudentId", "AcademicYearId") WHERE "IsDeleted" = FALSE;

-- Attendance (date range queries)
CREATE INDEX IF NOT EXISTS idx_student_attendance_date
  ON "StudentAttendances"("StudentId", "Date") WHERE "IsDeleted" = FALSE;

CREATE INDEX IF NOT EXISTS idx_student_attendance_class_date
  ON "StudentAttendances"("ClassId", "SectionId", "Date") WHERE "IsDeleted" = FALSE;

-- Fee lookups
CREATE INDEX IF NOT EXISTS idx_fee_records_student_year
  ON "FeeRecords"("StudentId", "AcademicYearId") WHERE "IsDeleted" = FALSE;

-- Class subjects
CREATE INDEX IF NOT EXISTS idx_class_subjects_class
  ON "ClassSubjects"("ClassId") WHERE "IsDeleted" = FALSE;

-- Audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_entity
  ON "AuditLogs"("SchoolId", "EntityType", "CreatedAt");

-- UserLogin brute-force check
CREATE INDEX IF NOT EXISTS idx_user_logins_username
  ON "UserLogins"("Username") WHERE "IsDeleted" = FALSE;
```

---

## 8. Multi-Tenancy Notes

- **Every table** (except `Schools`) has a `SchoolId UUID` column that is the multi-tenancy key.
- EF Core **global query filters** automatically append `WHERE "SchoolId" = @currentSchoolId AND "IsDeleted" = FALSE` to every query. You do not need to manually filter in application code.
- The `SchoolId` is resolved from the JWT `school_id` claim via `ITenantService`.
- **Never share a user login across schools.** Each `Person` record is scoped to exactly one `SchoolId`.
- The school UUID `550e8400-e29b-41d4-a716-446655440000` is used throughout this guide as the example. Replace consistently across all seed data.

---

## 9. Post-Seed Verification Checklist

After running migrations and seed data, verify the following before going live:

```
[ ] dotnet ef database update completes without errors
[ ] Verification query (end of Section 6) shows expected row counts:
      Schools: 1
      AcademicYears: 3 (or as seeded)
      Active AcademicYear: MUST be exactly 1
      Classes: 15 (Pre-KG through Grade 12)
      Sections: 36+ (based on SectionCount per class)
      Subjects: 19
      SubjectTypes: 4
      ExamTypes: 8
      LeaveTypes: 7
      FinanceAccounts: 15
      FinanceCategories: 11
[ ] Admin login works: POST /api/auth/login with seeded credentials
[ ] JWT token returned contains correct school_id claim
[ ] GET /api/academics/classes returns 15 classes
[ ] GET /api/academics/academic-years shows 2025-2026 as current
[ ] GET /health/ready returns HTTP 200 (DB + Redis healthy)
[ ] S3 bucket accessible: upload a test file via POST /api/documents/upload
[ ] Change admin password immediately after first login
```

---

## 10. Backup Strategy

### Automated RDS Backups

```
Automated backups: ENABLED
Retention: 30 days (production)
Backup window: 02:00–03:00 UTC (off-peak)
Point-in-time recovery: ENABLED
```

### Manual Snapshots Before Major Changes

```bash
# Create a manual RDS snapshot before applying migrations
aws rds create-db-snapshot \
  --db-instance-identifier smsdb-prod \
  --db-snapshot-identifier smsdb-pre-migration-$(date +%Y%m%d)
```

### Export Data Before Wiping Old DB (if migrating from local PostgreSQL)

```bash
# Export from local PostgreSQL
pg_dump -h localhost -U postgres -d "Test-Sch" \
  --no-owner --no-acl -F c \
  -f sms_backup_$(date +%Y%m%d).dump

# Restore to RDS (optional — only if preserving existing data)
pg_restore -h YOUR-RDS-ENDPOINT.rds.amazonaws.com \
  -U smsapi -d smsdb \
  --no-owner --no-acl \
  sms_backup_YYYYMMDD.dump
```

> **Note:** If starting with fresh data (recommended for AWS deployment), skip the restore step and use the seed SQL from Section 6 instead.

---

## Quick Reference — Connection Checklist

| What | Value / Location |
|------|-----------------|
| RDS Endpoint | AWS RDS Console → Databases → `smsdb-prod` → Connectivity → Endpoint |
| DB Port | `5432` |
| Database Name | `smsdb` |
| App User | `smsapi` |
| SSL | Required (`SSL Mode=Require`) |
| School UUID | `550e8400-e29b-41d4-a716-446655440000` (replace with your own) |
| Admin Email | As seeded in Section 6 Step 2 |
| EF Migration command | `dotnet ef database update` |
| Verify current year | `SELECT * FROM "AcademicYears" WHERE "IsCurrent" = TRUE` |
| Health endpoint | `GET /health/ready` |
