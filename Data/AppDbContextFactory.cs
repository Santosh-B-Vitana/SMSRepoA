using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SmsApi.Data
{
    /// <summary>
    /// Design-time factory used by EF Core CLI tools (dotnet ef migrations add, etc.).
    /// Avoids the "multiple constructors" ambiguity when AppDbContext has both a
    /// design-time constructor (no ITenantContext) and a runtime DI constructor.
    /// </summary>
    public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

            // Use a placeholder connection string — the real one is resolved at runtime.
            // SqlServer is the primary target; migrations are provider-specific but EF Core
            // will adapt column types automatically when switching providers.
            optionsBuilder.UseSqlServer(
                "Server=.;Database=SMS_Design;Trusted_Connection=True;TrustServerCertificate=True;",
                sqlOptions => sqlOptions.MigrationsAssembly("SmsApi"));

            return new AppDbContext(optionsBuilder.Options);
        }
    }
}
