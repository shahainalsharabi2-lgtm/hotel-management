-- تهيئة حالات الغرف: جعل كل الغرف «متاحة» (بدون حذف الغرف)
-- قاعدة: HotelManagementDB — عدّل الاسم إن لزم

USE HotelManagementDB;
GO

-- افتراضي: المحجوزة والمتسخة فقط → متاحة
UPDATE dbo.AppRooms
SET Status = N'available'
WHERE IsDeleted = 0
  AND Status NOT IN (N'available', N'avail', N'vacant', N'free')
  AND Status NOT IN (N'maintenance', N'maint', N'suspended', N'stopped', N'halt');

-- تهيئة شاملة (كل الغرف متاحة): أزل التعليق عن السطر التالي
-- UPDATE dbo.AppRooms SET Status = N'available' WHERE IsDeleted = 0;

SELECT Status, COUNT(*) AS RoomCount
FROM dbo.AppRooms
WHERE IsDeleted = 0
GROUP BY Status
ORDER BY Status;
