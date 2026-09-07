namespace back_cabs.CRM.models.Soporte
{
    public class OrdenServicioEntregable
    {
        public int Id { get; set; }
        public int OrdenServicioActividadId { get; set; }

        // PRODUCTO | SERVICIO_ASESORIA
        public string Tipo { get; set; } = "PRODUCTO";

        public string CodigoProducto { get; set; } = string.Empty;
        public string NombreProducto { get; set; } = string.Empty;

        public decimal Cantidad { get; set; } = 1;
        public decimal? PrecioUnitario { get; set; }

        public string? Observaciones { get; set; }
        public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
        public string? UsuarioRegistro { get; set; }

        // Navegación
        public OrdenServicioActividad? OrdenServicioActividad { get; set; }
    }
}