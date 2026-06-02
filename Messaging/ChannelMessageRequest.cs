namespace SmsApi.Messaging;

public record ChannelMessageRequest(
    string Destination,
    string RecipientName,
    string TemplateOrCampaignIdentifier,
    List<string> TemplateParameters,
    Dictionary<string, string> CustomAttributes,
    string? MediaUrl,
    string? MediaFilename,
    IReadOnlyList<CommunicationChannel> Channels)
{
    /// <summary>Single-channel, no-media convenience constructor.</summary>
    public ChannelMessageRequest(
        string destination,
        string recipientName,
        string templateOrCampaignIdentifier,
        List<string> templateParameters,
        CommunicationChannel channel)
        : this(destination, recipientName, templateOrCampaignIdentifier,
               templateParameters, new Dictionary<string, string>(),
               null, null, new[] { channel }) { }
}
