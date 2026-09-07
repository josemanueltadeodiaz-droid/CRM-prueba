# 🔧 CONFIGURACIÓN BACKEND PARA SECURE AUTH EN WINDOWS SERVER

## 1️⃣ Configuración CORS en Program.cs

```csharp
using Microsoft.AspNetCore.Cors;

var builder = WebApplicationBuilder.CreateBuilder(args);

// ✅ CORS Configuration para Windows Server + IIS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontendWithCredentials", policy =>
    {
        policy
            // IMPORTANTE: Especificar dominios exactos, no usar wildcard con credentials
            .WithOrigins(
                "https://localhost:4200",  // Local development
                "https://tu-dominio.com",  // Production Windows Server
                "https://www.tu-dominio.com",
                "https://app.tu-dominio.com"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()  // 🔑 CRÍTICO: Permite cookies HttpOnly
            .WithExposedHeaders("X-XSRF-TOKEN", "X-Total-Count") // Headers que Angular puede leer
            .WithMaxAge(3600); // Pre-flight cache 1 hora
    });

    // Fallback policy sin credentials (solo GET públicos)
    options.AddPolicy("AllowPublicWithoutCredentials", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

builder.Services.AddControllers();

var app = builder.Build();

// ⚠️ ORDEN IMPORTA: CORS debe ir ANTES de otros middleware
app.UseCors("AllowFrontendWithCredentials");

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// HTTPS redirection (obligatorio en Windows Server production)
app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
```

---

## 2️⃣ Configuración Anti-CSRF (Token Validation)

### En Program.cs:
```csharp
// Anti-XSRF configuration
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-XSRF-TOKEN";           // El header que envía el interceptor
    options.FormFieldName = "__RequestVerificationToken";
    options.Cookie.Name = "XSRF-TOKEN";
    options.Cookie.HttpOnly = false;               // ✅ Debe ser false para que JS lo lea
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always; // Solo HTTPS
    options.Cookie.SameSite = SameSiteMode.Lax;   // Windows Server compatible
    options.SuppressXFrameOptionsHeader = false;
});

// Agregar el middleware
app.UseAntiforgery();
```

### En BaseController o AuthController:
```csharp
using Microsoft.AspNetCore.Antiforgery;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAntiforgery _antiforgery;

    public AuthController(IAntiforgery antiforgery)
    {
        _antiforgery = antiforgery ?? throw new ArgumentNullException(nameof(antiforgery));
    }

    /// <summary>
    /// Endpoint para obtener el CSRF token (llamado después del login)
    /// </summary>
    [HttpGet("csrf-token")]
    [AllowAnonymous]
    public IActionResult GetCsrfToken()
    {
        var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
        
        return Ok(new
        {
            csrfToken = tokens.RequestToken,
            headerName = "X-XSRF-TOKEN"
        });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // ... lógica de login ...

        // Después del login exitoso, obtener el token CSRF
        var tokens = _antiforgery.GetAndStoreTokens(HttpContext);

        return Ok(new
        {
            success = true,
            data = new
            {
                userId = user.Id,
                userName = user.UserName,
                roles = roles
            },
            csrfToken = tokens.RequestToken,
            message = "Login exitoso"
        });
    }
}
```

---

## 3️⃣ Validación de CSRF en Controllers

```csharp
using Microsoft.AspNetCore.Antiforgery;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMINISTRACION,RECEPCION")]
public class GastoViaticosController : ControllerBase
{
    private readonly IAntiforgery _antiforgery;
    private readonly IGastoViaticoService _service;

    public GastoViaticosController(
        IAntiforgery antiforgery,
        IGastoViaticoService service)
    {
        _antiforgery = antiforgery;
        _service = service;
    }

    [HttpPost]
    [ValidateAntiforgeryToken]  // 🔑 Valida automáticamente el token CSRF
    public async Task<IActionResult> CreateViatico(
        [FromBody] GastoViaticoCreateRequestDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var result = await _service.CreateViaticoAsync(dto);
            return CreatedAtAction(nameof(GetViaticoById), new { id = result.Id }, result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [ValidateAntiforgeryToken]
    public async Task<IActionResult> UpdateViatico(
        int id,
        [FromBody] GastoViaticoUpdateRequestDto dto)
    {
        // ... lógica de actualización ...
    }

    [HttpDelete("{id}")]
    [ValidateAntiforgeryToken]
    public async Task<IActionResult> DeleteViatico(int id)
    {
        // ... lógica de eliminación ...
    }
}
```

---

## 4️⃣ Custom Middleware para Validación CSRF Mejorada

```csharp
public class CsrfValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<CsrfValidationMiddleware> _logger;

    public CsrfValidationMiddleware(RequestDelegate next, ILogger<CsrfValidationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IAntiforgery antiforgery)
    {
        // Validar CSRF solo para métodos que modifican datos
        if (context.Request.Method == "POST" || 
            context.Request.Method == "PUT" || 
            context.Request.Method == "DELETE" ||
            context.Request.Method == "PATCH")
        {
            try
            {
                // Validación automática del token
                await antiforgery.ValidateRequestAsync(context);
            }
            catch (AntiforgeryValidationException ex)
            {
                _logger.LogWarning("⚠️ CSRF validation failed: {Message}", ex.Message);
                
                context.Response.StatusCode = 403;
                context.Response.ContentType = "application/json";
                
                await context.Response.WriteAsJsonAsync(new
                {
                    success = false,
                    message = "Invalid CSRF token",
                    code = "CSRF_VALIDATION_FAILED"
                });
                
                return;
            }
        }

        await _next(context);
    }
}

// En Program.cs, agregar ANTES de app.UseAuthorization():
app.UseMiddleware<CsrfValidationMiddleware>();
```

---

## 5️⃣ Configuración IIS en Windows Server

### appsettings.Production.json:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning",
      "System": "Warning"
    }
  },
  "AllowedHosts": "tu-dominio.com;www.tu-dominio.com;app.tu-dominio.com",
  "Https": {
    "Enabled": true,
    "CertificatePath": "C:\\ProgramData\\certs\\tu-dominio.pfx",
    "CertificatePassword": "${CERT_PASSWORD}"
  },
  "Kestrel": {
    "Limits": {
      "MaxRequestBodySize": 52428800,
      "RequestHeadersTimeout": "00:00:30"
    }
  }
}
```

### Web.config (para IIS):
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <!-- 🔐 Headers de seguridad -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="DENY" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
        <add name="Content-Security-Policy" value="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" />
      </customHeaders>
    </httpProtocol>

    <!-- 🔧 URL Rewrite para Angular routing -->
    <rewrite>
      <rules>
        <rule name="AngularJS Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>

    <!-- 🔒 Compression -->
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />

    <!-- 📡 CORS Headers explícitos en IIS -->
    <cors enabled="true" failUnlistedOrigins="true">
      <add origin="https://tu-dominio.com" allowCredentials="true">
        <allowHeaders>
          <add header="Authorization" />
          <add header="X-XSRF-TOKEN" />
          <add header="Content-Type" />
        </allowHeaders>
        <allowMethods>
          <add method="GET" />
          <add method="POST" />
          <add method="PUT" />
          <add method="DELETE" />
          <add method="PATCH" />
          <add header="OPTIONS" />
        </allowMethods>
      </add>
    </cors>
  </system.webServer>
</configuration>
```

---

## 6️⃣ Testing Checklist

```bash
# ✅ Test 1: CORS Preflight
curl -X OPTIONS https://tu-api.com/api/GastoViaticos \
  -H "Origin: https://tu-dominio.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Debe retornar:
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Origin: https://tu-dominio.com

# ✅ Test 2: Login y obtener CSRF token
curl -X POST https://tu-api.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}' \
  -c cookies.txt \
  -v

# ✅ Test 3: Usar CSRF token en request
curl -X POST https://tu-api.com/api/GastoViaticos \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: {token_del_step_anterior}" \
  -b cookies.txt \
  -d '{...payload...}' \
  -v

# Debe retornar 201 Created, NO 403 Forbidden
```

---

## 7️⃣ Monitoreo en Windows Server

### Logs a revisar:
- `C:\Logs\aplicacion\AspNetCore\` - Logs de ASP.NET Core
- `C:\Windows\System32\LogFiles\HTTPERR\` - Errores HTTP de IIS
- Event Viewer → Windows Logs → Application

### Métricas importantes:
- Response time > 500ms = posible problema CSRF
- Errores 403 repetidos = problema de token CSRF
- Errores 415 = problema Content-Type (revisar middleware)
- Errores 401 = refresh token fallando

---

## 📋 Checklist Deployment

```
✅ CORS configurado con dominios específicos
✅ Anti-CSRF token habilitado y validado
✅ HTTPS obligatorio en producción
✅ Headers de seguridad en IIS configurados
✅ URL Rewrite en IIS para Angular routing
✅ Logging configurado sin datos sensibles
✅ Base de datos con conexiones pooled
✅ Rate limiting implementado (opcional pero recomendado)
✅ Certificado SSL válido en Windows Server
✅ Testing completo en entorno staging
✅ Rollback plan preparado
```

