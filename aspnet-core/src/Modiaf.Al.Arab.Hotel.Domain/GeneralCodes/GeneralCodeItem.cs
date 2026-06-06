using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace Modiaf.Al.Arab.Hotel.GeneralCodes;

public class GeneralCodeItem : FullAuditedAggregateRoot<Guid>
{
    public string Category { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? FName { get; set; }

    public string? Description { get; set; }

    /// <summary>رمز الدولة / بادئة الاتصال — مثل +967</summary>
    public string? CountryDialCode { get; set; }

    /// <summary>اسم ملف العلم ضمن assets/flags — مثل ye.svg</summary>
    public string? FlagImageName { get; set; }

    /// <summary>صورة العلم كـ data URL عند الرفع — تُحفظ في قاعدة البيانات</summary>
    public string? FlagImageData { get; set; }

    /// <summary>عدد الغرف — لفئة room-classes</summary>
    public int? RoomCount { get; set; }

    /// <summary>عدد الأسرّة العادية — لفئة room-classes</summary>
    public int? RegularBedCount { get; set; }

    /// <summary>عدد الأسرّة العائلية — لفئة room-classes</summary>
    public int? FamilyBedCount { get; set; }

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
        int displayOrder,
        string? countryDialCode = null,
        string? flagImageName = null,
        string? flagImageData = null,
        int? roomCount = null,
        int? regularBedCount = null,
        int? familyBedCount = null)
        : base(id)
    {
        Category = category;
        Name = name;
        FName = fName;
        Description = description;
        DisplayOrder = displayOrder;
        CountryDialCode = countryDialCode;
        FlagImageName = flagImageName;
        FlagImageData = flagImageData;
        RoomCount = roomCount;
        RegularBedCount = regularBedCount;
        FamilyBedCount = familyBedCount;
    }

    public void SetPrefCategoryExtras(string? countryDialCode, string? flagImageName, string? flagImageData)
    {
        CountryDialCode = countryDialCode;
        FlagImageName = flagImageName;
        FlagImageData = flagImageData;
    }

    public void SetRoomClassCounts(int? roomCount, int? regularBedCount, int? familyBedCount)
    {
        RoomCount = roomCount;
        RegularBedCount = regularBedCount;
        FamilyBedCount = familyBedCount;
    }
}
