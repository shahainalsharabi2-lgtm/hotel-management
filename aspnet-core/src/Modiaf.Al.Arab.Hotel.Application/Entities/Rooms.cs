using Modiaf.Al.Arab.Hotel.Rooms;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;
using Microsoft.AspNetCore.Authorization;
using System.Linq;
using System.Threading.Tasks;

namespace Modiaf.Al.Arab.Hotel.Rooms;

[AllowAnonymous]
public class RoomAppService(IRepository<Room, int> repository)
    : CrudAppService<Room, RoomDto, int, PagedAndSortedResultRequestDto, CreateUpdateRoomDto>(repository),
        IRoomAppService
{
    protected override RoomDto MapToGetOutputDto(Room entity)
    {
        return new RoomDto
        {
            Id = entity.Id,
            RoomNumber = entity.RoomNumber,
            Type = entity.Type,
            Status = entity.Status,
            MaintenanceReason = entity.MaintenanceReason,
            Price = entity.Price,
            Floor = entity.Floor,
            CurrencyCode = entity.CurrencyCode,
            CurrencySymbol = entity.CurrencySymbol,
        };
    }

    protected override Room MapToEntity(CreateUpdateRoomDto createInput)
    {
        var room = new Room(
            createInput.RoomNumber,
            string.IsNullOrWhiteSpace(createInput.Type) ? "غرفة عادية" : createInput.Type,
            string.IsNullOrWhiteSpace(createInput.Status) ? "available" : createInput.Status,
            createInput.Price,
            createInput.Floor);
        room.MaintenanceReason = string.IsNullOrWhiteSpace(createInput.MaintenanceReason)
            ? null
            : createInput.MaintenanceReason.Trim();
        ApplyCurrency(createInput, room);
        return room;
    }

    protected override void MapToEntity(CreateUpdateRoomDto updateInput, Room entity)
    {
        entity.RoomNumber = updateInput.RoomNumber;
        entity.Type = string.IsNullOrWhiteSpace(updateInput.Type) ? "غرفة عادية" : updateInput.Type;
        entity.Status = string.IsNullOrWhiteSpace(updateInput.Status) ? "available" : updateInput.Status;
        entity.MaintenanceReason = string.IsNullOrWhiteSpace(updateInput.MaintenanceReason)
            ? null
            : updateInput.MaintenanceReason.Trim();
        entity.Price = updateInput.Price;
        entity.Floor = updateInput.Floor;
        ApplyCurrency(updateInput, entity);
    }

    public async Task<ResetRoomStatusesResultDto> ResetAllStatusesAsync(ResetRoomStatusesInput input)
    {
        input ??= new ResetRoomStatusesInput();
        var target = NormalizeTargetStatus(input.TargetStatus);
        var rooms = await Repository.GetListAsync();
        var toUpdate = rooms.Where(r =>
        {
            if (r.Status == target)
            {
                return false;
            }
            if (!input.PreserveMaintenanceAndSuspended)
            {
                return true;
            }
            var s = (r.Status ?? "").Trim().ToLowerInvariant();
            return s is not ("maintenance" or "maint" or "suspended" or "stopped" or "halt");
        }).ToList();

        foreach (var room in toUpdate)
        {
            room.Status = target;
        }

        if (toUpdate.Count > 0)
        {
            await Repository.UpdateManyAsync(toUpdate);
        }

        return new ResetRoomStatusesResultDto
        {
            UpdatedCount = toUpdate.Count,
            TotalRooms = rooms.Count,
            TargetStatus = target,
        };
    }

    private static string NormalizeTargetStatus(string? status)
    {
        var v = (status ?? "available").Trim().ToLowerInvariant();
        return v switch
        {
            "occupied" or "occ" => "occupied",
            "dirty" => "dirty",
            "maintenance" or "maint" => "maintenance",
            "suspended" or "stopped" or "halt" => "suspended",
            _ => "available",
        };
    }

    private static void ApplyCurrency(CreateUpdateRoomDto input, Room entity)
    {
        if (!string.IsNullOrWhiteSpace(input.CurrencyCode))
        {
            entity.CurrencyCode = input.CurrencyCode.Trim();
        }
        else if (string.IsNullOrWhiteSpace(entity.CurrencyCode))
        {
            entity.CurrencyCode = "YER";
        }

        if (!string.IsNullOrWhiteSpace(input.CurrencySymbol))
        {
            entity.CurrencySymbol = input.CurrencySymbol.Trim();
        }
        else if (string.IsNullOrWhiteSpace(entity.CurrencySymbol))
        {
            entity.CurrencySymbol = "YR";
        }
    }
}
