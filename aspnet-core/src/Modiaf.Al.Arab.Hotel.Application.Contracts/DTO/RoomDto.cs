using Volo.Abp.Application.Dtos;

namespace Modiaf.Al.Arab.Hotel.Rooms;

public class RoomDto : EntityDto<int>
{
    public string RoomNumber { get; set; }
    public string Type { get; set; }
    public string? RoomView { get; set; }
    public string Status { get; set; }
    public string? MaintenanceReason { get; set; }
    public decimal Price { get; set; }
    public int Floor { get; set; }
    public string CurrencyCode { get; set; }
    public string CurrencySymbol { get; set; }
}

public class CreateUpdateRoomDto
{
    public string RoomNumber { get; set; }
    public string Type { get; set; }
    public string? RoomView { get; set; }
    public string Status { get; set; }
    public string? MaintenanceReason { get; set; }
    public decimal Price { get; set; }
    public int Floor { get; set; }
    public string CurrencyCode { get; set; }
    public string CurrencySymbol { get; set; }
}
