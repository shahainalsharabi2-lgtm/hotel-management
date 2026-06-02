using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace Modiaf.Al.Arab.Hotel.GeneralCodes;

public class GeneralCodeItem : FullAuditedAggregateRoot<Guid>
{
    public string Category { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? FName { get; set; }

    public string? Description { get; set; }

    public int DisplayOrder { get; set; }

    protected GeneralCodeItem()
    {
    }

    public GeneralCodeItem(
        Guid id,
        string category,
        string name,
        string? fName,
        string? description,
        int displayOrder)
        : base(id)
    {
        Category = category;
        Name = name;
        FName = fName;
        Description = description;
        DisplayOrder = displayOrder;
    }
}
