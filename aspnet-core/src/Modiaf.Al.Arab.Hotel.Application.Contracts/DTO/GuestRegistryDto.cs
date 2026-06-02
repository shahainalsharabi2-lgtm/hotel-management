using System;
using Volo.Abp.Application.Dtos;

namespace Modiaf.Al.Arab.Hotel.GuestRegistries;

public class GuestRegistryDto : EntityDto<int>
{
    public string First_Name { get; set; }
    public string Middle_Name { get; set; }
    public string Last_Name { get; set; }
    public string Phone_Number { get; set; }
    public string Gender { get; set; }
    public string Nationality { get; set; }
    public string Country { get; set; }
    public string Birth_Date { get; set; }
    public string Id_Type { get; set; }
    public string Id_Issuing_Country { get; set; }
    public string Id_Number { get; set; }
    public DateTime? LastModificationTime { get; set; }
}

public class CreateUpdateGuestRegistryDto
{
    public int? Id { get; set; }
    public string First_Name { get; set; }
    public string Middle_Name { get; set; }
    public string Last_Name { get; set; }
    public string Phone_Number { get; set; }
    public string Gender { get; set; }
    public string Nationality { get; set; }
    public string Country { get; set; }
    public string Birth_Date { get; set; }
    public string Id_Type { get; set; }
    public string Id_Issuing_Country { get; set; }
    public string Id_Number { get; set; }
}
