namespace back_cabs.CRM.DTOs.Request
{
    /// <summary>
    /// Body para PATCH /api/ordenes-servicio-pruebas/{documentoId}/direccion
    /// </summary>
    public class OrdenServicioPruebasPatchDireccionDto
    {
        /// <summary>Dirección legible (texto). NO coordenadas concatenadas.</summary>
        public string? DireccionGoogleMaps { get; set; }

        /// <summary>Latitud decimal.</summary>
        public decimal? Latitud { get; set; }

        /// <summary>Longitud decimal.</summary>
        public decimal? Longitud { get; set; }
    }
}
