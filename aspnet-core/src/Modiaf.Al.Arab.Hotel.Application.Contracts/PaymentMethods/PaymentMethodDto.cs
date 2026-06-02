using Volo.Abp.Application.Dtos;

namespace Modiaf.Al.Arab.Hotel.PaymentMethods;

public class PaymentMethodDto : EntityDto<int>
{
    public string Name { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }
}
