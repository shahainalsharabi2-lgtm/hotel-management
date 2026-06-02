using System;
using Volo.Abp.Domain.Entities;

namespace Modiaf.Al.Arab.Hotel.UiTranslations;

/// <summary>
/// صف واحد: JSON للترجمات اليدوية (تركية، صينية، …). المرجع العربي في الواجهة.
/// </summary>
public class UiTranslationsStore : Entity<Guid>
{
    public virtual string PayloadJson { get; protected set; } = "{}";

    protected UiTranslationsStore()
    {
    }

    public UiTranslationsStore(Guid id)
    {
        Id = id;
    }

    public void SetPayload(string? json)
    {
        PayloadJson = string.IsNullOrWhiteSpace(json) ? "{}" : json!;
    }
}
