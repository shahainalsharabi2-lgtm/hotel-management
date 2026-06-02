using System.Collections.Generic;

namespace Modiaf.Al.Arab.Hotel.UiTranslations;

public class UiTranslationsLocaleFileDto
{
    public Dictionary<string, string>? SidebarNav { get; set; }

    public string? BrandSubtitle { get; set; }

    public Dictionary<string, string>? Chrome { get; set; }

    public Dictionary<string, Dictionary<string, string>>? ScreenCopy { get; set; }
}
