using FirebaseAdmin.Messaging;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IFirebasePushService
    {
        /// <summary>Send a push notification to a single device token.</summary>
        Task<bool> SendPushAsync(
            string token,
            string title,
            string body,
            Dictionary<string, string>? data = null);

        /// <summary>Send a push notification to multiple device tokens. Returns (sent, failed) counts.</summary>
        Task<(int Sent, int Failed)> SendMulticastAsync(
            IEnumerable<string> tokens,
            string title,
            string body,
            Dictionary<string, string>? data = null);
    }

    public class FirebasePushService : IFirebasePushService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<FirebasePushService> _logger;

        public FirebasePushService(AppDbContext db, ILogger<FirebasePushService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<bool> SendPushAsync(
            string token,
            string title,
            string body,
            Dictionary<string, string>? data = null)
        {
            var (sent, _) = await SendMulticastAsync(new[] { token }, title, body, data);
            return sent == 1;
        }

        public async Task<(int Sent, int Failed)> SendMulticastAsync(
            IEnumerable<string> tokens,
            string title,
            string body,
            Dictionary<string, string>? data = null)
        {
            var tokenList = tokens.Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
            if (tokenList.Count == 0)
                return (0, 0);

            // Firebase SDK not initialized (no service account configured) — skip silently
            if (FirebaseAdmin.FirebaseApp.DefaultInstance == null)
            {
                _logger.LogDebug("Firebase not configured — skipping push delivery for {Count} token(s)", tokenList.Count);
                return (0, tokenList.Count);
            }

            int sent = 0, failed = 0;
            var invalidTokens = new List<string>();

            // FCM Multicast supports up to 500 tokens per request; batch if needed
            foreach (var batch in tokenList.Chunk(500))
            {
                var message = new MulticastMessage
                {
                    Tokens = batch.ToList(),
                    Notification = new FirebaseAdmin.Messaging.Notification { Title = title, Body = body },
                    Data = data ?? new Dictionary<string, string>(),
                    Android = new AndroidConfig
                    {
                        Priority = Priority.High,
                        Notification = new AndroidNotification
                        {
                            Sound = "default",
                            ClickAction = "FLUTTER_NOTIFICATION_CLICK"
                        }
                    },
                    Apns = new ApnsConfig
                    {
                        Aps = new Aps { Sound = "default", Badge = 1 }
                    }
                };

                try
                {
                    var response = await FirebaseMessaging.DefaultInstance.SendEachForMulticastAsync(message);

                    sent += response.SuccessCount;
                    failed += response.FailureCount;

                    // Collect invalid tokens to deactivate
                    for (int i = 0; i < response.Responses.Count; i++)
                    {
                        var r = response.Responses[i];
                        if (!r.IsSuccess)
                        {
                            var errorCode = r.Exception?.MessagingErrorCode;
                            if (errorCode is MessagingErrorCode.Unregistered or MessagingErrorCode.SenderIdMismatch)
                                invalidTokens.Add(batch[i]);

                            _logger.LogWarning(
                                "FCM delivery failed for token[{Index}]: {Code} — {Message}",
                                i, errorCode, r.Exception?.Message);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "FCM multicast error for batch of {Count} tokens", batch.Length);
                    failed += batch.Length;
                }
            }

            // Mark invalid tokens as inactive so they're excluded from future sends
            if (invalidTokens.Count > 0)
                await DeactivateTokensAsync(invalidTokens);

            return (sent, failed);
        }

        private async Task DeactivateTokensAsync(List<string> invalidTokens)
        {
            var affected = await _db.MobileDeviceTokens
                .Where(t => invalidTokens.Contains(t.NativeToken) && t.IsActive)
                .ToListAsync();

            foreach (var token in affected)
            {
                token.IsActive = false;
                token.UpdatedAt = DateTime.UtcNow;
            }

            if (affected.Count > 0)
                await _db.SaveChangesAsync();

            _logger.LogInformation("Deactivated {Count} invalid FCM token(s)", affected.Count);
        }
    }
}
