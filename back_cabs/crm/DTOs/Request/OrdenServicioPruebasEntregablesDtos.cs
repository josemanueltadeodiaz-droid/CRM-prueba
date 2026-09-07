namespace back_cabs.CRM.DTOs.Request
{
    public class OrdenServicioPruebasAddEntregableDto
    {
        public string Tipo { get; set; } = "PRODUCTO"; // PRODUCTO | SERVICIO_ASESORIA
        public string CodigoProducto { get; set; } = string.Empty;
        public string NombreProducto { get; set; } = string.Empty;
        public decimal Cantidad { get; set; } = 1;
        public decimal? PrecioUnitario { get; set; }
        public string? Observaciones { get; set; }
    }

    public class OrdenServicioPruebasUpdateEntregableDto
    {
        public decimal Cantidad { get; set; } = 1;
        public decimal? PrecioUnitario { get; set; }
        public string? Observaciones { get; set; }
    }
}