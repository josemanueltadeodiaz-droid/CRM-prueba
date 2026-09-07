using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Configuration;
using CRM_CABS.Configuration;
using CRM_CABS.Services;
using back_cabs.CRM.Interfaces.Soporte;
using back_cabs.CRM.services.Soporte;

namespace back_cabs.CRM.Controllers.Google
{
    [ApiController]
    [Route("api/google/auth")]
    public class GoogleAuthController : ControllerBase
    {
        private readonly IGoogleCalendarService _googleCalendarService;
        private readonly IGoogleTokenStore _googleTokenStore;
        private readonly IOptions<GoogleCalendarOptions> _googleOptions;
        private readonly ILogger<GoogleAuthController> _logger;
        private readonly IConfiguration _cfg;
        private readonly IOrdenServicioPruebasService _ordenService;

        public GoogleAuthController(
            IGoogleCalendarService googleCalendarService,
            IGoogleTokenStore googleTokenStore,
            IOptions<GoogleCalendarOptions> googleOptions,
            ILogger<GoogleAuthController> logger,
            IConfiguration cfg,
            IOrdenServicioPruebasService ordenService)
        {
            _googleCalendarService = googleCalendarService;
            _googleTokenStore = googleTokenStore;
            _googleOptions = googleOptions;
            _logger = logger;
            _cfg = cfg;
            _ordenService = ordenService;
        }

        // Inicia el flujo (requiere auth para iniciar)
        [HttpGet("url")]
        [Authorize]
        public IActionResult GetAuthUrl([FromQuery] string returnTo = null)
        {
            var clientId = _googleOptions.Value.ClientId;
            var redirect = _googleOptions.Value.RedirectUri; // ej. http://localhost:5176/api/google/auth/callback
            var scope = "https://www.googleapis.com/auth/calendar.events";
            var userId = User?.FindFirst("sub")?.Value ?? "0";
            var state = $"crm-cabs-user:{userId}";

            var url =
                $"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={Uri.EscapeDataString(clientId)}" +
                $"&redirect_uri={Uri.EscapeDataString(redirect)}&scope={Uri.EscapeDataString(scope)}&access_type=offline&prompt=consent&state={Uri.EscapeDataString(state)}";

            if (!string.IsNullOrEmpty(returnTo))
            {
                url += $"&hd={Uri.EscapeDataString(returnTo)}";
            }

            return Ok(new { url });
        }

        // Callback que Google llamará con ?code=...&state=...
        // AllowAnonymous es necesario porque Google redirige sin JWT
        [HttpGet("callback")]
        [AllowAnonymous]
        public async Task<IActionResult> Callback([FromQuery] string code, [FromQuery] string state)
        {
            _logger.LogInformation("Google callback invoked. state={state}", state);

            var frontendUrl = _cfg["Frontend:Url"] ?? "http://localhost:4200";

            if (string.IsNullOrEmpty(code))
            {
                _logger.LogWarning("No code received from Google.");
                return Redirect($"{frontendUrl}/google/connected?status=error_missing_code");
            }

            try
            {
                // Intercambiar code por tokens usando el servicio
                var tokenResult = await _googleCalendarService.ExchangeCodeAsync(code);
                if (tokenResult.Equals(default((string, string, string?, string?, DateTime?))))
                {
                    _logger.LogError("Token exchange failed or returned no tokens.");
                    return Redirect($"{frontendUrl}/google/connected?status=error_token_exchange");
                }

                var accessToken = tokenResult.AccessToken;
                var refreshToken = tokenResult.RefreshToken;
                var scope = tokenResult.Scope;
                var tokenType = tokenResult.TokenType;
                var expiresAt = tokenResult.ExpiresAtUtc;

                _logger.LogInformation("Received tokens. refreshToken present: {has}", !string.IsNullOrEmpty(refreshToken));

                // Extraer userId desde state (preferible) o intentar desde claims
                int? userId = null;
                if (!string.IsNullOrEmpty(state) && state.StartsWith("crm-cabs-user:"))
                {
                    var parts = state.Split(':', 2);
                    if (parts.Length == 2 && int.TryParse(parts[1], out var parsed))
                        userId = parsed;
                }

                if (userId == null)
                {
                    // intentar desde cookie/claims si existe
                    var claimSub = User?.FindFirst("sub")?.Value;
                    if (int.TryParse(claimSub, out var parsed2)) userId = parsed2;
                }

                if (userId == null)
                {
                    _logger.LogWarning("State did not contain a valid user id and no claim found. state={state}", state);
                    return Redirect($"{frontendUrl}/google/connected?status=error_no_user");
                }

                // Guardar (o actualizar) el refresh token usando el store
                if (!string.IsNullOrEmpty(refreshToken))
                {
                    await _googleTokenStore.SaveOrUpdateAsync(userId.Value, refreshToken, accessToken, scope, tokenType, expiresAt);
                    _logger.LogInformation("Saved refresh_token for user {userId}", userId.Value);
                }
                else
                {
                    _logger.LogInformation("No refresh_token returned; existing refresh token may already be stored for user {userId}", userId.Value);
                    // Si accessToken viene, aún podemos guardar acceso temporal
                    if (!string.IsNullOrEmpty(accessToken))
                    {
                        await _googleTokenStore.SaveOrUpdateAsync(userId.Value, string.Empty, accessToken, scope, tokenType, expiresAt);
                    }
                }

                return Redirect($"{frontendUrl}/google/connected?status=ok&userId={userId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Google OAuth callback");
                var frontend = _cfg["Frontend:Url"] ?? "http://localhost:4200";
                return Redirect($"{frontend}/google/connected?status=error");
            }
        }

        // Endpoint para crear evento en Google Calendar usando refresh token (backend-driven)
        [HttpPost("events")]
        [Authorize]
        public async Task<IActionResult> CreateEvent([FromBody] CRM_CABS.Dtos.Google.CreateCalendarEventDto dto)
        {
            var userIdStr = User?.FindFirst("sub")?.Value;
            if (!int.TryParse(userIdStr, out var userId))
            {
                return Forbid();
            }

            // Obtener refreshToken del store
            var refreshToken = await _googleTokenStore.GetRefreshTokenAsync(userIdStr);
            if (string.IsNullOrEmpty(refreshToken))
            {
                return BadRequest("No Google refresh token configured for this user");
            }

            try
            {
                // Obtener access token (refrescar)
                var accessToken = await _googleCalendarService.RefreshAccessTokenAsync(refreshToken);

                string htmlLink;

                if (string.Equals(dto.Tipo, "todoDia", StringComparison.OrdinalIgnoreCase))
                {
                    // Evento de día completo: usar el campo Dia (YYYY-MM-DD)
                    var dia = dto.Dia?.Trim();
                    if (string.IsNullOrEmpty(dia))
                        return BadRequest("El campo 'dia' es requerido para eventos de tipo 'todoDia'.");

                    htmlLink = await _googleCalendarService.CreateAllDayEventAsync(
                        accessToken,
                        dto.Summary,
                        dto.Description,
                        dto.Location,
                        dia
                    );
                }
                else
                {
                    // Evento de bloque con hora: parsear StartIso y EndIso como RFC3339 UTC
                    if (string.IsNullOrEmpty(dto.StartIso) || string.IsNullOrEmpty(dto.EndIso))
                        return BadRequest("Los campos 'startIso' y 'endIso' son requeridos para eventos de tipo 'bloque'.");

                    if (!DateTime.TryParse(dto.StartIso, null, System.Globalization.DateTimeStyles.RoundtripKind, out var startDt))
                        return BadRequest($"Formato inválido en 'startIso': {dto.StartIso}. Use RFC3339 (p. ej. 2024-01-15T10:00:00Z).");

                    if (!DateTime.TryParse(dto.EndIso, null, System.Globalization.DateTimeStyles.RoundtripKind, out var endDt))
                        return BadRequest($"Formato inválido en 'endIso': {dto.EndIso}. Use RFC3339 (p. ej. 2024-01-15T11:00:00Z).");

                    // Normalizar a UTC
                    if (startDt.Kind != DateTimeKind.Utc)
                        startDt = startDt.ToUniversalTime();
                    if (endDt.Kind != DateTimeKind.Utc)
                        endDt = endDt.ToUniversalTime();

                    htmlLink = await _googleCalendarService.CreateEventAsync(
                        accessToken,
                        dto.Summary,
                        dto.Description,
                        dto.Location,
                        startDt,
                        endDt
                    );
                }

                return Ok(new { htmlLink });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating Google Calendar event for user {userId}", userId);
                return StatusCode(500, "Error creating calendar event");
            }
        }
    }
}