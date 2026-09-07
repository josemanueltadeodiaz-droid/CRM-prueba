using back_cabs.CRM.DTOs.Response;

namespace back_cabs.CRM.DTOs.Response
{
    public class OrdenServicioPruebasDetalleResponseDto
    {
        public OrdenServicioPruebasResponseDto Orden { get; set; } = new();
        public List<OrdenServicioPruebasEntregableResponseDto> Entregables { get; set; } = [];
        public List<OrdenServicioDetalleResponseDto> Servicios { get; set; } = [];
    }
}