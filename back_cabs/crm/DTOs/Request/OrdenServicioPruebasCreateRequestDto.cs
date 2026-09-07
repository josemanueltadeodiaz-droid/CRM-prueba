namespace back_cabs.CRM.DTOs.Request
{
    public class OrdenServicioPruebasCreateRequestDto
    {
        public int ClienteId { get; set; }
        public int DocumentoId { get; set; }
        public bool EsVirtual { get; set; }

        public int? AgentePrincipal { get; set; }
        public string? AgenteAuxiliar { get; set; }

        public string? TituloEvento { get; set; }
        public DateTime? FechaStart { get; set; }
        public DateTime? FechaEnd { get; set; }

        public string? NombreSolicitante { get; set; }
        public string? NombreDestinatario { get; set; }

        // JSON string: {"correo":"","telefonoFijo":"","whatsapp":""}
        public string? ContactoSolicitante { get; set; }
        public string? ContactoDestinatario { get; set; }

        public string? UrlImagen { get; set; }
        public string? CredencialesEscritas { get; set; }
        public string EstadoFactura { get; set; } = "PENDIENTE";


        public string? DireccionGoogleMaps { get; set; }
        public string? GooglePlaceId { get; set; }
        public decimal? Latitud { get; set; }
        public decimal? Longitud { get; set; }
        public string? Observaciones { get; set; }
    }
}


