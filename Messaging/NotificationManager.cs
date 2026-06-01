using System.Net;
using Microsoft.Extensions.Logging;

namespace SmsApi.Messaging;

/// <summary>
/// Routes each requested channel to its registered <see cref="IChannelProvider"/>.
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
        _providers = providers.ToDictionary(p => p.Channel);
        _logger    = logger;
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
                    $"No provider registered for channel {channel}.",
                    HttpStatusCode.NotImplemented)));

        return await Task.WhenAll(tasks);
    }
}
