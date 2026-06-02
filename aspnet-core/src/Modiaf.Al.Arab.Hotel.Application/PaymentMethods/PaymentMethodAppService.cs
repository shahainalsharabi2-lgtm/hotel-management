using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace Modiaf.Al.Arab.Hotel.PaymentMethods;

[AllowAnonymous]
public class PaymentMethodAppService(IRepository<PaymentMethod, int> repository)
    : CrudAppService<PaymentMethod, PaymentMethodDto, int, PagedAndSortedResultRequestDto, CreateUpdatePaymentMethodDto>(repository),
        IPaymentMethodAppService
{

    protected override PaymentMethodDto MapToGetOutputDto(PaymentMethod entity)
    {
        return new PaymentMethodDto
        {
            Id = entity.Id,
            Name = entity.Name,
            DisplayOrder = entity.DisplayOrder,
        };
    }

    protected override PaymentMethod MapToEntity(CreateUpdatePaymentMethodDto createInput)
    {
        return new PaymentMethod(createInput.Name.Trim(), createInput.DisplayOrder);
    }

    protected override void MapToEntity(CreateUpdatePaymentMethodDto updateInput, PaymentMethod entity)
    {
        entity.Name = updateInput.Name.Trim();
        entity.DisplayOrder = updateInput.DisplayOrder;
    }
}
