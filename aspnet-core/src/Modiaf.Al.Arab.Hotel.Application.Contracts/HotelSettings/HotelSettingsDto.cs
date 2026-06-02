namespace Modiaf.Al.Arab.Hotel.HotelSettings;

public class HotelSettingsDto
{
    public string Password { get; set; } = "123";

    public string? HotelImageDataUrl { get; set; }

    public string ProfileJson { get; set; } = "{}";

    public string CurrencyId { get; set; } = "sar";

    public string? CurrencySymbol { get; set; }

    public string? CurrencyCode { get; set; }
}
