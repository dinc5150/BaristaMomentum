using System.Net;
using System.Text.Json;
using HelloWorldApi.Models;
using HelloWorldApi.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace HelloWorldApi.Functions;

/// <summary>
/// POST /api/coffee/recommendations — accepts a described espresso shot and
/// returns AI-generated advice (markdown) on how to improve it.
/// Access is gated by <c>ApiKeyMiddleware</c> like every other function.
/// </summary>
public class CoffeeAdvisor
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ICoffeeAdvisorService _advisor;
    private readonly ILogger<CoffeeAdvisor> _logger;

    public CoffeeAdvisor(ICoffeeAdvisorService advisor, ILogger<CoffeeAdvisor> logger)
    {
        _advisor = advisor;
        _logger = logger;
    }

    [Function("CoffeeRecommendations")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "coffee/recommendations")] HttpRequestData req)
    {
        _logger.LogInformation("CoffeeRecommendations endpoint invoked.");

        CoffeeShotRequest? request;
        try
        {
            request = await JsonSerializer.DeserializeAsync<CoffeeShotRequest>(req.Body, JsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse request body.");
            return await ErrorAsync(req, HttpStatusCode.BadRequest, "Request body is not valid JSON.");
        }

        if (request is null)
        {
            return await ErrorAsync(req, HttpStatusCode.BadRequest, "Request body is required.");
        }

        try
        {
            var result = await _advisor.GetRecommendationsAsync(request, req.FunctionContext.CancellationToken);

            if (!result.IsValid)
            {
                return await ErrorAsync(req, HttpStatusCode.BadRequest,
                    "Validation failed.", result.ValidationErrors);
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new CoffeeRecommendationResponse
            {
                Recommendations = result.Recommendations ?? string.Empty,
            });
            return response;
        }
        catch (InvalidOperationException ex)
        {
            // Missing AI configuration, etc.
            _logger.LogError(ex, "Coffee recommendation service is misconfigured.");
            return await ErrorAsync(req, HttpStatusCode.ServiceUnavailable,
                "The recommendation service is not configured correctly.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error generating coffee recommendations.");
            return await ErrorAsync(req, HttpStatusCode.BadGateway,
                "Failed to generate recommendations. Please try again.");
        }
    }

    private static async Task<HttpResponseData> ErrorAsync(
        HttpRequestData req, HttpStatusCode status, string message, IReadOnlyList<string>? details = null)
    {
        var response = req.CreateResponse(status);
        await response.WriteAsJsonAsync(new { error = message, details });
        response.StatusCode = status; // WriteAsJsonAsync defaults to 200; keep our status.
        return response;
    }
}
