using System;
using System.ComponentModel.DataAnnotations;
using back_cabs.CRM.enums;

namespace back_cabs.CRM.DTOs.Request
{
    public class OrdenServicioCreateRequestDto
    {
        // Datos para AdmDocumento (Legacy)
        [Required]
        public int ClienteId { get; set; }

        [Required]
        public int AgenteId { get; set; }

        [Required]
        public int AgentePrincipal { get; set; }

        public DateTime Fecha { get; set; }

        public int? DocumentoOrigenId { get; set; }

        public int Afectado { get; set; }

        public int? Cancelado { get; set; }

        // OPCIONAL
        public int? Impreso { get; set; }

        public int Neto { get; set; }

        // OPCIONALES
        public int? Impuesto { get; set; }
        public int? Impuesto1 { get; set; }

        public EstadoOrden Estado { get; set; }

        public string? ObservacionesDocumento { get; set; }

        // OPCIONAL
        public int? Total { get; set; }

        // OPCIONAL
        public DateTime? FechaEntrega { get; set; }

        // Datos para Actividad (Local)
        [Required]
        public int DocumentoId { get; set; }

        public int? Participantes { get; set; }

        [Required]
        public bool EsVirtual { get; set; }

        // OPCIONAL
        public int? Horas { get; set; }

        // Datos en caso de ser reparación
        public string? InfDispositivo { get; set; } 

        // OPCIONAL
        public string? Piezas { get; set; }

        public string? Ubicacion { get; set; }

        public List<int>? AgentesIds { get; set; }

        // OPCIONAL
        public TipoSoftware? SoftwareControlRemoto { get; set; }

        public TipoOrden TipoOrden { get; set; }
    }

    public class OrdenServicioMovimientoDto
    {
        public int IdMovimiento { get; set; }
        public string Observaciones { get; set; } = "";
    }

    public class OrdenServicioAgregarServiciosDto
    {
        public int DocumentoId { get; set; }
        public List<OrdenServicioMovimientoDto> Servicios { get; set; } = [];
    }
}