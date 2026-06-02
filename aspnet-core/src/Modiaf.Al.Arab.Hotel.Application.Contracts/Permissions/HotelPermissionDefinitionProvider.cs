using Modiaf.Al.Arab.Hotel.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;

namespace Modiaf.Al.Arab.Hotel.Permissions;

public class HotelPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var myGroup = context.AddGroup(HotelPermissions.GroupName);
        //Define your own permissions here. Example:
        //myGroup.AddPermission(HotelPermissions.MyPermission1, L("Permission:MyPermission1"));
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<HotelResource>(name);
    }
}
