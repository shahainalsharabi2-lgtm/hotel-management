-- تشغيل هذا السكربت إذا فشلت إضافة الغرفة بعد تحديث العملة
-- Run if room insert fails (missing CurrencyCode / CurrencySymbol on AppRooms)

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.AppRooms') AND name = N'CurrencyCode'
)
BEGIN
    ALTER TABLE dbo.AppRooms
    ADD CurrencyCode nvarchar(16) NOT NULL
        CONSTRAINT DF_AppRooms_CurrencyCode DEFAULT N'YER';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.AppRooms') AND name = N'CurrencySymbol'
)
BEGIN
    ALTER TABLE dbo.AppRooms
    ADD CurrencySymbol nvarchar(16) NOT NULL
        CONSTRAINT DF_AppRooms_CurrencySymbol DEFAULT N'YR';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260518220000_Add_Room_Currency_Fields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260518220000_Add_Room_Currency_Fields', N'10.0.8');
END
GO
