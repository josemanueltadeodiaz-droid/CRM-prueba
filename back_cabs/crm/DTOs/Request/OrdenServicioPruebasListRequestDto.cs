using System.ComponentModel;

namespace back_cabs.CRM.DTOs.Request
{
    /// <summary>
    /// Filtros y paginación para listar órdenes de servicio de pruebas.
    /// </summary>
    public class OrdenServicioPruebasListRequestDto
    {
        /// <summary>
        /// Folio de la orden en formato visible ORD-000001. La búsqueda es parcial.
        /// </summary>
        public string? Folio { get; set; }

        /// <summary>
        /// Estado exacto de la orden. Ejemplos: PENDIENTE, EN_PROCESO, FINALIZADO.
        /// </summary>
        public string? EstadoOrden { get; set; }

        /// <summary>
        /// ID del agente principal (admDocumentos.CIDAGENTE).
        /// </summary>
        public int? AgentePrincipalId { get; set; }

        /// <summary>
        /// ID del agente auxiliar contenido en el CSV OrdenServicioActividad.AgenteAuxiliar.
        /// </summary>
        public int? AgenteAuxiliarId { get; set; }

        /// <summary>
        /// Fecha inicial en formato dd/MM/yyyy.
        /// </summary>
        public string? FechaInicio { get; set; }

        /// <summary>
        /// Fecha final en formato dd/MM/yyyy.
        /// </summary>
        public string? FechaFin { get; set; }

        /// <summary>
        /// Número de página (base 1).
        /// </summary>
        [DefaultValue(1)]
        public int Page { get; set; } = 1;

        /// <summary>
        /// Tamaño de página.
        /// </summary>
        [DefaultValue(10)]
        public int PageSize { get; set; } = 10;

        public bool HasExplicitFilters() =>
            !string.IsNullOrWhiteSpace(Folio) ||
            !string.IsNullOrWhiteSpace(EstadoOrden) ||
            AgentePrincipalId.HasValue ||
            AgenteAuxiliarId.HasValue ||
            !string.IsNullOrWhiteSpace(FechaInicio) ||
            !string.IsNullOrWhiteSpace(FechaFin);
    }
}
