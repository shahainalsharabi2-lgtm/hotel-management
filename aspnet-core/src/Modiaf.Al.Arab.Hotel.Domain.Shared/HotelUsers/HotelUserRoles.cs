using System;

namespace Modiaf.Al.Arab.Hotel.HotelUsers;

public static class HotelUserRoles
{
    public const string Manager = "manager";
    public const string Accountant = "accountant";
    public const string Cashier = "cashier";
    public const string Regular = "user";

    public static string Default => Regular;

    public static string Normalize(string? role)
    {
        var value = (role ?? string.Empty).Trim().ToLowerInvariant();
        return value switch
        {
            Manager => Manager,
            Accountant => Accountant,
            Cashier => Cashier,
            Regular => Regular,
            _ => Default,
        };
    }

    public static bool CanManageUsers(string? role) =>
        string.Equals(Normalize(role), Manager, StringComparison.Ordinal);
}
