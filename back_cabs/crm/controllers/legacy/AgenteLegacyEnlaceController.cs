// =====================================================================================
// CONTROLADOR ENLACE AGENTE LEGACY - AgenteLegacyEnlaceController.cs
// =====================================================================================
// API REST para gestión de enlaces entre usuarios CRM y agentes Adminpaq
// =====================================================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using back_cabs.CRM.DTOs.Legacy;
using back_cabs.CRM.Interfaces.Legacy;

namespace back_cabs.CRM.Controllers.Legacy
{
    [ApiController]
    [Route("api/agentes-legacy-enlace")]
    [Authorize]
    public class AgenteLegacyEnlaceController : ControllerBase
    {
        private readonly IAgenteLegacyEnlaceService _enlaceService;
        private readonly ILogger<AgenteLegacyEnlaceController> _logger;

        public AgenteLegacyEnlaceController(
            IAgenteLegacyEnlaceService enlaceService,
            ILogger<AgenteLegacyEnlaceController> logger)
        {
            _enlaceService = enlaceService;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════
        // DASHBOARD
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Obtiene el dashboard completo de enlaces
        /// GET /api/agentes-legacy-enlace/dashboard
        /// </summary>
        [HttpGet("dashboard")]
        [ProducesResponseType(typeof(EnlacesDashboardDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                _logger.LogInformation("📊 Obteniendo dashboard de enlaces agente-legacy");
                var dashboard = await _enlaceService.ObtenerDashboardAsync();
                return Ok(dashboard);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error al obtener dashboard de enlaces");
                return StatusCode(500, new { success = false, message = "Error interno al obtener dashboard" });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // CONSULTAS DE AGENTES
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Obtiene todos los agentes legacy con su estado de enlace
        /// GET /api/agentes-legacy-enlace/agentes
        /// </summary>
        [HttpGet("agentes")]
        [ProducesResponseType(typeof(IEnumerable<AgenteLegacyConEnlaceDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAgentes()
        {
            try
            {
                var agentes = await _enlaceService.ObtenerAgentesLegacyAsync();
                return Ok(agentes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error al obtener agentes legacy");
                return StatusCode(500, new { success = false, message = "Error interno" });
            }
        }

        /// <summary>
        /// Obtiene agentes disponibles (sin enlazar)
        /// GET /api/agentes-legacy-enlace/agentes/disponibles
        /// </summary>
        [HttpGet("agentes/disponibles")]
        [ProducesResponseType(typeof(IEnumerable<AgenteLegacyConEnlaceDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAgentesDisponibles()
        {
            try
            {
                var agentes = await _enlaceService.ObtenerAgentesDisponiblesAsync();
                return Ok(agentes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error al obtener agentes disponibles");
                return StatusCode(500, new { success = false, message = "Error interno" });
            }
        }

        /// <summary>
        /// Busca agentes por código o nombre
        /// GET /api/agentes-legacy-enlace/agentes/buscar?termino=xxx
        /// </summary>
        [HttpGet("agentes/buscar")]
        [ProducesResponseType(typeof(IEnumerable<AgenteLegacyConEnlaceDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> BuscarAgentes([FromQuery] string termino)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(termino))
                {
                    return BadRequest(new { success = false, message = "El término de búsqueda es requerido" });
                }

                var agentes = await _enlaceService.BuscarAgentesAsync(termino);
                return Ok(agentes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error al buscar agentes");
                return StatusCode(500, new { success = false, message = "Error interno" });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // CONSULTAS DE USUARIOS
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Obtiene usuarios con información de enlace
        /// GET /api/agentes-legacy-enlace/usuarios
        /// </summary>
        [HttpGet("usuarios")]
        [ProducesResponseType(typeof(IEnumerable<UsuarioConEnlaceDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetUsuariosConEnlace()
        {
            try
            {
                var usuarios = await _enlaceService.ObtenerUsuariosConEnlaceAsync();
                return Ok(usuarios);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error al obtener usuarios con enlace");
                return StatusCode(500, new { success = false, message = "Error interno" });
            }
        }

        /// <summary>
        /// Obtiene usuarios sin enlazar
        /// GET /api/agentes-legacy-enlace/usuarios/sin-enlazar
        /// </summary>
        [HttpGet("usuarios/sin-enlazar")]
        [ProducesResponseType(typeof(IEnumerable<UsuarioSinEnlaceDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetUsuariosSinEnlazar()
        {
            try
            {
                var usuarios = await _enlaceService.ObtenerUsuariosSinEnlazarAsync();
                return Ok(usuarios);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error al obtener usuarios sin enlazar");
                return StatusCode(500, new { success = false, message = "Error interno" });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // OPERACIONES DE ENLACE
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Enlaza un usuario con un agente legacy
        /// POST /api/agentes-legacy-enlace/enlazar
        /// </summary>
        [HttpPost("enlazar")]
        [ProducesResponseType(typeof(EnlaceAgenteResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> EnlazarUsuario([FromBody] EnlazarAgenteRequestDto request)
        {
            try
            {
                _logger.LogInformation("🔗 Enlazando usuario {UsuarioId} con agente {AgenteId}", 
                    request.UsuarioId, request.AgenteId);

                // Validar primero
                var validacion = await _enlaceService.ValidarEnlaceAsync(request.UsuarioId, request.AgenteId);
                if (!validacion.EsValido)
                {
                    return BadRequest(new { success = false, message = validacion.Mensaje });
                }

                var resultado = await _enlaceService.EnlazarUsuarioConAgenteAsync(request);
                
                if (!resultado.Exitoso)
                {
                    return BadRequest(new { success = false, message = resultado.Mensaje });
                }

                return Ok(resultado);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error al enlazar usuario {UsuarioId}", request.UsuarioId);
                return StatusCode(500, new { success = false, message = "Error interno al enlazar usuario" });
            }
        }

        /// <summary>
        /// Desenlaza un usuario de su agente
        /// DELETE /api/agentes-legacy-enlace/desenlazar/{usuarioId}
        /// </summary>
        [HttpDelete("desenlazar/{usuarioId:int}")]
        [ProducesResponseType(typeof(EnlaceAgenteResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DesenlazarUsuario(int usuarioId)
        {
            try
            {
                _logger.LogInformation("🔓 Desenlazando usuario {UsuarioId}", usuarioId);

                var resultado = await _enlaceService.DesenlazarUsuarioAsync(usuarioId);
                
                if (!resultado.Exitoso)
                {
                    return BadRequest(new { success = false, message = resultado.Mensaje });
                }

                return Ok(resultado);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error al desenlazar usuario {UsuarioId}", usuarioId);
                return StatusCode(500, new { success = false, message = "Error interno al desenlazar usuario" });
            }
        }

        /// <summary>
        /// Valida si un enlace es posible
        /// GET /api/agentes-legacy-enlace/validar?usuarioId=x&agenteId=y
        /// </summary>
        [HttpGet("validar")]
        [ProducesResponseType(typeof(ValidacionEnlaceDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> ValidarEnlace([FromQuery] int usuarioId, [FromQuery] int agenteId)
        {
            try
            {
                var validacion = await _enlaceService.ValidarEnlaceAsync(usuarioId, agenteId);
                return Ok(validacion);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error al validar enlace");
                return StatusCode(500, new { success = false, message = "Error interno" });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // OPERACIONES PARA DOCUMENTOS
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Obtiene el ID de agente para documentos del usuario actual
        /// GET /api/agentes-legacy-enlace/mi-agente
        /// </summary>
        [HttpGet("mi-agente")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMiAgente()
        {
            try
            {
                var usuarioIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
                if (usuarioIdClaim == null || !int.TryParse(usuarioIdClaim.Value, out int usuarioId))
                {
                    return Unauthorized(new { success = false, message = "Usuario no identificado" });
                }

                var agenteId = await _enlaceService.ObtenerIdAgenteParaDocumentoAsync(usuarioId);
                var puedeCrear = await _enlaceService.UsuarioPuedeCrearDocumentosAsync(usuarioId);

                return Ok(new
                {
                    success = true,
                    agenteId,
                    puedeCrearDocumentos = puedeCrear,
                    mensaje = puedeCrear ? "Usuario enlazado correctamente" : "Usuario no tiene agente enlazado"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error al obtener agente del usuario actual");
                return StatusCode(500, new { success = false, message = "Error interno" });
            }
        }
    }
}
