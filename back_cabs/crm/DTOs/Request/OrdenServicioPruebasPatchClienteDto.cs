namespace back_cabs.CRM.DTOs.Request
{
    /// <summary>
    /// Body para PATCH /api/ordenes-servicio-pruebas/{documentoId}/cliente
    /// </summary>
    public class OrdenServicioPruebasPatchClienteDto
    {
        /// <summary>ID del cliente a asignar (CIDCLIENTEPROVEEDOR en admDocumentos). Debe ser mayor a 0.</summary>
        public int IdCliente { get; set; }
    }
}
