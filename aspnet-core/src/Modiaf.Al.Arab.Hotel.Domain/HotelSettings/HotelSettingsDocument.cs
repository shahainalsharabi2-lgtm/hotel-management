using System;
using Volo.Abp.Domain.Entities;

namespace Modiaf.Al.Arab.Hotel.HotelSettings;

public class HotelSettingsDocument : Entity<Guid>
{
    public static readonly Guid SingletonId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    public string SettingsPassword { get; set; } = "123";

    public string? HotelImageDataUrl { get; set; }

    public string ProfileJson { get; set; } = "{}";

    public string CurrencyId { get; set; } = "sar";

    public string? CurrencySymbol { get; set; }

    public string? CurrencyCode { get; set; }

    protected HotelSettingsDocument()
    {
    }

    public HotelSettingsDocument(Guid id)
        : base(id)
    {
    }
}
