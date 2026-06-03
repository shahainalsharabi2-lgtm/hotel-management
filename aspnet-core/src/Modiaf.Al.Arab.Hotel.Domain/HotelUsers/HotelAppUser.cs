using Volo.Abp.Domain.Entities;

namespace Modiaf.Al.Arab.Hotel.HotelUsers;

public class HotelAppUser : Entity<int>
{
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    protected HotelAppUser()
    {
    }

    public HotelAppUser(
        string firstName,
        string lastName,
        string userName,
        string email,
        string phoneNumber,
        string password)
    {
        FirstName = firstName;
        LastName = lastName;
        UserName = userName;
        Email = email;
        PhoneNumber = phoneNumber;
        Password = password;
    }
}
