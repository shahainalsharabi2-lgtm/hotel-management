namespace Modiaf.Al.Arab.Hotel.HotelAuth;

public class HotelLoginResultDto
{
    public bool Success { get; set; }

    public string? Message { get; set; }

    public HotelAppUserPublicDto? User { get; set; }
}
