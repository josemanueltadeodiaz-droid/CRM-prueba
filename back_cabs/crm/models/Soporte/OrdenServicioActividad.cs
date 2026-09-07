namespace back_cabs.CRM.models.Soporte
{
    public class OrdenServicioActividad
    {
        public int Id { get; set; }
        public int DocumentoId { get; set; }

        public bool EsVirtual { get; set; }
        public DateTime FechaCreacion { get; set; }
        public DateTime? FechaInicio { get; set; }
        public DateTime? FechaFinal { get; set; }
        public decimal? TotalHoras { get; set; }

        public int? AgentePrincipal { get; set; }
        public string? AgenteAuxiliar { get; set; }

        public string? TituloEvento { get; set; }
        public DateTime? FechaStart { get; set; }
        public DateTime? FechaEnd { get; set; }

        public string? NombreSolicitante { get; set; }
        public string? NombreDestinatario { get; set; }
        public string? ContactoSolicitante { get; set; }
        public string? ContactoDestinatario { get; set; }

        public string? UrlImagen { get; set; }
        public string? CredencialesEscritas { get; set; }

        public string? EstadoOrden { get; set; }
        public string EstadoFactura { get; set; } = "PENDIENTE";

        public string? DireccionGoogleMaps { get; set; }
        public string? GooglePlaceId { get; set; }
        public decimal? Latitud { get; set; }
        public decimal? Longitud { get; set; }

        public decimal? Subtotal { get; set; }
        public decimal? Iva { get; set; }
        public decimal? TotalConIva { get; set; }

        public string? Observaciones { get; set; }

        public string? NotasSoporte { get; set; }

        public string? GoogleEventId { get; set; }
        public string? GoogleEventLink { get; set; }
        public string? GoogleCalendarSyncStatus { get; set; }
        public string? GoogleCalendarSyncError { get; set; }
    }
}