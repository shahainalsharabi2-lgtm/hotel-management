using System;
using Volo.Abp.Application.Dtos;

namespace Modiaf.Al.Arab.Hotel.Bookings;

public class BookingDto : EntityDto<int>
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
    public string Status { get; set; }
    public string CurrencyCode { get; set; }
    public string CurrencySymbol { get; set; }
    public string Guest_Notes { get; set; }
    public bool Booking_Confirmed { get; set; }
    public string Booking_Source { get; set; }

    /// <summary>آخر تحديث للحجز؛ يُعرض كوقت إلغاء تقريبي عند الحالة «ملغى».</summary>
    public DateTime? LastModificationTime { get; set; }
}

public class CreateUpdateBookingDto
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
    public string Status { get; set; }
    public string CurrencyCode { get; set; }
    public string CurrencySymbol { get; set; }
    public string Guest_Notes { get; set; } = string.Empty;
    public bool Booking_Confirmed { get; set; } = true;
    public string Booking_Source { get; set; } = "direct";
}
