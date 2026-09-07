using Microsoft.AspNetCore.Mvc;
using back_cabs.CRM.DTOs.Request;
using back_cabs.CRM.DTOs.Response;
using back_cabs.CRM.Interfaces.Soporte;

namespace back_cabs.CRM.controllers.Soporte
{
    [ApiController]
    [Route("api/ordenes-servicio-pruebas")]
    public class OrdenServicioPruebasController : ControllerBase
    {
        private readonly IOrdenServicioPruebasService _service;

        public OrdenServicioPruebasController(IOrdenServicioPruebasService service)
        {
            _service = service;
        }

        // ─── Helper ────────────────────────────────────────────────────────────────
        private IActionResult HandleException(Exception ex) => ex switch
        {
            KeyNotFoundException => NotFound(new { message = ex.Message }),
            InvalidOperationException => Conflict(new { message = ex.Message }),
            ArgumentException => BadRequest(new { message = ex.Message }),
            _ => StatusCode(500, new { message = ex.Message })
        };

        // ─── POST ──────────────────────────────────────────────────────────────────
        /// <summary>
        /// Crea una nueva orden de servicio.
        /// tituloEvento se guarda solo en OrdenServicioActividad; COBSERVACIONES recibe únicamente el texto de observaciones.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] OrdenServicioPruebasCreateRequestDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                return Ok(await _service.CreateAsync(dto));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        // ─── GET ───────────────────────────────────────────────────────────────────
        /// <summary>
        /// Devuelve órdenes de servicio de pruebas con filtros opcionales y paginación.
        /// </summary>
        /// <remarks>
        /// Reglas:
        /// - Si no se envía ningún filtro, la búsqueda se limita al mes actual.
        /// - folio usa búsqueda parcial sobre el folio visible en formato ORD-000001.
        /// - agentePrincipalId filtra por admDocumentos.CIDAGENTE.
        /// - agenteAuxiliarId busca coincidencia exacta dentro del CSV almacenado en AgenteAuxiliar.
        ///
        /// Ejemplos:
        ///
        /// GET /api/ordenes-servicio-pruebas?page=1&amp;pageSize=20
        ///
        /// GET /api/ordenes-servicio-pruebas?folio=ORD-000001&amp;estadoOrden=EN_PROCESO&amp;agentePrincipalId=12&amp;agenteAuxiliarId=5&amp;fechaInicio=01/08/2026&amp;fechaFin=31/08/2026&amp;page=1&amp;pageSize=20
        /// </remarks>
        [HttpGet]
        [ProducesResponseType(typeof(OrdenServicioPruebasPagedResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetAll([FromQuery] OrdenServicioPruebasListRequestDto filter)
        {
            try
            {
                return Ok(await _service.SearchAsync(filter));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        // ─── PATCH /estado ─────────────────────────────────────────────────────────
        /// <summary>
        /// Actualiza el estado de la orden (PENDIENTE | EN_PROCESO | FINALIZADO).
        /// EN_PROCESO: setea FechaInicio si está null.
        /// FINALIZADO: setea FechaFinal y calcula TotalHoras (horario laboral L–V 9–18 / S 9–14).
        /// </summary>
        [HttpPatch("{documentoId:int}/estado")]
        public async Task<IActionResult> PatchEstado(int documentoId, [FromBody] OrdenServicioPruebasPatchEstadoDto dto)
        {
            try
            {
                return Ok(await _service.PatchEstadoAsync(documentoId, dto));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        // ─── PATCH /estado-factura ─────────────────────────────────────────────────
        [HttpPatch("{documentoId:int}/estado-factura")]
        public async Task<IActionResult> PatchFactura(int documentoId, [FromBody] OrdenServicioPruebasPatchFacturaDto dto)
        {
            try
            {
                return Ok(await _service.PatchFacturaAsync(documentoId, dto));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        // ─── PATCH /financiero ─────────────────────────────────────────────────────
        [HttpPatch("{documentoId:int}/financiero")]
        public async Task<IActionResult> PatchFinanciero(int documentoId, [FromBody] OrdenServicioPruebasPatchFinancieroDto dto)
        {
            try
            {
                return Ok(await _service.PatchFinancieroAsync(documentoId, dto));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        // ─── PATCH /agente-principal ───────────────────────────────────────────────
        /// <summary>
        /// Actualiza admDocumentos.CIDAGENTE. No permitido si EstadoOrden = FINALIZADO.
        /// Body: { "idAgentePrincipal": 12 }
        /// </summary>
        [HttpPatch("{documentoId:int}/agente-principal")]
        public async Task<IActionResult> PatchAgentePrincipal(int documentoId, [FromBody] OrdenServicioPruebasPatchAgentePrincipalDto dto)
        {
            try
            {
                return Ok(await _service.PatchAgentePrincipalAsync(documentoId, dto));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        // ─── PATCH /agentes-auxiliares ─────────────────────────────────────────────
        /// <summary>
        /// Guarda lista de agentes auxiliares como CSV en OrdenServicioActividad.AgenteAuxiliar.
        /// No permitido si EstadoOrden = FINALIZADO.
        /// Body: { "agentesAuxiliares": [2, 5, 8] }
        /// </summary>
        [HttpPatch("{documentoId:int}/agentes-auxiliares")]
        public async Task<IActionResult> PatchAgentesAuxiliares(int documentoId, [FromBody] OrdenServicioPruebasPatchAgentesAuxiliaresDto dto)
        {
            try
            {
                return Ok(await _service.PatchAgentesAuxiliaresAsync(documentoId, dto));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        // ─── PATCH /observaciones ─────────────────────────────────────────────────
        /// <summary>
        /// Actualiza únicamente admDocumentos.COBSERVACIONES (sin mezcla de otros campos).
        /// No permitido si EstadoOrden = FINALIZADO.
        /// Body: { "observaciones": "texto..." }
        /// </summary>
        [HttpPatch("{documentoId:int}/observaciones")]
        public async Task<IActionResult> PatchObservaciones(int documentoId, [FromBody] OrdenServicioPruebasPatchObservacionesDto dto)
        {
            try
            {
                return Ok(await _service.PatchObservacionesAsync(documentoId, dto));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        // ─── PATCH /nota-soporte ───────────────────────────────────────────────────
        /// <summary>
        /// Actualiza OrdenServicioActividad.NotasSoporte.
        /// Solo disponible cuando EstadoOrden = EN_PROCESO.
        /// Body: { "notaSoporte": "texto..." }
        /// </summary>
        [HttpPatch("{documentoId:int}/nota-soporte")]
        public async Task<IActionResult> PatchNotaSoporte(int documentoId, [FromBody] OrdenServicioPruebasPatchNotaSoporteDto dto)
        {
            try
            {
                return Ok(await _service.PatchNotaSoporteAsync(documentoId, dto));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        // ─── Entregables ───────────────────────────────────────────────────────────
        [HttpGet("{documentoId:int}/entregables")]
        public async Task<IActionResult> GetEntregables(int documentoId)
        {
            try
            {
                return Ok(await _service.GetEntregablesAsync(documentoId));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpPost("{documentoId:int}/entregables")]
        public async Task<IActionResult> AddEntregable(int documentoId, [FromBody] OrdenServicioPruebasAddEntregableDto dto)
        {
            try
            {
                var usuario = User?.Identity?.Name;
                return Ok(await _service.AddEntregableAsync(documentoId, dto, usuario));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpPut("{documentoId:int}/entregables/{entregableId:int}")]
        public async Task<IActionResult> UpdateEntregable(int documentoId, int entregableId, [FromBody] OrdenServicioPruebasUpdateEntregableDto dto)
        {
            try
            {
                return Ok(await _service.UpdateEntregableAsync(documentoId, entregableId, dto));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpDelete("{documentoId:int}/entregables/{entregableId:int}")]
        public async Task<IActionResult> DeleteEntregable(int documentoId, int entregableId)
        {
            try
            {
                return Ok(await _service.DeleteEntregableAsync(documentoId, entregableId));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpPost("{documentoId:int}/enviar-con-factura")]
        public async Task<IActionResult> EnviarConFactura(int documentoId, [FromBody] OrdenServicioPruebasEnviarConFacturaDto dto)
        {
            try
            {
                return Ok(await _service.EnviarConFacturaAsync(documentoId, dto));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        [HttpGet("{documentoId:int}/detalle")]
        public async Task<IActionResult> GetDetalle(int documentoId)
        {
            try
            {
                return Ok(await _service.GetDetalleAsync(documentoId));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        // ─── PATCH /direccion ──────────────────────────────────────────────────────
        /// <summary>
        /// Actualiza la dirección de la orden: DireccionGoogleMaps (texto), Latitud y Longitud.
        /// Body: { "direccionGoogleMaps": "...", "latitud": 24.0, "longitud": -104.0 }
        /// </summary>
        [HttpPatch("{documentoId:int}/direccion")]
        public async Task<IActionResult> PatchDireccion(int documentoId, [FromBody] OrdenServicioPruebasPatchDireccionDto dto)
        {
            try
            {
                return Ok(await _service.PatchDireccionAsync(documentoId, dto));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }

        // ─── PATCH /cliente ────────────────────────────────────────────────────────
        /// <summary>
        /// Actualiza el cliente (CIDCLIENTEPROVEEDOR) de la orden. No permitido si EstadoOrden = FINALIZADO.
        /// Body: { "idCliente": 123 }
        /// </summary>
        [HttpPatch("{documentoId:int}/cliente")]
        public async Task<IActionResult> PatchCliente(int documentoId, [FromBody] OrdenServicioPruebasPatchClienteDto dto)
        {
            try
            {
                return Ok(await _service.PatchClienteAsync(documentoId, dto));
            }
            catch (Exception ex)
            {
                return HandleException(ex);
            }
        }
    }
}