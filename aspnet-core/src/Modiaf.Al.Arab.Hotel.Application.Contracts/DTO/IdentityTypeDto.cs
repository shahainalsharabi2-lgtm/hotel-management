using Volo.Abp.Application.Dtos;

namespace Modiaf.Al.Arab.Hotel.IdentityTypes;

public class IdentityTypeDto : EntityDto<int>
{
    public string Name { get; set; }
}

public class CreateUpdateIdentityTypeDto
{
    public string Name { get; set; }
}
