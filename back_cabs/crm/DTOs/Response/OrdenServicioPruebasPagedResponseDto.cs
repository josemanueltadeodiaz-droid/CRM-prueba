namespace back_cabs.CRM.DTOs.Response
{
    /// <summary>
    /// Respuesta paginada para órdenes de servicio de pruebas.
    /// </summary>
    public class OrdenServicioPruebasPagedResponseDto
    {
        /// <summary>
        /// Número de página actual.
        /// </summary>
        public int Page { get; set; }

        /// <summary>
        /// Tamaño de página actual.
        /// </summary>
        public int PageSize { get; set; }

        /// <summary>
        /// Total de registros encontrados.
        /// </summary>
        public int TotalItems { get; set; }

        /// <summary>
        /// Total de páginas disponibles.
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        /// Resumen global del período y filtros aplicados, excluyendo estadoOrden.
        /// </summary>
        public OrdenServicioPruebasResumenDto ResumenGlobal { get; set; } = new();

        /// <summary>
        /// Resumen del período con todos los filtros aplicados.
        /// </summary>
        public OrdenServicioPruebasResumenDto ResumenFiltrado { get; set; } = new();

        /// <summary>
        /// Elementos de la página actual.
        /// </summary>
        public List<OrdenServicioPruebasResponseDto> Items { get; set; } = [];
    }
}
