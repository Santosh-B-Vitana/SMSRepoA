namespace SmsApi.Messaging;

/// <summary>
/// Unified entry point for outbound messaging. Inject this in controllers and services.
/// Dispatches to all channels listed in <see cref="ChannelMessageRequest.Channels"/> concurrently
/// and returns one <see cref="ChannelMessageResult"/> per requested channel.
/// </summary>
public interface IChannelNotificationManager
{
    Task<IReadOnlyList<ChannelMessageResult>> SendAsync(ChannelMessageRequest request,
        CancellationToken cancellationToken = default);
}
