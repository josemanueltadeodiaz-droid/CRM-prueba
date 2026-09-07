namespace CRM_CABS.Dtos.Google
{
    public class CreateCalendarEventDto
    {
        public string Summary { get; set; } = "";
        public string Description { get; set; } = "";
        public string Location { get; set; } = "";

        /// <summary>"bloque" para evento con hora; "todoDia" para evento de día completo.</summary>
        public string Tipo { get; set; } = "bloque";

        /// <summary>Fecha/hora inicio en formato RFC3339 (p. ej. "2024-01-15T10:00:00.000Z"). Solo para Tipo = "bloque".</summary>
        public string? StartIso { get; set; }

        /// <summary>Fecha/hora fin en formato RFC3339. Solo para Tipo = "bloque".</summary>
        public string? EndIso { get; set; }

        /// <summary>Fecha en formato "YYYY-MM-DD". Solo para Tipo = "todoDia".</summary>
        public string? Dia { get; set; }
    }
}