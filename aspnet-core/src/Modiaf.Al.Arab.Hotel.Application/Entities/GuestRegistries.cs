using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace Modiaf.Al.Arab.Hotel.GuestRegistries;

[AllowAnonymous]
public class GuestRegistryAppService(IRepository<GuestRegistry, int> repository)
    : CrudAppService<GuestRegistry, GuestRegistryDto, int, PagedAndSortedResultRequestDto, CreateUpdateGuestRegistryDto>(repository),
        IGuestRegistryAppService
{
    public override async Task<GuestRegistryDto> CreateAsync(CreateUpdateGuestRegistryDto input)
    {
        return await SaveProfileAsync(input);
    }

    public override async Task<GuestRegistryDto> UpdateAsync(int id, CreateUpdateGuestRegistryDto input)
    {
        input.Id = id;
        return await SaveProfileAsync(input);
    }

    public async Task<GuestRegistryDto> SaveProfileAsync(CreateUpdateGuestRegistryDto input)
    {
        GuestRegistry entity;

        if (input.Id.HasValue && input.Id.Value > 0)
        {
            entity = await Repository.GetAsync(input.Id.Value);
            ApplyInput(input, entity);
            await Repository.UpdateAsync(entity);
            return MapToGetOutputDto(entity);
        }

        var idNumber = Normalize(input.Id_Number);
        if (!string.IsNullOrEmpty(idNumber))
        {
            var queryable = await Repository.GetQueryableAsync();
            var existing = queryable.FirstOrDefault(g => g.Id_Number == idNumber);
            if (existing != null)
            {
                ApplyInput(input, existing);
                await Repository.UpdateAsync(existing);
                return MapToGetOutputDto(existing);
            }
        }

        entity = MapToEntity(input);
        await Repository.InsertAsync(entity);
        return MapToGetOutputDto(entity);
    }

    protected override GuestRegistryDto MapToGetOutputDto(GuestRegistry entity)
    {
        return new GuestRegistryDto
        {
            Id = entity.Id,
            First_Name = entity.First_Name,
            Middle_Name = entity.Middle_Name,
            Last_Name = entity.Last_Name,
            Phone_Number = entity.Phone_Number,
            Gender = entity.Gender,
            Nationality = entity.Nationality,
            Country = entity.Country,
            Birth_Date = entity.Birth_Date?.ToString("yyyy-MM-dd") ?? string.Empty,
            Id_Type = entity.Id_Type,
            Id_Issuing_Country = entity.Id_Issuing_Country,
            Id_Number = entity.Id_Number,
            LastModificationTime = entity.LastModificationTime,
        };
    }

    protected override GuestRegistry MapToEntity(CreateUpdateGuestRegistryDto createInput)
    {
        var entity = new GuestRegistry();
        ApplyInput(createInput, entity);
        return entity;
    }

    protected override void MapToEntity(CreateUpdateGuestRegistryDto updateInput, GuestRegistry entity)
    {
        ApplyInput(updateInput, entity);
    }

    private static void ApplyInput(CreateUpdateGuestRegistryDto input, GuestRegistry entity)
    {
        entity.First_Name = Normalize(input.First_Name);
        entity.Middle_Name = Normalize(input.Middle_Name);
        entity.Last_Name = Normalize(input.Last_Name);
        entity.Phone_Number = Normalize(input.Phone_Number);
        entity.Gender = Normalize(input.Gender);
        entity.Nationality = Normalize(input.Nationality);
        entity.Country = Normalize(input.Country);
        entity.Birth_Date = ParseBirthDate(input.Birth_Date);
        entity.Id_Type = Normalize(input.Id_Type);
        entity.Id_Issuing_Country = Normalize(input.Id_Issuing_Country);
        entity.Id_Number = Normalize(input.Id_Number);
    }

    private static string Normalize(string value) => (value ?? string.Empty).Trim();

    private static DateTime? ParseBirthDate(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return DateTime.TryParse(value, out var dt) ? dt.Date : null;
    }
}
