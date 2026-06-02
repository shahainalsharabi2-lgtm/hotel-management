using System.ComponentModel.DataAnnotations;

namespace Modiaf.Al.Arab.Hotel.GeneralCodes;

public class GetGeneralCodeListInput
{
    [Required]
    public string Category { get; set; } = string.Empty;
}
