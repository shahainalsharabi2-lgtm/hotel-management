using System.ComponentModel.DataAnnotations;

namespace Modiaf.Al.Arab.Hotel.GeneralCodes;

public class CreateUpdateGeneralCodeItemDto
{
    [Required]
    [StringLength(256)]
    public string Name { get; set; } = string.Empty;

    [StringLength(256)]
    public string? FName { get; set; }

    [StringLength(1024)]
    public string? Description { get; set; }

    public int DisplayOrder { get; set; }
}
