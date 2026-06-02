FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy sln-level files
COPY . .

RUN dotnet restore "src/Modiaf.Al.Arab.Hotel.HttpApi.Host/Modiaf.Al.Arab.Hotel.HttpApi.Host.csproj"
RUN dotnet publish "src/Modiaf.Al.Arab.Hotel.HttpApi.Host/Modiaf.Al.Arab.Hotel.HttpApi.Host.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Modiaf.Al.Arab.Hotel.HttpApi.Host.dll"]
