using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Volo.Abp.DependencyInjection;

namespace Modiaf.Al.Arab.Hotel.UiTranslations;


public class UiTranslationsFileStore(IOptions<UiTranslationsOptions> options)
    : IUiTranslationsFileStore, ITransientDependency
{
    public static readonly string[] SupportedLocales = ["ar", "fr", "id", "tr", "zh-Hans"];

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = true,
    };

    public async Task<string> ReadCombinedPayloadJsonAsync(CancellationToken cancellationToken = default)
    {
        await EnsureLocaleFilesExistAsync(cancellationToken).ConfigureAwait(false);

        var sidebarNav = new Dictionary<string, Dictionary<string, string>>();
        var brandSubtitle = new Dictionary<string, string>();
        var chrome = new Dictionary<string, Dictionary<string, string>>();
        var screenCopy = new Dictionary<string, Dictionary<string, Dictionary<string, string>>>();

        foreach (var locale in SupportedLocales)
        {
            var localeFile = await ReadLocaleFileAsync(locale, cancellationToken).ConfigureAwait(false);
            if (localeFile.SidebarNav is { Count: > 0 })
            {
                sidebarNav[locale] = localeFile.SidebarNav;
            }

            if (localeFile.BrandSubtitle is not null)
            {
                brandSubtitle[locale] = localeFile.BrandSubtitle;
            }

            if (localeFile.Chrome is { Count: > 0 })
            {
                chrome[locale] = localeFile.Chrome;
            }

            if (localeFile.ScreenCopy is { Count: > 0 })
            {
                screenCopy[locale] = localeFile.ScreenCopy;
            }
        }

        var combined = new Dictionary<string, object?>();
        if (sidebarNav.Count > 0)
        {
            combined["sidebarNav"] = sidebarNav;
        }

        if (brandSubtitle.Count > 0)
        {
            combined["brandSubtitle"] = brandSubtitle;
        }

        if (chrome.Count > 0)
        {
            combined["chrome"] = chrome;
        }

        if (screenCopy.Count > 0)
        {
            combined["screenCopy"] = screenCopy;
        }

        return JsonSerializer.Serialize(combined, JsonOptions);
    }

    public async Task WriteCombinedPayloadJsonAsync(
        string payloadJson,
        CancellationToken cancellationToken = default)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(payloadJson) ? "{}" : payloadJson);
        var root = doc.RootElement;

        Directory.CreateDirectory(GetRootDirectory());

        foreach (var locale in SupportedLocales)
        {
            var localeDto = ExtractLocaleFromCombined(root, locale);
            await WriteLocaleFileAsync(locale, localeDto, cancellationToken).ConfigureAwait(false);
        }
    }

    private async Task EnsureLocaleFilesExistAsync(CancellationToken cancellationToken)
    {
        var root = GetRootDirectory();
        if (!Directory.Exists(root))
        {
            Directory.CreateDirectory(root);
        }

        var anyMissing = false;
        foreach (var locale in SupportedLocales)
        {
            if (!File.Exists(GetLocaleFilePath(locale)))
            {
                anyMissing = true;
                break;
            }
        }

        if (!anyMissing)
        {
            return;
        }

        var seedJson = UiTranslationsSeedDefaults.PayloadJson;
        await WriteCombinedPayloadJsonAsync(seedJson, cancellationToken).ConfigureAwait(false);
    }

    private string GetRootDirectory()
    {
        if (string.IsNullOrWhiteSpace(options.Value.RootDirectory))
        {
            throw new InvalidOperationException(
                "UiTranslations:RootDirectory is not configured. Set it in HotelHttpApiHostModule.");
        }

        return options.Value.RootDirectory;
    }

    private string GetLocaleFilePath(string locale) =>
        Path.Combine(GetRootDirectory(), $"{locale}.json");

    private async Task<UiTranslationsLocaleFileDto> ReadLocaleFileAsync(
        string locale,
        CancellationToken cancellationToken)
    {
        var path = GetLocaleFilePath(locale);
        if (!File.Exists(path))
        {
            return new UiTranslationsLocaleFileDto();
        }

        await using var stream = File.OpenRead(path);
        var dto = await JsonSerializer
            .DeserializeAsync<UiTranslationsLocaleFileDto>(stream, JsonOptions, cancellationToken)
            .ConfigureAwait(false);
        return dto ?? new UiTranslationsLocaleFileDto();
    }

    private async Task WriteLocaleFileAsync(
        string locale,
        UiTranslationsLocaleFileDto dto,
        CancellationToken cancellationToken)
    {
        var path = GetLocaleFilePath(locale);
        await using var stream = File.Create(path);
        await JsonSerializer.SerializeAsync(stream, dto, JsonOptions, cancellationToken).ConfigureAwait(false);
    }

    private static UiTranslationsLocaleFileDto ExtractLocaleFromCombined(JsonElement root, string locale)
    {
        var dto = new UiTranslationsLocaleFileDto();

        if (root.TryGetProperty("sidebarNav", out var sidebarNav) &&
            sidebarNav.TryGetProperty(locale, out var navLocale) &&
            navLocale.ValueKind == JsonValueKind.Object)
        {
            dto.SidebarNav = JsonSerializer.Deserialize<Dictionary<string, string>>(navLocale.GetRawText(), JsonOptions);
        }

        if (root.TryGetProperty("brandSubtitle", out var brandSubtitle) &&
            brandSubtitle.TryGetProperty(locale, out var brandValue) &&
            brandValue.ValueKind == JsonValueKind.String)
        {
            dto.BrandSubtitle = brandValue.GetString();
        }

        if (root.TryGetProperty("chrome", out var chrome) &&
            chrome.TryGetProperty(locale, out var chromeLocale) &&
            chromeLocale.ValueKind == JsonValueKind.Object)
        {
            dto.Chrome = JsonSerializer.Deserialize<Dictionary<string, string>>(chromeLocale.GetRawText(), JsonOptions);
        }

        if (root.TryGetProperty("screenCopy", out var screenCopy) &&
            screenCopy.TryGetProperty(locale, out var screenLocale) &&
            screenLocale.ValueKind == JsonValueKind.Object)
        {
            dto.ScreenCopy = JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, string>>>(
                screenLocale.GetRawText(),
                JsonOptions);
        }

        return dto;
    }
}
