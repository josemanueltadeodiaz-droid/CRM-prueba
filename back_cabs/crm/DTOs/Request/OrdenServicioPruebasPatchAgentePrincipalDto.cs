namespace back_cabs.CRM.DTOs.Request
{
    /// <summary>
    /// Body para PATCH /api/ordenes-servicio-pruebas/{documentoId}/agente-principal
    /// </summary>
    public class OrdenServicioPruebasPatchAgentePrincipalDto
    {
        /// <summary>ID del agente principal a asignar (actualiza admDocumentos.CIDAGENTE)</summary>
        public int IdAgentePrincipal { get; set; }
    }
}
