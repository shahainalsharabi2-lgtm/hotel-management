using Modiaf.Al.Arab.Hotel.Bookings;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;
using Microsoft.AspNetCore.Authorization;

namespace Modiaf.Al.Arab.Hotel.Bookings;

[AllowAnonymous]
public class BookingAppService(IRepository<Booking, int> repository)
    : CrudAppService<Booking, BookingDto, int, PagedAndSortedResultRequestDto, CreateUpdateBookingDto>(repository),
        IBookingAppService
{
    protected override BookingDto MapToGetOutputDto(Booking entity)
    {
        return new BookingDto
        {
            Id = entity.Id,
            First_Name = entity.First_Name,
            Last_Name = entity.Last_Name,
            Phone_Number = entity.Phone_Number,
            Payment_Amount = entity.Payment_Amount,
            Id_Number = entity.Id_Number,
            Id_Type = entity.Id_Type,
            Room_Type = entity.Room_Type,
            Room_Number = entity.Room_Number,
            Floor = entity.Floor,
            Booking_Date = entity.Booking_Date,
            Booking_Time = entity.Booking_Time,
            BookingDateTime = entity.BookingDateTime,
            Payment_Method = entity.Payment_Method,
            People_Count = entity.People_Count,
            Adults_Count = entity.Adults_Count,
            Children_Count = entity.Children_Count,
            Invoice_Number = entity.Invoice_Number,
            Stay_Days = entity.Stay_Days,
            Total_Price = entity.Total_Price,
            Remaining_Amount = entity.Remaining_Amount,
            Status = entity.Status,
            Guest_Notes = entity.Guest_Notes,
            Booking_Confirmed = entity.Booking_Confirmed,
            Booking_Source = entity.Booking_Source,
            CurrencyCode = entity.CurrencyCode,
            CurrencySymbol = entity.CurrencySymbol,
            LastModificationTime = entity.LastModificationTime
        };
    }

    protected override Booking MapToEntity(CreateUpdateBookingDto createInput)
    {
        var booking = new Booking
        {
            First_Name = createInput.First_Name,
            Last_Name = createInput.Last_Name,
            Phone_Number = createInput.Phone_Number,
            Payment_Amount = createInput.Payment_Amount,
            Id_Number = createInput.Id_Number,
            Id_Type = createInput.Id_Type,
            Room_Type = createInput.Room_Type,
            Room_Number = createInput.Room_Number,
            Floor = createInput.Floor,
            Booking_Date = createInput.Booking_Date,
            Booking_Time = createInput.Booking_Time,
            BookingDateTime = createInput.BookingDateTime,
            Payment_Method = createInput.Payment_Method,
            People_Count = createInput.People_Count,
            Adults_Count = createInput.Adults_Count,
            Children_Count = createInput.Children_Count,
            Invoice_Number = createInput.Invoice_Number,
            Stay_Days = createInput.Stay_Days,
            Total_Price = createInput.Total_Price,
            Remaining_Amount = createInput.Remaining_Amount,
            Status = string.IsNullOrWhiteSpace(createInput.Status) ? "active" : createInput.Status.Trim(),
            Guest_Notes = createInput.Guest_Notes ?? string.Empty,
            Booking_Confirmed = createInput.Booking_Confirmed,
            Booking_Source = NormalizeBookingSource(createInput.Booking_Source),
        };
        ApplyCurrency(createInput, booking);
        return booking;
    }

    protected override void MapToEntity(CreateUpdateBookingDto updateInput, Booking entity)
    {
        entity.First_Name = updateInput.First_Name;
        entity.Last_Name = updateInput.Last_Name;
        entity.Phone_Number = updateInput.Phone_Number;
        entity.Payment_Amount = updateInput.Payment_Amount;
        entity.Id_Number = updateInput.Id_Number;
        entity.Id_Type = updateInput.Id_Type;
        entity.Room_Type = updateInput.Room_Type;
        entity.Room_Number = updateInput.Room_Number;
        entity.Floor = updateInput.Floor;
        entity.Booking_Date = updateInput.Booking_Date;
        entity.Booking_Time = updateInput.Booking_Time;
        entity.BookingDateTime = updateInput.BookingDateTime;
        entity.Payment_Method = updateInput.Payment_Method;
        entity.People_Count = updateInput.People_Count;
        entity.Adults_Count = updateInput.Adults_Count;
        entity.Children_Count = updateInput.Children_Count;
        entity.Invoice_Number = updateInput.Invoice_Number;
        entity.Stay_Days = updateInput.Stay_Days;
        entity.Total_Price = updateInput.Total_Price;
        entity.Remaining_Amount = updateInput.Remaining_Amount;
        entity.Status = string.IsNullOrWhiteSpace(updateInput.Status) ? "active" : updateInput.Status.Trim();
        entity.Guest_Notes = updateInput.Guest_Notes ?? string.Empty;
        entity.Booking_Confirmed = updateInput.Booking_Confirmed;
        entity.Booking_Source = NormalizeBookingSource(updateInput.Booking_Source);
        ApplyCurrency(updateInput, entity);
    }

    private static string NormalizeBookingSource(string source)
    {
        var s = (source ?? "").Trim().ToLowerInvariant();
        return s switch
        {
            "electronic" or "company" or "institution" or "employee" => s,
            _ => "direct",
        };
    }

    private static void ApplyCurrency(CreateUpdateBookingDto input, Booking entity)
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
