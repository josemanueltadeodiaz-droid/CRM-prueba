namespace back_cabs.CRM.DTOs.Request
{
    /// <summary>
    /// Body para PATCH /api/ordenes-servicio-pruebas/{documentoId}/agentes-auxiliares
    /// </summary>
    public class OrdenServicioPruebasPatchAgentesAuxiliaresDto
    {
        /// <summary>Lista de IDs de agentes auxiliares. Se almacena como CSV en OrdenServicioActividad.AgenteAuxiliar.</summary>
        public List<int> AgentesAuxiliares { get; set; } = new();
    }
}
