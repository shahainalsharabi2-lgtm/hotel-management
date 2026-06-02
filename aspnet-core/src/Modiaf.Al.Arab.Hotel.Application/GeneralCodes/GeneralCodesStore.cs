using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;

namespace Modiaf.Al.Arab.Hotel.GeneralCodes;

public class GeneralCodesStore(IRepository<GeneralCodeItem, Guid> repository)
    : IGeneralCodesStore, ITransientDependency
{

    public async Task<IReadOnlyList<GeneralCodeItemDto>> GetByCategoryAsync(
        string category,
        CancellationToken cancellationToken = default)
    {
        var canonicalCategory = ResolveCategory(category);
        var list = await repository.GetListAsync(
            x => x.Category == canonicalCategory,
            cancellationToken: cancellationToken);

        return list
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Name)
            .Select(MapToDto)
            .ToList();
    }

    public async Task<GeneralCodeItemDto> CreateAsync(
        string category,
        CreateUpdateGeneralCodeItemDto input,
        CancellationToken cancellationToken = default)
    {
        var canonicalCategory = ResolveCategory(category);
        var item = new GeneralCodeItem(
            Guid.NewGuid(),
            canonicalCategory,
            Fit(input.Name, 256),
            FitNullable(input.FName, 256),
            FitNullable(input.Description, 1024),
            input.DisplayOrder);

        await repository.InsertAsync(item, autoSave: true, cancellationToken);
        return MapToDto(item);
    }

    public async Task<GeneralCodeItemDto> UpdateAsync(
        Guid id,
        CreateUpdateGeneralCodeItemDto input,
        CancellationToken cancellationToken = default)
    {
        var item = await repository.FindAsync(id, cancellationToken: cancellationToken)
            ?? throw new UserFriendlyException($"General code item '{id}' was not found.");

        item.Name = Fit(input.Name, 256);
        item.FName = FitNullable(input.FName, 256);
        item.Description = FitNullable(input.Description, 1024);
        item.DisplayOrder = input.DisplayOrder;

        await repository.UpdateAsync(item, autoSave: true, cancellationToken);
        return MapToDto(item);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await repository.FindAsync(id, cancellationToken: cancellationToken)
            ?? throw new UserFriendlyException($"General code item '{id}' was not found.");

        await repository.DeleteAsync(item, autoSave: true, cancellationToken);
    }

    private static string ResolveCategory(string category)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            throw new UserFriendlyException($"Unknown general code category '{category}'.");
        }

        var match = GeneralCodesCategories.All.FirstOrDefault(
            c => string.Equals(c, category, StringComparison.OrdinalIgnoreCase));

        if (match is null)
        {
            throw new UserFriendlyException($"Unknown general code category '{category}'.");
        }

        return match;
    }

    private static string Fit(string value, int maxLength)
    {
        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static string? FitNullable(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static GeneralCodeItemDto MapToDto(GeneralCodeItem item) =>
        new()
        {
            Id = item.Id,
            Category = item.Category,
            Name = item.Name,
            FName = item.FName,
            Description = item.Description,
            DisplayOrder = item.DisplayOrder,
        };
}
