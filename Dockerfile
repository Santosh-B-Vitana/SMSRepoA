# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY SmsApi.csproj .
RUN dotnet restore SmsApi.csproj
COPY . .
RUN dotnet publish SmsApi.csproj -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Create non-root user for security
RUN addgroup --system smsapi && adduser --system --ingroup smsapi smsapi

COPY --from=build /app/publish .

# Ensure uploads directory exists with correct ownership
RUN mkdir -p /app/uploads && chown -R smsapi:smsapi /app

USER smsapi

EXPOSE 80
ENTRYPOINT ["dotnet", "SmsApi.dll"]
