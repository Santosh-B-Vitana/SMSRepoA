using FluentAssertions;
using SmsApi.Models.Constants;
using Xunit;

namespace SmsApi.Tests.Unit
{
    public class StatusConstantsTests
    {
        [Fact]
        public void RoleGroups_ShouldContainExpectedAdminPrincipalValue()
        {
            StatusConstants.RoleGroups.AdminPrincipal
                .Should()
                .Be("Admin,Principal");
        }

        [Fact]
        public void Roles_ShouldExposeSuperAdmin()
        {
            StatusConstants.Roles.SuperAdmin
                .Should()
                .Be("SuperAdmin");
        }
    }
}
