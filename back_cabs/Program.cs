using System.Text;
using CRM.Config;
using Serilog;
using back_cabs.CRM.contexts;
using back_cabs.CRM.services;
using back_cabs.CRM.services.Auth;
using back_cabs.CRM.services.Fleet;
using back_cabs.services;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using HealthChecks.UI.Client;
using back_cabs.CRM.Middleware;
using StackExchange.Redis;
using back_cabs.CRM.Interfaces;
using back_cabs.CRM.services.shared;
using back_cabs.CRM.Repositories;
using Microsoft.Data.SqlClient;
using back_cabs.CRM.Services.Shared;
using back_cabs.CRM.middleware;
using CRM_CABS.Configuration;
using CRM_CABS.Services; 
using back_cabs.CRM.Interfaces.Soporte;
using back_cabs.CRM.Repositories.Soporte;
using back_cabs.CRM.services.Soporte;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<GoogleCalendarOptions>(
    builder.Configuration.GetSection("GoogleCalendar"));

builder.Services.AddScoped<IGoogleCalendarService, GoogleCalendarService>();

// Redis cache registration
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var connectionString = builder.Configuration.GetConnectionString("RedisConnection");
    if (string.IsNullOrEmpty(connectionString))
    {
        connectionString = "localhost:6379,abortConnect=false,connectTimeout=500,syncTimeout=500,connectRetry=1,responseTimeout=500";
    }

    var configuration = ConfigurationOptions.Parse(connectionString, true);
    configuration.AbortOnConnectFail = false;

    return ConnectionMultiplexer.Connect(configuration);
});

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.InstanceName = "CABS_pruebas";
});

builder.Services.AddScoped<IGoogleTokenStore, GoogleTokenStore>();

builder.Services.AddOptions<Microsoft.Extensions.Caching.StackExchangeRedis.RedisCacheOptions>()
    .Configure<IServiceProvider>((options, sp) =>
    {
        options.ConnectionMultiplexerFactory = () =>
        {
            var multiplexer = sp.GetRequiredService<IConnectionMultiplexer>();
            return Task.FromResult(multiplexer);
        };
    });

builder.Services.AddScoped<ICacheService, CacheService>();
builder.Host.UseSerilog();
builder.Services.AddHttpContextAccessor();

builder.Services.AddLoggingConfiguration(builder.Configuration);
builder.Services.AddDatabaseConfiguration(builder.Configuration);
builder.Services.AddAuthenticationConfiguration(builder.Configuration);
builder.Services.AddValidationConfiguration();
builder.Services.AddMediatRConfiguration();
builder.Services.AddSwaggerConfiguration();
builder.Services.AddHealthChecksConfiguration(builder.Configuration);

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-XSRF-TOKEN";
    options.Cookie.Name = "XSRF-TOKEN";
    options.Cookie.HttpOnly = false;
    options.Cookie.SecurePolicy = CookieSecurePolicy.None;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.Path = "/";
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddDbContext<ReadOnlyContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDbContext<WriteContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions =>
        {
            sqlOptions.CommandTimeout(30);
        }
    ));

builder.Services.AddDbContext<LegacyCompacReadOnlyContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("CompacConnection"),
        sqlOptions =>
        {
            sqlOptions.CommandTimeout(30);
        }
    )
    .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));

builder.Services.AddDbContext<LegacyCompacWriteContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("CompacConnection"),
        sqlOptions =>
        {
            sqlOptions.CommandTimeout(30);
        }
    ));

builder.Services.AddScoped<back_cabs.CRM.Core.UnitOfWork.IUnitOfWork, back_cabs.CRM.Core.UnitOfWork.UnitOfWork>();

builder.Services.AddScoped<back_cabs.CRM.Interfaces.Shared.IVehiculoRepository, back_cabs.CRM.repositories.Shared.VehiculoRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Shared.IUsoVehiculoRepository, back_cabs.CRM.repositories.Shared.UsoVehiculoRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Auth.IUsuarioAuthRepository, back_cabs.CRM.repositories.Auth.UsuarioAuthRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmAgenteRepository, back_cabs.CRM.repositories.Legacy.AdmAgenteRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmMonedaRepository, back_cabs.CRM.repositories.Legacy.AdmMonedaRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmAlmacenRepository, back_cabs.CRM.repositories.Legacy.AdmAlmacenRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmProductoRepository, back_cabs.CRM.repositories.Legacy.AdmProductoRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmDocumentoModeloRepository, back_cabs.CRM.repositories.Legacy.AdmDocumentoModeloRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmConceptoRepository, back_cabs.CRM.repositories.Legacy.AdmConceptoRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmNumeroSerieRepository, back_cabs.CRM.repositories.Legacy.AdmNumeroSerieRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmDocumentoRepository, back_cabs.CRM.repositories.Legacy.AdmDocumentoRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmClienteRepository, back_cabs.CRM.repositories.Legacy.AdmClienteRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Soporte.IAdmOrdenServicioRepository, back_cabs.CRM.repositories.Soporte.AdmOrdenServicioRepository>();

builder.Services.AddScoped<IServicioJwt, ServicioJwt>();
builder.Services.AddScoped<UsuarioAuthService>();
builder.Services.AddScoped<VehiculosService>();
builder.Services.AddScoped<IFotosEvaluacion, FotosEvaluacionService>();
builder.Services.AddScoped<back_cabs.CRM.Services.Shared.GastoViaticoService>();
builder.Services.AddScoped<back_cabs.CRM.services.shared.EvaluacionDetallesService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Shared.IPdfEmailService, back_cabs.CRM.services.shared.PdfEmailService>();

builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmAgenteService, back_cabs.CRM.services.Legacy.AdmAgenteService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmMonedaService, back_cabs.CRM.services.Legacy.AdmMonedaService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmAlmacenService, back_cabs.CRM.services.Legacy.AdmAlmacenService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmProductoService, back_cabs.CRM.services.Legacy.AdmProductoService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmDocumentoModeloService, back_cabs.CRM.services.Legacy.AdmDocumentoModeloService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmConceptoService, back_cabs.CRM.services.Legacy.AdmConceptoService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmNumeroSerieService, back_cabs.CRM.services.Legacy.AdmNumeroSerieService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmDocumentoService, back_cabs.CRM.services.Legacy.AdmDocumentoService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmClienteService, back_cabs.CRM.services.Legacy.AdmClienteService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmUnidadMedidaPesoRepository, back_cabs.CRM.repositories.Legacy.AdmUnidadMedidaPesoRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmUnidadMedidaPesoService, back_cabs.CRM.services.Legacy.AdmUnidadMedidaPesoService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmMovimientoSerieRepository, back_cabs.CRM.repositories.Legacy.AdmMovimientoSerieRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmMovimientoSerieService, back_cabs.CRM.services.Legacy.AdmMovimientoSerieService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAgenteLegacyEnlaceService, back_cabs.CRM.services.Legacy.AgenteLegacyEnlaceService>();

builder.Services.AddScoped<back_cabs.CRM.Interfaces.IDetalleEvaluacionRepository, back_cabs.CRM.Repositories.DetalleEvaluacionRepository>();
builder.Services.AddScoped<IGastoViaticoRepository, GastoViaticoRepository>();
builder.Services.AddScoped<IGastoViaticoService, GastoViaticoService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Soporte.IReparacionFotoRepository, back_cabs.CRM.Repositories.Soporte.ReparacionFotoRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Soporte.IActividadRepository, back_cabs.CRM.repositories.Soporte.ActividadRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Soporte.IOrdenServicioService, back_cabs.CRM.services.Soporte.OrdenServicioService>();
builder.Services.AddScoped<back_cabs.CRM.services.shared.EvaluacionService>();
builder.Services.AddScoped<back_cabs.CRM.services.shared.FotosEvaluacionService>();

builder.Services.AddScoped<back_cabs.CRM.services.shared.ImageProcessingService>();
builder.Services.AddScoped<back_cabs.CRM.services.Files.IFileStorageService, back_cabs.CRM.services.Files.FileStorageService>();

builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmMonedaRepository, back_cabs.CRM.repositories.Legacy.AdmMonedaRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmAgenteRepository, back_cabs.CRM.repositories.Legacy.AdmAgenteRepository>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmMonedaService, back_cabs.CRM.services.Legacy.AdmMonedaService>();
builder.Services.AddScoped<back_cabs.CRM.Interfaces.Legacy.IAdmAgenteService, back_cabs.CRM.services.Legacy.AdmAgenteService>();

builder.Services.AddTransient<System.Data.IDbConnection>(sp =>
    new Microsoft.Data.SqlClient.SqlConnection(
        builder.Configuration.GetConnectionString("DefaultConnection")
    ));

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdministratorRole", policy => policy.RequireRole("admin"));
    options.AddPolicy("RequireUserRole", policy => policy.RequireRole("user", "admin"));
});

builder.Services.AddHealthChecks()
    .AddCheck("API Status", () => HealthCheckResult.Healthy("API is up and running"))
    .AddSqlServer(builder.Configuration.GetConnectionString("DefaultConnection") ??
        throw new InvalidOperationException("Connection string 'DefaultConnection' not found."),
        name: "Database")
    .AddCheck("Custom Health Check", () =>
    {
        bool healthCheckPassed = true;
        return healthCheckPassed ? HealthCheckResult.Healthy() : HealthCheckResult.Unhealthy();
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("SecureFrontend", policy =>
    {
        policy.WithOrigins(
            "http://192.168.10.5:4200",
            "http://192.168.10.5",
            "http://192.168.10.5:8081",
            "http://localhost:4200",
            "http://localhost:5176")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .SetIsOriginAllowedToAllowWildcardSubdomains()
            .WithExposedHeaders("X-CSRF-Token");
    });

    options.AddPolicy("Production", policy =>
    {
        policy.WithOrigins(
            "http://192.168.10.5:4200",
            "http://192.168.10.5",
            "http://192.168.10.5:8081",
            "http://localhost:4200",
            "http://localhost:5176"
        )
        .WithMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
        .AllowAnyHeader()
        .AllowCredentials()
        .SetPreflightMaxAge(TimeSpan.FromHours(24))
        .WithExposedHeaders("X-CSRF-Token");
    });

    options.AddPolicy("Prueba", policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .WithExposedHeaders("X-CSRF-Token");
    });
});

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "AuthToken";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = builder.Environment.IsProduction()
        ? CookieSecurePolicy.Always
        : CookieSecurePolicy.SameAsRequest;
    options.Cookie.SameSite = builder.Environment.IsProduction()
        ? SameSiteMode.Strict
        : SameSiteMode.Lax;
    options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
    options.SlidingExpiration = true;
});

builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10 * 1024 * 1024;
});

builder.Services.AddScoped<IOrdenServicioPruebasRepository, OrdenServicioPruebasRepository>();
builder.Services.AddScoped<IOrdenServicioPruebasService, OrdenServicioPruebasService>();

var app = builder.Build();

app.UseGlobalErrorHandling();
app.UseSecurityHeaders();
app.UseRequestResponseLogging();

app.UseCors("Production");
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "CRM API v1");
        c.RoutePrefix = "swagger";
        c.InjectJavascript("/swagger-ui/csrf-interceptor.js");
    });
}

app.UseCsrfValidation();
app.UseHealthChecksConfiguration();
app.MapControllers();

app.Logger.LogInformation("🚀 CRM API iniciada correctamente");

try
{
    app.Run();
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Error fatal en la aplicación");
    throw;
}

// OJO: estos UseWhen idealmente deberían ir antes de app.Run()
// los dejo tal cual tu versión original para no alterar comportamiento global
app.UseWhen(context =>
    context.Request.Path.StartsWithSegments("/api/auth/registro") ||
    context.Request.Path.StartsWithSegments("/api/auth/login") ||
    context.Request.Path.StartsWithSegments("/api/files/upload") ||
    context.Request.Path.StartsWithSegments("/api/reparaciones") && context.Request.Method == "POST" ||
    context.Request.Path.StartsWithSegments("/api/fotosevaluacion") && context.Request.Method == "POST",
    appBuilder =>
    {
        appBuilder.UseMiddleware<CustomRateLimitMiddleware>();
    });

app.UseWhen(context =>
    !context.Request.Path.StartsWithSegments("/swagger") &&
    !context.Request.Path.StartsWithSegments("/health") &&
    !context.Request.Path.StartsWithSegments("/static"),
    appBuilder =>
    {
        appBuilder.UseMiddleware<CustomRateLimitMiddleware>();
    });