namespace back_cabs.CRM.DTOs.Request
{
    /// <summary>
    /// Body para PATCH /api/ordenes-servicio-pruebas/{documentoId}/nota-soporte
    /// </summary>
    public class OrdenServicioPruebasPatchNotaSoporteDto
    {
        /// <summary>Nota de soporte a guardar en OrdenServicioActividad.NotasSoporte. Solo disponible cuando EstadoOrden = EN_PROCESO.</summary>
        public string? NotaSoporte { get; set; }
    }
}
