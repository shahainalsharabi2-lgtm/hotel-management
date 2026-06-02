using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace Modiaf.Al.Arab.Hotel.Bookings;

public class Booking : FullAuditedEntity<int>
{
    public string First_Name { get; set; }
    public string Last_Name { get; set; }
    public string Phone_Number { get; set; }
    public decimal Payment_Amount { get; set; }
    public string Id_Number { get; set; }
    public string Id_Type { get; set; }
    public string Room_Type { get; set; }
    public string Room_Number { get; set; }
    public string Floor { get; set; }
    public DateTime? Booking_Date { get; set; }
    public string Booking_Time { get; set; }
    public DateTime? BookingDateTime { get; set; }
    public string Payment_Method { get; set; }
    public int People_Count { get; set; }
    public int Adults_Count { get; set; }
    public int Children_Count { get; set; }
    public string Invoice_Number { get; set; }
    public int Stay_Days { get; set; }
    public decimal Total_Price { get; set; }
    public decimal Remaining_Amount { get; set; }
    public string Status { get; set; } // active, checked_out, cancelled
    public string CurrencyCode { get; set; } = "YER";
    public string CurrencySymbol { get; set; } = "YR";
    public string Guest_Notes { get; set; }
    /// <summary>مؤكد / غير مؤكد</summary>
    public bool Booking_Confirmed { get; set; } = true;
    /// <summary>direct | electronic | company | institution | employee</summary>
    public string Booking_Source { get; set; } = "direct";

    public Booking()
    {
    }
}
