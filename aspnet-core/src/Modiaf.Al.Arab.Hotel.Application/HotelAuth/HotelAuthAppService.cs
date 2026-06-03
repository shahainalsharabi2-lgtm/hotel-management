using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace Modiaf.Al.Arab.Hotel.HotelAuth;

[AllowAnonymous]
public class HotelAuthAppService(IRepository<HotelUsers.HotelAppUser, int> repository)
    : ApplicationService, IHotelAuthAppService
{
    public async Task<HotelLoginResultDto> LoginAsync(HotelLoginInputDto input)
    {
        var userName = (input.UserName ?? string.Empty).Trim();
        var password = input.Password ?? string.Empty;

        if (userName.Length == 0 || password.Length == 0)
        {
            return Fail("أدخل اسم المستخدم وكلمة المرور.");
        }

        var matches = await repository.GetListAsync(
            x => x.UserName.ToLower() == userName.ToLower());
        var user = matches.FirstOrDefault();

        if (user == null || !string.Equals(user.Password, password, StringComparison.Ordinal))
        {
            return Fail("اسم المستخدم أو كلمة المرور غير صحيحة.");
        }

        return new HotelLoginResultDto
        {
            Success = true,
            User = new HotelAppUserPublicDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                UserName = user.UserName,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
            },
        };
    }

    private static HotelLoginResultDto Fail(string message) =>
        new() { Success = false, Message = message };
}
