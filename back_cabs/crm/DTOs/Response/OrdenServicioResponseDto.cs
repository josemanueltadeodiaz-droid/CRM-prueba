using back_cabs.CRM.DTOs.Legacy;
using back_cabs.CRM.enums;
using System.Collections.Generic;

namespace back_cabs.CRM.DTOs.Response
{
    public class OrdenServicioResponseDto
    {

        //ID necesarios
        public int IdDocumento { get; set; }
        public int IdCliente { get; set; }
        public int IdAgente { get; set; }
        public string SerieDocumento { get; set; } = string.Empty;
        public double Folio { get; set; }
        public DateTime Fecha { get; set; }
        public string RazonSocial { get; set; } = string.Empty;
        public DateTime FechaVencimiento { get; set; }
        public DateTime FechaProntoPago { get; set; }
        public DateTime FechaEntregaRecepcion { get; set; }

        // Totales
        public double Subtotal { get; set; }
        public double IVA { get; set; }
        public double Total { get; set; }

        // Estado
        public string Estado { get; set; } = "Activa";
        public string Afectado { get; set; } = "Si";
        public string Impreso { get; set; } = "Si";
        public string Devuelto { get; set; } = "No";

        // Agente de ventas (nombre completo)
        public int? Agente { get; set; }
        public string? Observaciones { get; set; } = string.Empty;
        public bool Facturado { get; set; }

        // Campos de Actividad
        public int? Participantes { get; set; }
        public bool EsVirtual { get; set; }
        public int? Horas { get; set; }
        public string? InfDispositivo { get; set; }
        public string? Piezas { get; set; }
        public string? Ubicacion { get; set; }
        public TipoSoftware SoftwareControlRemoto { get; set; }
        public double? Gasto1 { get; set; }
        public double? Gasto2 { get; set; }
        public TipoOrden TipoOrden { get; set; }
        public int? VehiculoId { get; set; }

        // Agentes deserializados
        public List<int>? AgentesIds { get; set; }
        public string? Agentes { get; set; }

        public List<OrdenServicioDetalleResponseDto>? Detalles { get; set; }
    }

    public class OrdenServicioDetalleResponseDto
    {
        public int IdDocumento { get; set; }
        public int IdMovimiento { get; set; }
        public string ObservacionesMovimiento { get; set; } = string.Empty;
        public double NumeroMovimiento { get; set; }
    }
}