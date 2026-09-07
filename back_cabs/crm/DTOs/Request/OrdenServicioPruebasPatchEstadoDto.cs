namespace back_cabs.CRM.DTOs.Request
{
    public class OrdenServicioPruebasPatchEstadoDto
    {
        // PENDIENTE | EN_PROCESO | FINALIZADO
        public string EstadoOrden { get; set; } = string.Empty;
    }
}