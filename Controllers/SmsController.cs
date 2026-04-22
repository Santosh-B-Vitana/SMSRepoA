using SmsApi.Models.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SmsController : ControllerBase
{
    [HttpGet]
    public IActionResult GetMessages()
    {
        var messages = new[]
        {
            new { Id = 1, Recipient = "+1234567890", Message = "Hello World", SentAt = DateTime.UtcNow.AddHours(-1) },
            new { Id = 2, Recipient = "+0987654321", Message = "Test SMS", SentAt = DateTime.UtcNow.AddHours(-2) }
        };

        return Ok(messages);
    }

    [HttpPost]
    public IActionResult SendMessage([FromBody] SmsRequest request)
    {
        // Simulate sending an SMS
        var response = new
        {
            Id = new Random().Next(1000, 9999),
            Recipient = request.Recipient,
            Message = request.Message,
            Status = "Sent",
            SentAt = DateTime.UtcNow
        };

        return Ok(response);
    }
}

public class SmsRequest
{
    public string Recipient { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
