namespace SmsApi.Messaging;

/// <summary>
/// Contract for a single outbound messaging backend.
/// Register one implementation per channel via DI; <see cref="NotificationManager"/>
/// routes requests to the registered provider for each requested channel.
///
/// To swap providers: change which concrete class is registered in
/// <c>NotificationServicesExtensions.AddNotificationServices()</c> — no other code changes required.
/// </summary>
public interface IChannelProvider
{
    CommunicationChannel Channel { get; }

    Task<ChannelMessageResult> SendAsync(ChannelMessageRequest request,
        CancellationToken cancellationToken = default);
}
