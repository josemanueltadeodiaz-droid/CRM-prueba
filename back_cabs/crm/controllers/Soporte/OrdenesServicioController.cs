using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using back_cabs.CRM.DTOs.Request;
using back_cabs.CRM.DTOs.Response;
using CRM.DTOs.Response;
using back_cabs.CRM.Interfaces.Soporte;
using back_cabs.CRM.enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace back_cabs.CRM.controllers.Soporte
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrdenesServicioController : ControllerBase
    {
        private readonly IOrdenServicioService _ordenServicioService;
        private readonly ILogger<OrdenesServicioController> _logger;

        public OrdenesServicioController(
            IOrdenServicioService ordenServicioService,
            ILogger<OrdenesServicioController> logger)
        {
            _ordenServicioService = ordenServicioService;
            _logger = logger;
        }

        /// <summary>
        /// Crea una nueva Orden de Servicio (Legacy + Actividad)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<OrdenServicioResponseDto>> Create([FromBody] OrdenServicioCreateRequestDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                if (!Enum.IsDefined(typeof(EstadoOrden), dto.Estado))
                {
                    return BadRequest(new
                    {
                        message = "Estado inválido. Valores permitidos: 0=PENDIENTE, 1=EN_PROCESO, 2=CERRADA, 3=CANCELADA."
                    });
                }

                _logger.LogInformation(
                    "Recibida solicitud para crear Orden de Servicio para Cliente ID: {ClienteId}",
                    dto.ClienteId
                );

                var idDocumento = await _ordenServicioService.CreateOrdenServicioAsync(dto);
                var ordenCreada = await _ordenServicioService.GetOrdenServicioByIdAsync(idDocumento);

                if (ordenCreada == null)
                {
                    return StatusCode(500, new
                    {
                        message = "La orden se creó pero no se pudo recuperar para la respuesta."
                    });
                }

                return CreatedAtAction(nameof(GetById), new { id = idDocumento }, ordenCreada);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Error de validación al crear Orden de Servicio");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error interno al crear Orden de Servicio");
                return StatusCode(500, new { message = "Ocurrió un error interno al procesar la solicitud." });
            }
        }

        /// <summary>
        /// Obtiene una Orden de Servicio por ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<OrdenServicioResponseDto>> GetById(int id)
        {
            try
            {
                var orden = await _ordenServicioService.GetOrdenServicioByIdAsync(id);
                if (orden == null)
                {
                    return NotFound(new { message = $"No se encontró la Orden de Servicio con ID {id}" });
                }
                return Ok(orden);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener Orden de Servicio por ID");
                return StatusCode(500, new { message = "Ocurrió un error interno." });
            }
        }

        /// <summary>
        /// Busca Órdenes de Servicio con filtros
        /// </summary>
        [HttpGet("all")]
        public async Task<ActionResult<PaginatedResponseDto<OrdenServicioResponseDto>>> GetAll(
            [FromQuery] back_cabs.CRM.DTOs.Legacy.AdmDocumentoFilterDto filter)
        {
            try
            {
                var (ordenes, total) = await _ordenServicioService.GetOrdenesServicioAsync(filter);

                var response = new PaginatedResponseDto<OrdenServicioResponseDto>
                {
                    Items = ordenes,
                    TotalItems = total,
                    Pagina = filter.Page,
                    ResultadosPorPagina = filter.PageSize
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al buscar Órdenes de Servicio");
                return StatusCode(500, new { message = "Ocurrió un error interno." });
            }
        }

        [HttpPost("servicios")]
        public async Task<IActionResult> InsertarServicio([FromBody] OrdenServicioAgregarServiciosDto dto)
        {
            try
            {
                var orden = await _ordenServicioService.AgregarServiciosAsync(dto);
                if (orden == null) return NotFound("No se pudo agregar el servicio a la orden de servicio");
                return orden.Success ? Ok(orden) : BadRequest(orden);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al insertar servicio en la orden de servicio {Id}", dto.DocumentoId);
                return StatusCode(500, "Error interno al insertar el servicio");
            }
        }

        [HttpGet("numero-movimiento/{documentoId}")]
        public async Task<ActionResult<List<int>>> GetUltimosNumeroMovimiento(int documentoId)
        {
            try
            {
                var movimientos = await _ordenServicioService.GetUltimoNumeroMovimientoAsync(documentoId);
                return Ok(movimientos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener últimos números de movimiento para documento {DocumentoId}", documentoId);
                return StatusCode(500, "Error interno al obtener últimos números de movimiento");
            }
        }

        [HttpPatch("servicios")]
        public async Task<IActionResult> EditarServicio([FromBody] OrdenServicioMovimientoDto dto)
        {
            try
            {
                var servicio = await _ordenServicioService.EditarServicioAsync(dto);
                if (servicio == null) return NotFound("No se pudo editar el servicio a la orden de servicio");
                return servicio.Success ? Ok(servicio) : BadRequest(servicio);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al editar servicio en la orden de servicio {IdMovimiento}", dto.IdMovimiento);
                return StatusCode(500, "Error interno al editar el servicio");
            }
        }

        [HttpPatch("iniciar")]
        public async Task<ActionResult<OrdenServicioResponseDto>> IniciarOrden([FromBody] OrdenServicioInicioRequestDto dto)
        {
            try
            {
                var orden = await _ordenServicioService.IniciarOrdenServicioAsync(dto);
                if (orden == null) return NotFound("Orden no encontrada o no vinculada a una actividad");
                return Ok(orden);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al iniciar orden de servicio {Id}", dto.DocumentoId);
                return StatusCode(500, "Error interno al iniciar la orden");
            }
        }

        [HttpPatch("finalizar")]
        public async Task<ActionResult<OrdenServicioResponseDto>> FinalizarOrden([FromBody] OrdenServicioFinRequestDto dto)
        {
            try
            {
                var orden = await _ordenServicioService.FinalizarOrdenServicioAsync(dto);
                if (orden == null) return NotFound("Orden no encontrada o no vinculada a una actividad");
                return Ok(orden);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al finalizar orden de servicio {Id}", dto.DocumentoId);
                return StatusCode(500, "Error interno al finalizar la orden");
            }
        }

        [HttpPatch("asignar-agente")]
        public async Task<ActionResult> AsignarAgente(int OrdenServicioId, int NewAgentId)
        {
            try
            {
                var orden = await _ordenServicioService.AssignNewAgentAsync(OrdenServicioId, NewAgentId);
                if (orden == null) return NotFound("Orden no encontrada o no vinculada a una actividad");
                return Ok(orden);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al asignar agente a la orden de servicio {Id}", OrdenServicioId);
                return StatusCode(500, "Error interno al asignar el agente");
            }
        }
    }
}