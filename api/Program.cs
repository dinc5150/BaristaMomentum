using HelloWorldApi.Middleware;
using HelloWorldApi.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults(workerBuilder =>
    {
        // Enforce the API key on every HTTP-triggered function.
        workerBuilder.UseMiddleware<ApiKeyMiddleware>();
    })
    .ConfigureServices(services =>
    {
        // Azure OpenAI client wrapper is a singleton (one client per host);
        // the advisor is stateless so it can be a singleton too.
        services.AddSingleton<IOpenAiService, OpenAiService>();
        services.AddSingleton<ICoffeeAdvisorService, CoffeeAdvisorService>();
    })
    .Build();

host.Run();
