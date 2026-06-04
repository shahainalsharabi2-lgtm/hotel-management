using Volo.Abp.Domain.Entities.Auditing;

namespace Modiaf.Al.Arab.Hotel.Rooms;

public class Room : FullAuditedEntity<int>
{
    public string RoomNumber { get; set; }
    public string Type { get; set; }
    /// <summary>إطلالة الغرفة من «المدخلات» (room-views).</summary>
    public string? RoomView { get; set; }
    /// <summary>تصميم الغرفة من «المدخلات» (room-architecture).</summary>
    public string? RoomArchitecture { get; set; }
    /// <summary>موقع الغرفة من «المدخلات» (room-locations).</summary>
    public string? RoomLocation { get; set; }
    /// <summary>مميزات الغرفة (JSON array) من «المدخلات» (room-features).</summary>
    public string? RoomFeatures { get; set; }
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
