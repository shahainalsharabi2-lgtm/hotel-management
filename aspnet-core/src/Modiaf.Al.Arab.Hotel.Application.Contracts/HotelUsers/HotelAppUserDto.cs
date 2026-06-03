using Volo.Abp.Application.Dtos;

namespace Modiaf.Al.Arab.Hotel.HotelUsers;

public class HotelAppUserDto : EntityDto<int>
{
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;
}
