using System.Text.Json.Serialization;

namespace HelloWorldApi.Models;

/// <summary>
/// The full payload accepted by <c>POST /api/coffee/recommendations</c>.
/// The first four sections are required; <see cref="Advanced"/> is optional and,
/// when supplied, lets the AI give more targeted feedback.
/// </summary>
public sealed class CoffeeShotRequest
{
    [JsonPropertyName("beans")]
    public Beans Beans { get; set; } = new();

    [JsonPropertyName("configuration")]
    public Configuration Configuration { get; set; } = new();

    [JsonPropertyName("extraction")]
    public Extraction Extraction { get; set; } = new();

    [JsonPropertyName("result")]
    public ShotResult Result { get; set; } = new();

    /// <summary>Optional "Advanced" section. Null when the user did not expand it.</summary>
    [JsonPropertyName("advanced")]
    public AdvancedDetails? Advanced { get; set; }
}

public sealed class Beans
{
    /// <summary>Whole days between the roast date and brew day. Null if not provided.</summary>
    [JsonPropertyName("daysOffRoast")]
    public int? DaysOffRoast { get; set; }

    /// <summary>Light, Medium or Dark.</summary>
    [JsonPropertyName("roastLevel")]
    public string? RoastLevel { get; set; }
}

public sealed class Configuration
{
    /// <summary>Number of shots being pulled (1 or 2).</summary>
    [JsonPropertyName("shots")]
    public int Shots { get; set; }

    /// <summary>Brand / model of the coffee machine.</summary>
    [JsonPropertyName("machine")]
    public string? Machine { get; set; }

    /// <summary>Brew water temperature in degrees Celsius (90–95).</summary>
    [JsonPropertyName("waterTemperatureC")]
    public double WaterTemperatureC { get; set; }
}

public sealed class Extraction
{
    /// <summary>Dry coffee dose in grams (6–26).</summary>
    [JsonPropertyName("doseGrams")]
    public double DoseGrams { get; set; }

    /// <summary>Liquid yield in grams (0–40).</summary>
    [JsonPropertyName("yieldGrams")]
    public double YieldGrams { get; set; }

    /// <summary>Shot time in seconds (0–40).</summary>
    [JsonPropertyName("timeSeconds")]
    public double TimeSeconds { get; set; }
}

public sealed class ShotResult
{
    /// <summary>Free-text description of what the shot was like.</summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

public sealed class AdvancedDetails
{
    [JsonPropertyName("crema")]
    public Crema? Crema { get; set; }

    [JsonPropertyName("shot")]
    public ShotFlow? Shot { get; set; }

    [JsonPropertyName("aroma")]
    public Aroma? Aroma { get; set; }

    [JsonPropertyName("tasteAndMouthfeel")]
    public TasteAndMouthfeel? TasteAndMouthfeel { get; set; }
}

public sealed class Crema
{
    /// <summary>e.g. Hazelnut, Golden caramel, Deep amber, Tiger striping, …</summary>
    [JsonPropertyName("colour")]
    public string? Colour { get; set; }

    /// <summary>Thick (2–4 mm), Medium, Thin, Almost None.</summary>
    [JsonPropertyName("thickness")]
    public string? Thickness { get; set; }

    /// <summary>Holds 30–60 sec, Fades moderately, Fades quickly, Disappears immediately.</summary>
    [JsonPropertyName("persistence")]
    public string? Persistence { get; set; }

    /// <summary>"Fine tight bubbles" or "Large soapy bubbles".</summary>
    [JsonPropertyName("texture")]
    public string? Texture { get; set; }
}

public sealed class ShotFlow
{
    /// <summary>Smooth, Slow, Sputtering, Immediate fast flow.</summary>
    [JsonPropertyName("initialDrip")]
    public string? InitialDrip { get; set; }

    /// <summary>Late, Medium, Early, Immediate.</summary>
    [JsonPropertyName("blondingTiming")]
    public string? BlondingTiming { get; set; }
}

public sealed class Aroma
{
    /// <summary>Sweet / balanced, Neutral, Sour, Bitter / burnt, Metallic / off.</summary>
    [JsonPropertyName("quality")]
    public string? Quality { get; set; }

    /// <summary>Strong, Moderate, Weak.</summary>
    [JsonPropertyName("intensity")]
    public string? Intensity { get; set; }
}

public sealed class TasteAndMouthfeel
{
    /// <summary>High, Medium, Low, None.</summary>
    [JsonPropertyName("sweetness")]
    public string? Sweetness { get; set; }

    /// <summary>Balanced, Bright, Sharp / Sour, Flat.</summary>
    [JsonPropertyName("acidity")]
    public string? Acidity { get; set; }

    /// <summary>Clean, Balanced, Harsh, Burnt.</summary>
    [JsonPropertyName("bitterness")]
    public string? Bitterness { get; set; }

    /// <summary>Silky, Medium, Thin, Astringent.</summary>
    [JsonPropertyName("body")]
    public string? Body { get; set; }

    /// <summary>Pleasant, Neutral, Dry, Bitter, Sour.</summary>
    [JsonPropertyName("aftertaste")]
    public string? Aftertaste { get; set; }
}

/// <summary>Response returned to the client: AI advice as markdown.</summary>
public sealed class CoffeeRecommendationResponse
{
    [JsonPropertyName("recommendations")]
    public string Recommendations { get; set; } = string.Empty;
}
