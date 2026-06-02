using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace Modiaf.Al.Arab.Hotel.GuestRegistries;

public class GuestRegistry : FullAuditedEntity<int>
{
    public string First_Name { get; set; }
    public string Middle_Name { get; set; }
    public string Last_Name { get; set; }
    public string Phone_Number { get; set; }
    public string Gender { get; set; }
    public string Nationality { get; set; }
    public string Country { get; set; }
    public DateTime? Birth_Date { get; set; }
    public string Id_Type { get; set; }
    public string Id_Issuing_Country { get; set; }
    public string Id_Number { get; set; }

    public GuestRegistry()
    {
    }
}
