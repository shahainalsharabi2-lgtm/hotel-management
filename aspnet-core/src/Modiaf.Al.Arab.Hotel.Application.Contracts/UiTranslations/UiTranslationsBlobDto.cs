using System.ComponentModel.DataAnnotations;

namespace Modiaf.Al.Arab.Hotel.UiTranslations;

public class UiTranslationsBlobDto
{
    /// <summary>
    /// JSON مدمج لكل اللغات (يُجمَّع من <c>UiTranslations/ar.json</c> و <c>tr.json</c> و <c>zh-Hans.json</c> على القرص).
    /// المخطط: {"sidebarNav":{"ar":{...},"tr":{...}},"brandSubtitle":{...},"chrome":{...},"screenCopy":{...}}
    /// </summary>
    [Required]
    public string PayloadJson { get; set; } = "{}";
}
