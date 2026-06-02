using System.Net;

namespace SmsApi.Messaging;

public record ChannelMessageResult(
    CommunicationChannel Channel,
    bool IsSuccess,
    string? MessageId,
    string? ErrorMessage,
    HttpStatusCode StatusCode)
{
    public static ChannelMessageResult Success(CommunicationChannel channel, string messageId,
        HttpStatusCode code = HttpStatusCode.OK)
        => new(channel, true, messageId, null, code);

    public static ChannelMessageResult Failure(CommunicationChannel channel, string errorMessage,
        HttpStatusCode code)
        => new(channel, false, null, errorMessage, code);
}
