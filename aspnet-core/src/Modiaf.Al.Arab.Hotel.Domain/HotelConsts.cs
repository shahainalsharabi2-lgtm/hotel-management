using System;

namespace Modiaf.Al.Arab.Hotel;

public static class HotelConsts
{
    public const string DbTablePrefix = "App";

    public const string DbSchema = null;

    /// <summary>معرف صف تخزين JSON الترجمات اليدوية للواجهة (صف واحد).</summary>
    public static readonly Guid UiTranslationsSingletonId =
        Guid.Parse("6e4c2fd1-a7b9-4013-9c2d-e1bbbbbbbbbb");
}
