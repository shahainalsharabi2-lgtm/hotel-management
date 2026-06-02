using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace Modiaf.Al.Arab.Hotel.HotelSettings;

[AllowAnonymous]
public class HotelSettingsAppService(IRepository<HotelSettingsDocument, System.Guid> repository)
    : ApplicationService, IHotelSettingsAppService
{
    private const int MaxPasswordLength = 128;
    private const int MaxCurrencyIdLength = 32;
    private const int MaxCurrencySymbolLength = 16;
    private const int MaxCurrencyCodeLength = 16;

    public async Task<HotelSettingsDto> GetAsync()
    {
        var entity = await GetOrCreateAsync();
        return MapToDto(entity);
    }

    public async Task<HotelSettingsDto> UpdateAsync(HotelSettingsDto input)
    {
        var entity = await GetOrCreateAsync();
        ApplyInput(entity, input);
        await repository.UpdateAsync(entity, autoSave: true);
        return MapToDto(entity);
    }

    private async Task<HotelSettingsDocument> GetOrCreateAsync()
    {
        if (await repository.AnyAsync(x => x.Id == HotelSettingsDocument.SingletonId))
        {
            return await repository.GetAsync(HotelSettingsDocument.SingletonId);
        }

        var seed = new HotelSettingsDocument(HotelSettingsDocument.SingletonId);
        await repository.InsertAsync(seed, autoSave: true);
        return seed;
    }

    private static void ApplyInput(HotelSettingsDocument entity, HotelSettingsDto input)
    {
        entity.SettingsPassword = Fit(
            string.IsNullOrWhiteSpace(input.Password) ? "123" : input.Password,
            MaxPasswordLength,
            "123");
        entity.HotelImageDataUrl = string.IsNullOrWhiteSpace(input.HotelImageDataUrl)
            ? null
            : input.HotelImageDataUrl.Trim();
        entity.ProfileJson = string.IsNullOrWhiteSpace(input.ProfileJson) ? "{}" : input.ProfileJson.Trim();
        entity.CurrencyId = Fit(
            string.IsNullOrWhiteSpace(input.CurrencyId) ? "sar" : input.CurrencyId,
            MaxCurrencyIdLength,
            "sar");
        entity.CurrencySymbol = FitNullable(input.CurrencySymbol, MaxCurrencySymbolLength);
        entity.CurrencyCode = FitNullable(input.CurrencyCode, MaxCurrencyCodeLength);
    }

    private static string Fit(string value, int maxLength, string fallback)
    {
        var trimmed = value.Trim();
        if (trimmed.Length == 0)
        {
            return fallback;
        }

        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static string? FitNullable(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static HotelSettingsDto MapToDto(HotelSettingsDocument entity) =>
        new()
        {
            Password = entity.SettingsPassword,
            HotelImageDataUrl = entity.HotelImageDataUrl,
            ProfileJson = entity.ProfileJson,
            CurrencyId = entity.CurrencyId,
            CurrencySymbol = entity.CurrencySymbol,
            CurrencyCode = entity.CurrencyCode,
        };
}
