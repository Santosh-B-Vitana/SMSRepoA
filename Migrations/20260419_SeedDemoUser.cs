using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsApi.Migrations
{
    /// <inheritdoc />
    public partial class SeedDemoUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Insert demo admin user if it doesn't exist
            // Password: AdminDemo2026!
            // BCrypt hash: $2a$11$DXv3DreGs92LYv60EA04O.wm2FFVbVHWFDUqI7l7XZ3Eqzv2u0K2G
            migrationBuilder.Sql(@"
                INSERT INTO ""UserLogin"" (
                    ""Id"", ""SchoolId"", ""Email"", ""Username"", ""PasswordHash"", 
                    ""FirstName"", ""LastName"", ""Role"", ""Status"", 
                    ""FailedLoginAttempts"", ""TwoFactorEnabled"", ""CreatedAt"", ""UpdatedAt"", ""IsDeleted""
                )
                SELECT 
                    '550E8400-E29B-41D4-A716-446655440001'::uuid,
                    '550E8400-E29B-41D4-A716-446655440000'::uuid,
                    'admin@vitanaschools.edu',
                    'admin@vitanaschools.edu',
                    '$2a$11$DXv3DreGs92LYv60EA04O.wm2FFVbVHWFDUqI7l7XZ3Eqzv2u0K2G',
                    'Admin',
                    'Demo',
                    'admin',
                    'active',
                    0,
                    false,
                    NOW(),
                    NOW(),
                    false
                WHERE NOT EXISTS (
                    SELECT 1 FROM ""UserLogin"" 
                    WHERE ""Email"" = 'admin@vitanaschools.edu'
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DELETE FROM ""UserLogin"" 
                WHERE ""Email"" = 'admin@vitanaschools.edu' 
                AND ""Id"" = '550E8400-E29B-41D4-A716-446655440001'::uuid;
            ");
        }
    }
}
