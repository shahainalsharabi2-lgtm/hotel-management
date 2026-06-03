namespace Modiaf.Al.Arab.Hotel.DatabaseAdmin;

public class HotelDatabaseBackupDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string JsonContent { get; set; } = string.Empty;
}
