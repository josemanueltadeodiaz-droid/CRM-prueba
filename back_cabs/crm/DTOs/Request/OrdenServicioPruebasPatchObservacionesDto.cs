namespace back_cabs.CRM.DTOs.Request
{
    /// <summary>
    /// Body para PATCH /api/ordenes-servicio-pruebas/{documentoId}/observaciones
    /// </summary>
    public class OrdenServicioPruebasPatchObservacionesDto
    {
        /// <summary>Texto de observaciones a guardar en admDocumentos.COBSERVACIONES.</summary>
        public string? Observaciones { get; set; }
    }
}
