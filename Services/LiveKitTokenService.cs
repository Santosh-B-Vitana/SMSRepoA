using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SmsApi.Data;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface ILiveKitTokenService
    {
        /// <summary>
        /// Generates a short-lived LiveKit room access JWT for a participant.
        /// </summary>
        string GenerateRoomToken(
            string roomName,
            string participantIdentity,
            string participantName,
            bool canPublish,
            bool canSubscribe,
            int expiryMinutes = 15);

        /// <summary>
        /// Generates a room name scoped to the school (prevents cross-school room access).
        /// Format: {schoolId:N}-{classId:N}
        /// </summary>
        string BuildRoomName(Guid schoolId, Guid classId);

        /// <summary>
        /// Resolves LiveKit server URL and credentials for the given school.
        /// Falls back to shared Vitana credentials when UseSharedVitanaAccount = true.
        /// </summary>
        Task<LiveKitCredentials> ResolveCredentialsAsync(Guid schoolId);
    }

    public record LiveKitCredentials(string ServerUrl, string ApiKey, string ApiSecret);

    public class LiveKitTokenService : ILiveKitTokenService
    {
        private readonly IConfiguration _config;
        private readonly AppDbContext _db;
        private readonly ILogger<LiveKitTokenService> _logger;

        public LiveKitTokenService(
            IConfiguration config,
            AppDbContext db,
            ILogger<LiveKitTokenService> logger)
        {
            _config = config;
            _db = db;
            _logger = logger;
        }

        public string GenerateRoomToken(
            string roomName,
            string participantIdentity,
            string participantName,
            bool canPublish,
            bool canSubscribe,
            int expiryMinutes = 15)
        {
            var apiKey = _config["LiveKit:ApiKey"] ?? string.Empty;
            var apiSecret = _config["LiveKit:ApiSecret"] ?? string.Empty;

            return GenerateRoomTokenWithCredentials(
                apiKey, apiSecret, roomName, participantIdentity,
                participantName, canPublish, canSubscribe, expiryMinutes);
        }

        public string BuildRoomName(Guid schoolId, Guid classId)
            => $"{schoolId:N}-{classId:N}";

        public async Task<LiveKitCredentials> ResolveCredentialsAsync(Guid schoolId)
        {
            var schoolConfig = await _db.SchoolMeetingProviderConfigs
                .FirstOrDefaultAsync(c => c.SchoolId == schoolId);

            if (schoolConfig == null || schoolConfig.UseSharedVitanaAccount)
            {
                return new LiveKitCredentials(
                    ServerUrl: _config["LiveKit:ServerUrl"] ?? string.Empty,
                    ApiKey: _config["LiveKit:ApiKey"] ?? string.Empty,
                    ApiSecret: _config["LiveKit:ApiSecret"] ?? string.Empty);
            }

            return new LiveKitCredentials(
                ServerUrl: schoolConfig.LiveKitServerUrl ?? _config["LiveKit:ServerUrl"] ?? string.Empty,
                ApiKey: schoolConfig.LiveKitApiKey ?? _config["LiveKit:ApiKey"] ?? string.Empty,
                ApiSecret: schoolConfig.LiveKitApiSecretProtected ?? _config["LiveKit:ApiSecret"] ?? string.Empty);
        }

        /// <summary>
        /// Generates a LiveKit-compatible JWT signed with HS256.
        /// See: https://docs.livekit.io/home/get-started/authentication/
        /// </summary>
        internal static string GenerateRoomTokenWithCredentials(
            string apiKey,
            string apiSecret,
            string roomName,
            string participantIdentity,
            string participantName,
            bool canPublish,
            bool canSubscribe,
            int expiryMinutes)
        {
            var now = DateTimeOffset.UtcNow;
            var exp = now.AddMinutes(expiryMinutes);

            var videoClaims = new
            {
                room = roomName,
                roomJoin = true,
                canPublish,
                canSubscribe,
                canPublishData = true,
            };

            var videoClaimsJson = JsonSerializer.Serialize(videoClaims);

            var claims = new List<Claim>
            {
                new("iss", apiKey),
                new("sub", participantIdentity),
                new("jti", Guid.NewGuid().ToString("N")),
                new("name", participantName),
                new("video", videoClaimsJson),
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(apiSecret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                claims: claims,
                notBefore: now.UtcDateTime,
                expires: exp.UtcDateTime,
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
