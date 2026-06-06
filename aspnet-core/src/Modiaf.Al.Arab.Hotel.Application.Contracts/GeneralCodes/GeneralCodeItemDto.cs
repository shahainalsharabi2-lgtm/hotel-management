using System;
using System.ComponentModel.DataAnnotations;

namespace Modiaf.Al.Arab.Hotel.GeneralCodes;

public class GeneralCodeItemDto
{
    public Guid Id { get; set; }

    [Required]
    public string Category { get; set; } = string.Empty;

    [Required]
    [StringLength(256)]
    public string Name { get; set; } = string.Empty;

    [StringLength(256)]
    public string? FName { get; set; }

    [StringLength(1024)]
    public string? Description { get; set; }

    [StringLength(32)]
    public string? CountryDialCode { get; set; }

    [StringLength(256)]
    public string? FlagImageName { get; set; }

    public string? FlagImageData { get; set; }

    public int? RoomCount { get; set; }

    public int? RegularBedCount { get; set; }

    public int? FamilyBedCount { get; set; }

    public int DisplayOrder { get; set; }
}
