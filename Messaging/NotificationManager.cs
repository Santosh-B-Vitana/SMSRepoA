using System.Net;
using Microsoft.Extensions.Logging;

namespace SmsApi.Messaging;

/// <summary>
/// Routes each requested channel to its registered IChannelProvider.
/// One provider is registered per channel; swap providers in DI without touching this class.
/// Dispatches all requested channels concurrently via Task.WhenAll.
/// </summary>
public sealed class NotificationManager : IChannelNotificationManager
{
    private readonly IReadOnlyDictionary<CommunicationChannel, IChannelProvider> _providers;
    private readonly ILogger<NotificationManager> _logger;

    public NotificationManager(
        IEnumerable<IChannelProvider> providers,
        ILogger<NotificationManager> logger)
    {
        _logger = logger;

        var dict = new Dictionary<CommunicationChannel, IChannelProvider>();
        foreach (var provider in providers)
        {
            if (dict.TryGetValue(provider.Channel, out var existing))
                throw new InvalidOperationException(
                    $"Duplicate provider registration for channel '{provider.Channel}': " +
                    $"'{existing.GetType().Name}' and '{provider.GetType().Name}'. " +
                    "Each channel must have exactly one registered IChannelProvider.");
            dict[provider.Channel] = provider;
        }
        _providers = dict;
    }

    public async Task<IReadOnlyList<ChannelMessageResult>> SendAsync(
        ChannelMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Channels == null || request.Channels.Count == 0)
        {
            _logger.LogWarning("SendAsync: no channels specified for {Dest}", request.Destination);
            return Array.Empty<ChannelMessageResult>();
        }

        var tasks = request.Channels.Select(channel =>
            _providers.TryGetValue(channel, out var provider)
                ? provider.SendAsync(request, cancellationToken)
                : Task.FromResult(ChannelMessageResult.Failure(channel,
                    $"No provider registered for channel '{channel}'.",
                    HttpStatusCode.NotImplemented)));

        return await Task.WhenAll(tasks);
    }
}
