namespace back_cabs.CRM.DTOs.Response
{
    public class OrdenServicioPruebasEntregableResponseDto
    {
        public int Id { get; set; }
        public int OrdenServicioActividadId { get; set; }
        public string Tipo { get; set; } = "PRODUCTO";
        public string CodigoProducto { get; set; } = string.Empty;
        public string NombreProducto { get; set; } = string.Empty;
        public decimal Cantidad { get; set; }
        public decimal? PrecioUnitario { get; set; }
        public decimal Importe { get; set; }
        public string? Observaciones { get; set; }
        public DateTime FechaRegistro { get; set; }
        public string? UsuarioRegistro { get; set; }
    }
}