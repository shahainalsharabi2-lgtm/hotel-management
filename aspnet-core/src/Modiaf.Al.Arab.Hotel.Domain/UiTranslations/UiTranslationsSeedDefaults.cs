using System;
using System.IO;
using System.Reflection;
using System.Text;

namespace Modiaf.Al.Arab.Hotel.UiTranslations;

/// <summary>
/// ترجمات واجهة افتراضية (عربي / تركي / صيني مبسّط) من <c>ui-translations-default.json</c>.
/// تُحمَّل عند البذر إذا لم يكن هناك JSON محفوظ بعد.
/// </summary>
public static class UiTranslationsSeedDefaults
{
    private const string EmbeddedResourceName =
        "Modiaf.Al.Arab.Hotel.UiTranslations.ui-translations-default.json";

    /// <summary>نفس مخطط <c>UiManualTranslationsPayload</c> في الواجهة.</summary>
    public static string PayloadJson => LoadPayloadJson();

    private static string LoadPayloadJson()
    {
        var assembly = typeof(UiTranslationsSeedDefaults).Assembly;
        using var stream = assembly.GetManifestResourceStream(EmbeddedResourceName);
        if (stream == null)
        {
            throw new InvalidOperationException(
                $"Embedded UI translations resource not found: {EmbeddedResourceName}");
        }

        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    internal static bool IsEmptyOrUnset(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return true;
        }

        var t = json.TrimStart();
        return t == "{}" || t == "\"{}\"";
    }
}
