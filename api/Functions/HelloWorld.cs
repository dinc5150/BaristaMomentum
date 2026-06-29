using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace HelloWorldApi.Functions;

public class HelloWorld
{
    private readonly ILogger<HelloWorld> _logger;

    public HelloWorld(ILogger<HelloWorld> logger) => _logger = logger;

    // AuthorizationLevel.Anonymous because access is gated by ApiKeyMiddleware
    // (function keys are not honored by Static Web Apps managed functions).
    [Function("HelloWorld")]
    public HttpResponseData Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "hello")] HttpRequestData req)
    {
        _logger.LogInformation("HelloWorld endpoint invoked.");

        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "text/plain; charset=utf-8");
        response.WriteString("Hello World");
        return response;
    }
}
