using FluentAssertions;
using SmsApi.Features.Students.Commands;
using SmsApi.Features.Students.Queries;
using SmsApi.Models.DTOs;
using Xunit;

namespace SmsApi.Tests.Unit.Students
{
    public class CqrsValidatorsTests
    {
        [Fact]
        public void GetStudentsValidator_ShouldRejectInvalidPaging()
        {
            var validator = new GetStudentsCqrsQueryValidator();
            var result = validator.Validate(new GetStudentsCqrsQuery(Page: 0, PageSize: 101));

            result.IsValid.Should().BeFalse();
        }

        [Fact]
        public void CreateStudentValidator_ShouldRequireCoreFields()
        {
            var validator = new CreateStudentCqrsCommandValidator();
            var invalidRequest = new CreateStudentRequest();

            var result = validator.Validate(new CreateStudentCqrsCommand(invalidRequest));
            result.IsValid.Should().BeFalse();
        }
    }
}
