using Volo.Abp.Settings;

namespace Modiaf.Al.Arab.Hotel.Settings;

public class HotelSettingDefinitionProvider : SettingDefinitionProvider
{
    public override void Define(ISettingDefinitionContext context)
    {
        //Define your own settings here. Example:
        //context.Add(new SettingDefinition(HotelSettings.MySetting1));
    }
}
