-- عملة الحجز في AppBookings
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.AppBookings') AND name = N'CurrencyCode'
)
BEGIN
    ALTER TABLE dbo.AppBookings
    ADD CurrencyCode nvarchar(16) NOT NULL
        CONSTRAINT DF_AppBookings_CurrencyCode DEFAULT N'YER';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.AppBookings') AND name = N'CurrencySymbol'
)
BEGIN
    ALTER TABLE dbo.AppBookings
    ADD CurrencySymbol nvarchar(16) NOT NULL
        CONSTRAINT DF_AppBookings_CurrencySymbol DEFAULT N'YR';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260518230000_Add_Booking_Currency_Fields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260518230000_Add_Booking_Currency_Fields', N'10.0.8');
END
GO
