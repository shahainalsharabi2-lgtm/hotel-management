using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace Modiaf.Al.Arab.Hotel.HotelUsers;

[AllowAnonymous]
public class HotelAppUserAppService(IRepository<HotelAppUser, int> repository)
    : CrudAppService<HotelAppUser, HotelAppUserDto, int, PagedAndSortedResultRequestDto, CreateUpdateHotelAppUserDto>(
        repository),
        IHotelAppUserAppService
{
    protected override async Task<IQueryable<HotelAppUser>> CreateFilteredQueryAsync(
        PagedAndSortedResultRequestDto input)
    {
        var query = await ReadOnlyRepository.GetQueryableAsync();
        return query.OrderBy(x => x.UserName);
    }

    protected override HotelAppUserDto MapToGetOutputDto(HotelAppUser entity) =>
        new()
        {
            Id = entity.Id,
            FirstName = entity.FirstName,
            LastName = entity.LastName,
            UserName = entity.UserName,
            Email = entity.Email,
            PhoneNumber = entity.PhoneNumber,
            Password = entity.Password,
            Role = entity.Role,
        };

    protected override HotelAppUser MapToEntity(CreateUpdateHotelAppUserDto createInput) =>
        new(
            createInput.FirstName.Trim(),
            createInput.LastName.Trim(),
            createInput.UserName.Trim(),
            (createInput.Email ?? string.Empty).Trim(),
            (createInput.PhoneNumber ?? string.Empty).Trim(),
            createInput.Password,
            createInput.Role);

    protected override void MapToEntity(CreateUpdateHotelAppUserDto updateInput, HotelAppUser entity)
    {
        entity.FirstName = updateInput.FirstName.Trim();
        entity.LastName = updateInput.LastName.Trim();
        entity.UserName = updateInput.UserName.Trim();
        entity.Email = (updateInput.Email ?? string.Empty).Trim();
        entity.PhoneNumber = (updateInput.PhoneNumber ?? string.Empty).Trim();
        entity.Role = HotelUserRoles.Normalize(updateInput.Role);
        if (!string.IsNullOrWhiteSpace(updateInput.Password))
        {
            entity.Password = updateInput.Password;
        }
    }
}
