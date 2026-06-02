using System.ComponentModel.DataAnnotations;

namespace Modiaf.Al.Arab.Hotel.PaymentMethods;

public class CreateUpdatePaymentMethodDto
{
    [Required]
    [StringLength(128)]
    public string Name { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }
}
