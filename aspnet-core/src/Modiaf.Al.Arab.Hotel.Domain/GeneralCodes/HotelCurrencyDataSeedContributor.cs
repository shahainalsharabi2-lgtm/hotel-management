using System;
using System.Threading.Tasks;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;

namespace Modiaf.Al.Arab.Hotel.GeneralCodes;

public class HotelCurrencyDataSeedContributor(IRepository<GeneralCodeItem, Guid> repository)
    : IDataSeedContributor, ITransientDependency
{
    private static readonly (string Code, string NameAr, string Symbol, string Flag, string Engrave, string NameEn, int Order)[] Defaults =
    [
        ("YER", "ريال يمني", "YR", "🇾🇪", "اليمن", "Yemeni Rial", 1),
        ("SAR", "ريال سعودي", "ر.س", "🇸🇦", "السعودية", "Saudi Riyal", 2),
        ("USD", "دولار أمريكي", "$", "🇺🇸", "أمريكا", "US Dollar", 3),
        ("EUR", "يورو", "€", "🇪🇺", "أوروبا", "Euro", 4),
        ("AED", "درهم إماراتي", "د.إ", "🇦🇪", "الإمارات", "UAE Dirham", 5),
        ("TRY", "ليرة تركية", "₺", "🇹🇷", "تركيا", "Turkish Lira", 6),
        ("CNY", "يوان صيني", "¥", "🇨🇳", "الصين", "Chinese Yuan", 7),
        ("IDR", "روبية إندونيسية", "Rp", "🇮🇩", "إندونيسيا", "Indonesian Rupiah", 8),
    ];

    public async Task SeedAsync(DataSeedContext context)
    {
        var existing = await repository.GetListAsync(x => x.Category == GeneralCodesCategories.HotelCurrency);
        if (existing.Count > 0)
        {
            return;
        }

        foreach (var row in Defaults)
        {
            var description = EncodeCurrencyDescription(row.Symbol, row.Flag, row.Engrave, row.NameEn);
            await repository.InsertAsync(
                new GeneralCodeItem(
                    Guid.NewGuid(),
                    GeneralCodesCategories.HotelCurrency,
                    row.Code,
                    row.NameAr,
                    description,
                    row.Order),
                autoSave: true);
        }
    }

    private static string EncodeCurrencyDescription(string symbol, string flag, string engrave, string nameEn)
    {
        var compact = new System.Text.StringBuilder("__curr__:{");
        compact.Append("\"sym\":\"").Append(EscapeJson(symbol)).Append('"');
        compact.Append(",\"flag\":\"").Append(EscapeJson(flag)).Append('"');
        compact.Append(",\"e\":\"").Append(EscapeJson(engrave)).Append('"');
        compact.Append(",\"en\":\"").Append(EscapeJson(nameEn)).Append('"');
        compact.Append('}');
        return compact.ToString();
    }

    private static string EscapeJson(string value) =>
        value.Replace("\\", "\\\\").Replace("\"", "\\\"");
}
