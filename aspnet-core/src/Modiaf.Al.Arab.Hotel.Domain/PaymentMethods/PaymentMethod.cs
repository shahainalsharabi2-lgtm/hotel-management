using Volo.Abp.Domain.Entities;

namespace Modiaf.Al.Arab.Hotel.PaymentMethods;

public class PaymentMethod : Entity<int>
{
    public string Name { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }

    protected PaymentMethod()
    {
    }

    public PaymentMethod(string name, int displayOrder)
    {
        Name = name;
        DisplayOrder = displayOrder;
    }
}
