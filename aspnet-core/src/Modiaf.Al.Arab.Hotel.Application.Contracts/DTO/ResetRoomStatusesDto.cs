namespace Modiaf.Al.Arab.Hotel.Rooms;

public class ResetRoomStatusesInput
{
    /// <summary>الحالة المستهدفة: available, dirty, maintenance, occupied, suspended</summary>
    public string TargetStatus { get; set; } = "available";

    /// <summary>إن true: لا تُغيَّر غرف الصيانة أو الموقوفة</summary>
    public bool PreserveMaintenanceAndSuspended { get; set; } = true;
}

public class ResetRoomStatusesResultDto
{
    public int UpdatedCount { get; set; }
    public int TotalRooms { get; set; }
    public string TargetStatus { get; set; } = "available";
}
