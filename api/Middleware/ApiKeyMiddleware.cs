using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;

namespace HelloWorldApi.Middleware;

/// <summary>
/// Rejects any HTTP request that does not present a valid <c>x-api-key</c> header.
/// The expected value is read from the <c>API_KEY</c> application setting.
/// </summary>
public sealed class ApiKeyMiddleware : IFunctionsWorkerMiddleware
{
    private const string ApiKeyHeaderName = "x-api-key";

    private readonly ILogger<ApiKeyMiddleware> _logger;

    public ApiKeyMiddleware(ILogger<ApiKeyMiddleware> logger) => _logger = logger;

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var requestData = await context.GetHttpRequestDataAsync();

        // Non-HTTP triggers (timers, queues, etc.) are not key-protected.
        if (requestData is null)
        {
            await next(context);
            return;
        }

        var expectedKey = Environment.GetEnvironmentVariable("API_KEY");
        if (string.IsNullOrEmpty(expectedKey))
        {
            _logger.LogError("API_KEY application setting is not configured.");
            SetUnauthorized(context, requestData, "Server is missing API key configuration.");
            return;
        }

        if (!TryGetApiKey(requestData, out var providedKey) ||
            !FixedTimeEquals(providedKey, expectedKey))
        {
            _logger.LogWarning("Rejected request to {Url} with missing or invalid API key.", requestData.Url);
            SetUnauthorized(context, requestData, "A valid 'x-api-key' header is required.");
            return;
        }

        await next(context);
    }

    private static bool TryGetApiKey(HttpRequestData request, out string value)
    {
        if (request.Headers.TryGetValues(ApiKeyHeaderName, out var values))
        {
            value = values.FirstOrDefault() ?? string.Empty;
            return !string.IsNullOrEmpty(value);
        }

        value = string.Empty;
        return false;
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        // Constant-time comparison to avoid leaking the key via timing.
        var bytesA = Encoding.UTF8.GetBytes(a);
        var bytesB = Encoding.UTF8.GetBytes(b);
        return CryptographicOperations.FixedTimeEquals(bytesA, bytesB);
    }

    private static void SetUnauthorized(FunctionContext context, HttpRequestData request, string message)
    {
        var response = request.CreateResponse(HttpStatusCode.Unauthorized);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        response.WriteString($"{{\"error\":\"{message}\"}}");

        var invocationResult = context.GetInvocationResult();
        invocationResult.Value = response;
    }
}
