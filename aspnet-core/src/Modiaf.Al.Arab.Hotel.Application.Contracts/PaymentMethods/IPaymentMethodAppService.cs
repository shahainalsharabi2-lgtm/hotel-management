using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Modiaf.Al.Arab.Hotel.PaymentMethods;

public interface IPaymentMethodAppService
    : ICrudAppService<PaymentMethodDto, int, PagedAndSortedResultRequestDto, CreateUpdatePaymentMethodDto>
{
}
