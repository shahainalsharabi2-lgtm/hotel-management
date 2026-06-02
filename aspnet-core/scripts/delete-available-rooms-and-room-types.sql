-- حذف كل الغرف «المتاحة» + كل أنواع الغرف (للبدء من جديد)
-- لا يحذف: AppBookings, AppFloors
-- قاعدة: HotelManagementDB

USE HotelManagementDB;
GO

BEGIN TRANSACTION;

DELETE FROM dbo.AppRooms
WHERE IsDeleted = 0
  AND LOWER(LTRIM(RTRIM(Status))) IN (
    N'available', N'avail', N'vacant', N'free', N''
  );

DELETE FROM dbo.AppRoomTypes;

COMMIT TRANSACTION;

SELECT N'AppRooms' AS [Table], Status, COUNT(*) AS Cnt
FROM dbo.AppRooms
WHERE IsDeleted = 0
GROUP BY Status
UNION ALL
SELECT N'AppRoomTypes', N'(all)', COUNT(*) FROM dbo.AppRoomTypes;
