using System.Net.Http.Json;
using System.Text.Json;

namespace SmsApi.IntegrationTests.Infrastructure;

/// <summary>
/// Helpers to obtain and apply JWT bearer tokens during integration tests.
///
/// The login response is wrapped by ApiResponseWrapperMiddleware:
///   { "success": true, "data": { "accessToken": "...", ... }, ... }
/// </summary>
public static class AuthHelper
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerOptions.Default)
    {
        PropertyNameCaseInsensitive = true
    };

    /// <summary>
    /// Calls POST /api/Auth/login with the seeded admin credentials and returns the JWT.
    /// </summary>
    public static async Task<string> GetAdminTokenAsync(HttpClient client)
    {
        return await GetTokenAsync(client, SmsApiFactory.AdminUsername, SmsApiFactory.AdminPassword);
    }

    /// <summary>
    /// Calls POST /api/Auth/login with the given credentials and returns the JWT.
    /// Throws <see cref="InvalidOperationException"/> when login fails.
    /// </summary>
    public static async Task<string> GetTokenAsync(HttpClient client, string username, string password)
    {
        var response = await client.PostAsJsonAsync("/api/Auth/login", new
        {
            username,
            password
        });

        var raw = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(
                $"Login failed ({(int)response.StatusCode}): {raw}");

        // Parse the response envelope: { "success": true, "data": { "accessToken": "..." } }
        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        // Handle both wrapped and direct response shapes.
        // The auth controller returns { "data": { "token": "...", ... } }
        // (property name is "token", not "accessToken")
        JsonElement tokenElement;
        if (root.TryGetProperty("data", out var dataElement))
        {
            if (dataElement.TryGetProperty("token", out tokenElement))
            {
                // primary shape: wrapped with "token" key
            }
            else if (dataElement.TryGetProperty("accessToken", out tokenElement))
            {
                // alternate shape: wrapped with "accessToken" key
            }
            else
                throw new InvalidOperationException($"Neither 'token' nor 'accessToken' found in login response data. Raw: {raw}");
        }
        else if (root.TryGetProperty("token", out tokenElement))
        {
            // direct format with "token" key
        }
        else if (root.TryGetProperty("accessToken", out tokenElement))
        {
            // direct format with "accessToken" key
        }
        else
        {
            throw new InvalidOperationException($"Cannot locate accessToken in login response. Raw: {raw}");
        }

        return tokenElement.GetString()
            ?? throw new InvalidOperationException("accessToken was null in login response.");
    }

    /// <summary>Sets the Authorization: Bearer header on <paramref name="client"/>.</summary>
    public static void SetBearerToken(HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    }
}
