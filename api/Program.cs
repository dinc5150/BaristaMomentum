using HelloWorldApi.Middleware;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults(workerBuilder =>
    {
        // Enforce the API key on every HTTP-triggered function.
        workerBuilder.UseMiddleware<ApiKeyMiddleware>();
    })
    .Build();

host.Run();
