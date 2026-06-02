using Volo.Abp.Domain.Entities;

namespace Modiaf.Al.Arab.Hotel.IdentityTypes;

public class IdentityType : Entity<int>
{
    public string Name { get; set; }

    public IdentityType()
    {
    }

    public IdentityType(string name)
    {
        Name = name;
    }
}
