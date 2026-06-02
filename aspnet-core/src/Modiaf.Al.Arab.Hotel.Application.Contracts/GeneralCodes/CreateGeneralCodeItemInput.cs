using System.ComponentModel.DataAnnotations;

namespace Modiaf.Al.Arab.Hotel.GeneralCodes;

public class CreateGeneralCodeItemInput : CreateUpdateGeneralCodeItemDto
{
    [Required]
    public string Category { get; set; } = string.Empty;
}
