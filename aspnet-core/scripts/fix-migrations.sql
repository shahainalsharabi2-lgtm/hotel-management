-- شغّل هذا على قاعدة HotelManagementDB إذا فشل database update بسبب AppRoomTypes موجود مسبقاً
-- ثم نفّذ: dotnet ef database update

IF NOT EXISTS (
    SELECT 1 FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260518064218_Add_AppRoomTypes'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260518064218_Add_AppRoomTypes', N'10.0.8');
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = N'AppUiTranslationsStores'
)
BEGIN
    CREATE TABLE [dbo].[AppUiTranslationsStores] (
        [Id] uniqueidentifier NOT NULL,
        [PayloadJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_AppUiTranslationsStores] PRIMARY KEY ([Id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260518140947_Add_AppUiTranslationsStores'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260518140947_Add_AppUiTranslationsStores', N'10.0.8');
END
GO
