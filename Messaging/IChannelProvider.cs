namespace SmsApi.Messaging;

/// <summary>
/// Contract for a single outbound messaging backend (AiSensy, Twilio, Firebase, etc.).
/// Register one implementation per channel; <see cref="IChannelNotificationManager"/> routes
/// incoming requests to the matching provider automatically.
/// </summary>
public interface IChannelProvider
{
    CommunicationChannel Channel { get; }

    Task<ChannelMessageResult> SendAsync(ChannelMessageRequest request,
        CancellationToken cancellationToken = default);
}
