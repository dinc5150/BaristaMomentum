using System.Globalization;
using System.Text;
using HelloWorldApi.Models;
using Microsoft.Extensions.Logging;

namespace HelloWorldApi.Services;

/// <summary>
/// Turns a <see cref="CoffeeShotRequest"/> into a barista prompt, asks the AI
/// for advice, and returns the recommendations as markdown.
/// </summary>
public interface ICoffeeAdvisorService
{
    /// <summary>
    /// Validates the request and, if valid, returns AI-generated improvement advice.
    /// </summary>
    Task<CoffeeAdvisorResult> GetRecommendationsAsync(CoffeeShotRequest request, CancellationToken cancellationToken = default);
}

/// <summary>Outcome of an advisor call: either validation errors or recommendations.</summary>
public sealed record CoffeeAdvisorResult(IReadOnlyList<string> ValidationErrors, string? Recommendations)
{
    public bool IsValid => ValidationErrors.Count == 0;
}

public sealed class CoffeeAdvisorService : ICoffeeAdvisorService
{
    private const string SystemPrompt =
        "You are an expert barista and espresso technician. A home or cafe user will describe a " +
        "single espresso pull: the beans, machine configuration, extraction numbers, the result, " +
        "and optionally detailed sensory notes. Assess the shot and give clear, practical, encouraging " +
        "advice on how to improve the next pull.\n\n" +

        "STEP 1 — Sanity-check the inputs against normal espresso ranges BEFORE giving any other advice. " +
        "Typical norms:\n" +
        "- Dose: a single is ~7-11 g, a double is ~16-20 g (18 g is a common target). Scale by the number of shots.\n" +
        "- Brew ratio (yield g : dose g): ~1:1.5 to 1:2.5, with 1:2 a standard target.\n" +
        "- Yield: follows from dose x ratio (e.g. an 18 g double targets ~36 g out).\n" +
        "- Shot time: ~25-32 s for a normal espresso (ristretto shorter, lungo longer).\n" +
        "- Water temperature: ~90-96 C.\n\n" +

        "STEP 2 — Identify any value that is GROSSLY out of range for the stated number of shots (for " +
        "example a 6 g dose for a double, a 1:5 ratio, or a 5-second pull). A grossly wrong fundamental " +
        "input is the ROOT CAUSE and almost always explains the bad result on its own. Call it out " +
        "explicitly, state the recommended target value (e.g. 'increase dose from 6 g to ~18 g for a " +
        "double'), and make it the FIRST and highest-priority item. Do NOT bury it beneath, or recommend " +
        "fine-tuning (small grind/time/temperature tweaks) ahead of, a parameter that is far outside the " +
        "norm — fine-tuning only makes sense once the fundamentals (dose and ratio for the shot count) " +
        "are in a sane range.\n\n" +

        "STEP 3 — Reason about the relationships between grind, dose, yield (ratio), shot time, and water " +
        "temperature, and reference the user's specific numbers and notes when explaining the result.\n\n" +

        "Respond in concise GitHub-flavoured markdown with: a short overall assessment that names any " +
        "out-of-range values first, then a '## What to change' section as a bulleted list ordered by " +
        "impact (largest deviation from normal first, fine adjustments last). Each bullet names the " +
        "variable, the suggested target/direction, and the expected effect. Do not invent details the " +
        "user did not provide. If key information is missing, say what to measure next.";

    private readonly IOpenAiService _openAi;
    private readonly ILogger<CoffeeAdvisorService> _logger;

    public CoffeeAdvisorService(IOpenAiService openAi, ILogger<CoffeeAdvisorService> logger)
    {
        _openAi = openAi;
        _logger = logger;
    }

    public async Task<CoffeeAdvisorResult> GetRecommendationsAsync(CoffeeShotRequest request, CancellationToken cancellationToken = default)
    {
        var errors = Validate(request);
        if (errors.Count > 0)
        {
            return new CoffeeAdvisorResult(errors, null);
        }

        var userPrompt = BuildUserPrompt(request);
        _logger.LogInformation("Requesting espresso recommendations from Azure OpenAI.");

        var recommendations = await _openAi.GetCompletionAsync(SystemPrompt, userPrompt, cancellationToken);
        return new CoffeeAdvisorResult(Array.Empty<string>(), recommendations);
    }

    private static List<string> Validate(CoffeeShotRequest request)
    {
        var errors = new List<string>();

        if (request.Configuration.Shots is not (1 or 2))
        {
            errors.Add("configuration.shots must be 1 or 2.");
        }

        if (request.Configuration.WaterTemperatureC is < 90 or > 95)
        {
            errors.Add("configuration.waterTemperatureC must be between 90 and 95.");
        }

        if (request.Extraction.DoseGrams is < 6 or > 26)
        {
            errors.Add("extraction.doseGrams must be between 6 and 26.");
        }

        if (request.Extraction.YieldGrams is < 0 or > 40)
        {
            errors.Add("extraction.yieldGrams must be between 0 and 40.");
        }

        if (request.Extraction.TimeSeconds is < 0 or > 40)
        {
            errors.Add("extraction.timeSeconds must be between 0 and 40.");
        }

        if (string.IsNullOrWhiteSpace(request.Result.Description))
        {
            errors.Add("result.description is required.");
        }

        return errors;
    }

    private static string BuildUserPrompt(CoffeeShotRequest r)
    {
        var ci = CultureInfo.InvariantCulture;
        var sb = new StringBuilder();
        sb.AppendLine("Please assess this espresso shot and recommend how to improve it.");
        sb.AppendLine();

        sb.AppendLine("## Beans");
        if (r.Beans.DaysOffRoast is { } days)
        {
            sb.AppendLine($"- Days off roast: {days}");
        }
        AppendIf(sb, "Roast level", r.Beans.RoastLevel);
        sb.AppendLine();

        sb.AppendLine("## Configuration");
        sb.AppendLine($"- Shots: {r.Configuration.Shots}");
        AppendIf(sb, "Machine", r.Configuration.Machine);
        sb.AppendLine($"- Water temperature: {r.Configuration.WaterTemperatureC.ToString(ci)} °C");
        sb.AppendLine();

        sb.AppendLine("## Extraction");
        sb.AppendLine($"- Dose: {r.Extraction.DoseGrams.ToString(ci)} g");
        sb.AppendLine($"- Yield: {r.Extraction.YieldGrams.ToString(ci)} g");
        sb.AppendLine($"- Time: {r.Extraction.TimeSeconds.ToString(ci)} s");
        if (r.Extraction.DoseGrams > 0 && r.Extraction.YieldGrams > 0)
        {
            var ratio = r.Extraction.YieldGrams / r.Extraction.DoseGrams;
            sb.AppendLine($"- Approx. brew ratio (dose g : yield g): 1:{ratio.ToString("0.0", ci)}");
        }
        sb.AppendLine();

        sb.AppendLine("## Result");
        sb.AppendLine(r.Result.Description);
        sb.AppendLine();

        if (r.Advanced is { } adv && HasAnyAdvanced(adv))
        {
            sb.AppendLine("## Advanced sensory notes");

            if (adv.Crema is { } crema)
            {
                AppendIf(sb, "Crema colour", crema.Colour);
                AppendIf(sb, "Crema thickness", crema.Thickness);
                AppendIf(sb, "Crema persistence", crema.Persistence);
                AppendIf(sb, "Crema texture", crema.Texture);
            }

            if (adv.Shot is { } shot)
            {
                AppendIf(sb, "Initial drip", shot.InitialDrip);
                AppendIf(sb, "Blonding timing", shot.BlondingTiming);
            }

            if (adv.Aroma is { } aroma)
            {
                AppendIf(sb, "Aroma quality", aroma.Quality);
                AppendIf(sb, "Aroma intensity", aroma.Intensity);
            }

            if (adv.TasteAndMouthfeel is { } taste)
            {
                AppendIf(sb, "Sweetness", taste.Sweetness);
                AppendIf(sb, "Acidity", taste.Acidity);
                AppendIf(sb, "Bitterness", taste.Bitterness);
                AppendIf(sb, "Body / texture", taste.Body);
                AppendIf(sb, "Aftertaste", taste.Aftertaste);
            }
        }

        return sb.ToString();
    }

    // True only when at least one advanced field actually has a value, so the
    // "## Advanced sensory notes" header is never emitted for an empty block.
    private static bool HasAnyAdvanced(AdvancedDetails adv)
    {
        var values = new[]
        {
            adv.Crema?.Colour, adv.Crema?.Thickness, adv.Crema?.Persistence, adv.Crema?.Texture,
            adv.Shot?.InitialDrip, adv.Shot?.BlondingTiming,
            adv.Aroma?.Quality, adv.Aroma?.Intensity,
            adv.TasteAndMouthfeel?.Sweetness, adv.TasteAndMouthfeel?.Acidity,
            adv.TasteAndMouthfeel?.Bitterness, adv.TasteAndMouthfeel?.Body, adv.TasteAndMouthfeel?.Aftertaste,
        };

        return values.Any(v => !string.IsNullOrWhiteSpace(v));
    }

    private static void AppendIf(StringBuilder sb, string label, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            sb.AppendLine($"- {label}: {value}");
        }
    }
}
