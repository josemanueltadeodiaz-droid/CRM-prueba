using System.ComponentModel.DataAnnotations;
using back_cabs.CRM.enums;

namespace back_cabs.CRM.DTOs.Request
{
    public class OrdenServicioInicioRequestDto
    {
        [Required]
        public int DocumentoId { get; set; }

        [Required]
        public DateTime HoraInicio { get; set; }

        public bool? UsaVehiculo { get; set; }

        public int? VehiculoId { get; set; }

        public decimal? KmInicial { get; set; }

        public string? Comentarios { get; set; }
    }

    public class OrdenServicioFinRequestDto
    {
        [Required]
        public int DocumentoId { get; set; }

        [Required]
        public DateTime HoraFin { get; set; }

        public string? ObservacionesFinales { get; set; }

        public int Neto { get; set; }

        public int Impuesto { get; set; }

        public int Impuesto1 { get; set; }

        public EstadoOrden Estado { get; set; }

        public decimal? KmFinal { get; set; }

        public List<OrdenServicioMovimientoDto> Servicios { get; set; }
    }

    public class EditarServicioRequestDto
    {
        public OrdenServicioMovimientoDto servicio { get; set; }
    }
}
