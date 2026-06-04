using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;

namespace Modiaf.Al.Arab.Hotel.HotelUsers;

public class HotelAppUserDataSeedContributor(IRepository<HotelAppUser, int> repository)
    : IDataSeedContributor, ITransientDependency
{
    public const string DefaultAdminUserName = "123";
    public const string DefaultAdminPassword = "123";

    public async Task SeedAsync(DataSeedContext context)
    {
        var matches = await repository.GetListAsync(
            x => x.UserName.ToLower() == DefaultAdminUserName);
        var user = matches.FirstOrDefault();

        if (user == null)
        {
            await repository.InsertAsync(
                new HotelAppUser(
                    "مدير",
                    "النظام",
                    DefaultAdminUserName,
                    string.Empty,
                    string.Empty,
                    DefaultAdminPassword,
                    HotelUserRoles.Manager),
                autoSave: true);
            return;
        }

        var changed = false;
        if (!string.Equals(user.Password, DefaultAdminPassword, StringComparison.Ordinal))
        {
            user.Password = DefaultAdminPassword;
            changed = true;
        }

        if (!string.Equals(user.Role, HotelUserRoles.Manager, StringComparison.Ordinal))
        {
            user.Role = HotelUserRoles.Manager;
            changed = true;
        }

        if (changed)
        {
            await repository.UpdateAsync(user, autoSave: true);
        }
    }
}
