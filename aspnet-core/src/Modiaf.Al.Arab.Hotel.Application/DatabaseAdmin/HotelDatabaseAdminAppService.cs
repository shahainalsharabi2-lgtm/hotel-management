using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Modiaf.Al.Arab.Hotel.Data;
using Modiaf.Al.Arab.Hotel.Bookings;
using Modiaf.Al.Arab.Hotel.Floors;
using Modiaf.Al.Arab.Hotel.GeneralCodes;
using Modiaf.Al.Arab.Hotel.GuestRegistries;
using Modiaf.Al.Arab.Hotel.HotelSettings;
using Modiaf.Al.Arab.Hotel.HotelUsers;
using Modiaf.Al.Arab.Hotel.IdentityTypes;
using Modiaf.Al.Arab.Hotel.PaymentMethods;
using Modiaf.Al.Arab.Hotel.Rooms;
using Modiaf.Al.Arab.Hotel.RoomTypes;
using Modiaf.Al.Arab.Hotel.UiTranslations;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace Modiaf.Al.Arab.Hotel.DatabaseAdmin;

[AllowAnonymous]
public class HotelDatabaseAdminAppService(
    IRepository<Booking, int> bookingRepository,
    IRepository<Room, int> roomRepository,
    IRepository<Floor, int> floorRepository,
    IRepository<RoomType, int> roomTypeRepository,
    IRepository<IdentityType, int> identityTypeRepository,
    IRepository<GuestRegistry, int> guestRegistryRepository,
    IRepository<PaymentMethod, int> paymentMethodRepository,
    IRepository<GeneralCodeItem, Guid> generalCodeRepository,
    IRepository<UiTranslationsStore, Guid> uiTranslationsRepository,
    IRepository<HotelSettingsDocument, Guid> hotelSettingsRepository,
    IRepository<HotelAppUser, int> hotelAppUserRepository,
    HotelDbMigrationService migrationService)
    : ApplicationService, IHotelDatabaseAdminAppService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<HotelDatabaseBackupDto> CreateBackupAsync()
    {
        try
        {
            var snapshot = new Dictionary<string, object?>
            {
                ["exportedAtUtc"] = DateTime.UtcNow,
                ["bookings"] = await bookingRepository.GetListAsync(),
                ["rooms"] = await roomRepository.GetListAsync(),
                ["floors"] = await floorRepository.GetListAsync(),
                ["roomTypes"] = await roomTypeRepository.GetListAsync(),
                ["identityTypes"] = await identityTypeRepository.GetListAsync(),
                ["guestRegistries"] = await guestRegistryRepository.GetListAsync(),
                ["paymentMethods"] = await paymentMethodRepository.GetListAsync(),
                ["generalCodes"] = await generalCodeRepository.GetListAsync(),
                ["uiTranslations"] = await uiTranslationsRepository.GetListAsync(),
                ["hotelSettings"] = await hotelSettingsRepository.GetListAsync(),
                ["hotelAppUsers"] = await hotelAppUserRepository.GetListAsync(),
            };

            var json = JsonSerializer.Serialize(snapshot, JsonOptions);
            var fileName = $"hotel-backup-{DateTime.UtcNow:yyyyMMdd-HHmmss}.json";

            return new HotelDatabaseBackupDto
            {
                Success = true,
                Message = "تم إنشاء النسخة الاحتياطية.",
                FileName = fileName,
                JsonContent = json,
            };
        }
        catch (Exception ex)
        {
            return new HotelDatabaseBackupDto
            {
                Success = false,
                Message = $"تعذّر إنشاء النسخة الاحتياطية: {ex.Message}",
            };
        }
    }

    public async Task<HotelDatabaseOperationResultDto> UpdateDatabaseAsync()
    {
        try
        {
            await migrationService.MigrateAsync();
            return new HotelDatabaseOperationResultDto
            {
                Success = true,
                Message = "تم تحديث قاعدة البيانات وتطبيق الترحيلات بنجاح.",
            };
        }
        catch (Exception ex)
        {
            return new HotelDatabaseOperationResultDto
            {
                Success = false,
                Message = $"تعذّر تحديث قاعدة البيانات: {ex.Message}",
            };
        }
    }
}
