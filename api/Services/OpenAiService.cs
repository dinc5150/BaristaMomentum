using System.ClientModel;
using Azure.AI.OpenAI;
using Microsoft.Extensions.Logging;
using OpenAI.Chat;

namespace HelloWorldApi.Services;

/// <summary>
/// Reusable wrapper around Azure OpenAI chat completions. Other services depend
/// on this rather than talking to the SDK directly, so the AI plumbing
/// (endpoint, deployment, credentials) lives in one place.
/// </summary>
public interface IOpenAiService
{
    /// <summary>
    /// Sends a system + user prompt to the configured chat deployment and
    /// returns the assistant's text response.
    /// </summary>
    Task<string> GetCompletionAsync(string systemPrompt, string userPrompt, CancellationToken cancellationToken = default);
}

public sealed class OpenAiService : IOpenAiService
{
    private readonly ILogger<OpenAiService> _logger;
    private readonly ChatClient _chatClient;

    public OpenAiService(ILogger<OpenAiService> logger)
    {
        _logger = logger;

        var endpoint = GetRequiredSetting("AZURE_OPENAI_ENDPOINT");
        var apiKey = GetRequiredSetting("AZURE_OPENAI_API_KEY");
        var deployment = GetRequiredSetting("AZURE_OPENAI_DEPLOYMENT");

        var client = new AzureOpenAIClient(new Uri(endpoint), new ApiKeyCredential(apiKey));
        _chatClient = client.GetChatClient(deployment);
    }

    public async Task<string> GetCompletionAsync(string systemPrompt, string userPrompt, CancellationToken cancellationToken = default)
    {
        var messages = new ChatMessage[]
        {
            new SystemChatMessage(systemPrompt),
            new UserChatMessage(userPrompt),
        };

        var options = new ChatCompletionOptions
        {
            Temperature = 0.4f,
        };

        ClientResult<ChatCompletion> result =
            await _chatClient.CompleteChatAsync(messages, options, cancellationToken);

        var text = string.Concat(result.Value.Content.Select(part => part.Text));

        if (string.IsNullOrWhiteSpace(text))
        {
            _logger.LogWarning("Azure OpenAI returned an empty completion.");
        }

        return text.Trim();
    }

    private static string GetRequiredSetting(string name)
    {
        var value = Environment.GetEnvironmentVariable(name);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Required application setting '{name}' is not configured.");
        }

        return value;
    }
}
