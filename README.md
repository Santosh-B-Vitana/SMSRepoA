# sms-api

A simple C# .NET Core API project with CORS and JWT Token Based Authentication.

## Features

- **CORS Support**: Configured to allow cross-origin requests from specified origins
- **JWT Authentication**: Token-based authentication for secure API access
- **RESTful API**: Sample SMS endpoints demonstrating authentication usage
- **Swagger/OpenAPI**: API documentation and testing interface

## Prerequisites

- .NET 8.0 SDK or later
- Any IDE that supports .NET development (Visual Studio, VS Code, Rider)

## Getting Started

### Build the Project

```bash
dotnet build
```

### Run the Application

```bash
dotnet run
```

The API will start on `http://localhost:5092` by default.

## Configuration

### appsettings.json

Configure JWT settings and CORS origins in `appsettings.json`:

```json
{
  "JwtSettings": {
    "Secret": "YourSecretKeyHere",
    "Issuer": "SmsApi",
    "Audience": "SmsApiClient",
    "ExpirationInMinutes": 60
  },
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:4200"
    ]
  }
}
```

## API Endpoints

### Authentication

#### POST /api/auth/login
Authenticate and receive a JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiration": "2025-11-09T05:09:35.503Z"
}
```

### SMS Endpoints (Requires Authentication)

#### GET /api/sms
Get all SMS messages.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
[
  {
    "id": 1,
    "recipient": "+1234567890",
    "message": "Hello World",
    "sentAt": "2025-11-09T03:09:35.503Z"
  }
]
```

#### POST /api/sms
Send a new SMS message.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Request:**
```json
{
  "recipient": "+1234567890",
  "message": "Hello World"
}
```

**Response:**
```json
{
  "id": 1234,
  "recipient": "+1234567890",
  "message": "Hello World",
  "status": "Sent",
  "sentAt": "2025-11-09T04:09:35.503Z"
}
```

## Authentication Flow

1. Call `/api/auth/login` with valid credentials to receive a JWT token
2. Include the token in the `Authorization` header for subsequent requests: `Bearer <token>`
3. The token expires after the configured time (default: 60 minutes)

## CORS Configuration

CORS is configured to allow requests from:
- `http://localhost:3000` (React development server)
- `http://localhost:4200` (Angular development server)

To add more allowed origins, update the `Cors:AllowedOrigins` array in `appsettings.json`.

## Security Notes

- The default credentials (`admin`/`password`) are for demonstration only
- In production, implement proper user authentication with hashed passwords and a database
- Keep your JWT secret key secure and never commit it to source control
- Use HTTPS in production environments

## Project Structure

```
sms-api/
├── Controllers/
│   ├── AuthController.cs    # Authentication endpoints
│   └── SmsController.cs      # SMS endpoints (protected)
├── Models/
│   ├── JwtSettings.cs        # JWT configuration model
│   ├── LoginRequest.cs       # Login request model
│   └── LoginResponse.cs      # Login response model
├── Program.cs                # Application startup and configuration
├── appsettings.json          # Application settings
└── SmsApi.csproj            # Project file
```

## Technologies Used

- ASP.NET Core 8.0
- JWT Bearer Authentication
- Microsoft.AspNetCore.Authentication.JwtBearer
- Swagger/OpenAPI

## License

This project is created for demonstration purposes.

