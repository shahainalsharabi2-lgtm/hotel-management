using System.ComponentModel.DataAnnotations;

namespace Modiaf.Al.Arab.Hotel.HotelUsers;

public class CreateUpdateHotelAppUserDto
{
    [Required]
    [StringLength(128)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(128)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [StringLength(64)]
    public string UserName { get; set; } = string.Empty;

    [StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [StringLength(32)]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(128)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [StringLength(32)]
    public string Role { get; set; } = HotelUserRoles.Default;
}
