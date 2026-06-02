using Volo.Abp.Domain.Entities.Auditing;

namespace Modiaf.Al.Arab.Hotel.Rooms;

public class Room : FullAuditedEntity<int>
{
    public string RoomNumber { get; set; }
    public string Type { get; set; }
    public string Status { get; set; } // available, occupied, maintenance, dirty
    /// <summary>سبب الصيانة (اختياري) من «الترميزات العامة».</summary>
    public string? MaintenanceReason { get; set; }
    public decimal Price { get; set; }
    public int Floor { get; set; }
    /// <summary>رمز ISO أو معرّف العملة عند إنشاء الغرفة (مثل TRY, YER).</summary>
    public string CurrencyCode { get; set; } = "YER";
    /// <summary>رمز العرض المحفوظ مع الغرفة (مثل ₺, YR).</summary>
    public string CurrencySymbol { get; set; } = "YR";

    public Room()
    {
    }

    public Room(string roomNumber, string type, string status, decimal price, int floor)
    {
        RoomNumber = roomNumber;
        Type = type;
        Status = status;
        Price = price;
        Floor = floor;
    }
}
