using System.ComponentModel.DataAnnotations;

namespace Modiaf.Al.Arab.Hotel.HotelAuth;

public class HotelLoginInputDto
{
    [Required]
    [StringLength(64)]
    public string UserName { get; set; } = string.Empty;

    [Required]
    [StringLength(128)]
    public string Password { get; set; } = string.Empty;
}
