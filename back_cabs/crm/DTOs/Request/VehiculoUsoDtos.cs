using System.ComponentModel.DataAnnotations;

namespace CRM.DTOs.Request
{
    /// <summary>
    /// DTO para registrar la SALIDA de un vehículo (Check-out).
    /// UsuarioId es OPCIONAL - se toma automáticamente de la sesión si no se proporciona.
    /// Se puede especificar un acompañante adicional (otro usuario que viajará).
    /// </summary>
    public class RegistrarSalidaDto
    {
        /// <summary>
        /// ID del usuario/conductor principal (OPCIONAL - se toma de sesión si no se proporciona)
        /// </summary>
        public int? UsuarioId { get; set; }

        /// <summary>
        /// Motivo del uso del vehículo (a dónde va, para qué, etc.)
        /// </summary>
        [Required(ErrorMessage = "El motivo de uso es requerido")]
        [StringLength(500, MinimumLength = 5, 
            ErrorMessage = "El motivo debe tener entre 5 y 500 caracteres")]
        public string MotivoUso { get; set; } = string.Empty;

        /// <summary>
        /// Kilometraje actual del vehículo al momento de la salida
        /// </summary>
        [Required(ErrorMessage = "El kilometraje inicial es requerido")]
        [Range(0, int.MaxValue, 
            ErrorMessage = "El kilometraje debe ser mayor o igual a 0")]
        public int KilometrajeInicial { get; set; }

        /// <summary>
        /// Fecha y hora de salida (OPCIONAL - se usa la actual si no se proporciona)
        /// </summary>
        [DataType(DataType.DateTime)]
        public DateTime? FechaSalida { get; set; }

        /// <summary>
        /// ID del usuario acompañante (OPCIONAL - otro usuario que viajará con el vehículo)
        /// Puede ser diferente del UsuarioId (conductor principal)
        /// </summary>
        public int? AcompanianteId { get; set; }

        /// <summary>
        /// Descripción del acompañante o relación con el conductor
        /// (ej: "colega", "cliente", "supervisor", etc.)
        /// </summary>
        [StringLength(100, 
            ErrorMessage = "La descripción del acompañante no puede superar 100 caracteres")]
        public string? DescripcionAcompanante { get; set; }
    }

    /// <summary>
    /// DTO para registrar la ENTRADA de un vehículo (Check-in).
    /// Completa la información del viaje con datos finales.
    /// </summary>
    public class RegistrarEntradaDto
    {
        /// <summary>
        /// Kilometraje del vehículo al momento del regreso
        /// </summary>
        [Required(ErrorMessage = "El kilometraje final es requerido")]
        [Range(0, int.MaxValue, 
            ErrorMessage = "El kilometraje debe ser mayor o igual a 0")]
        public int KilometrajeFinal { get; set; }

        /// <summary>
        /// Observaciones adicionales sobre el viaje realizado
        /// </summary>
        [StringLength(1000, 
            ErrorMessage = "Las observaciones no pueden superar 1000 caracteres")]
        public string? Observaciones { get; set; }
        
        /// <summary>
        /// Fecha y hora de regreso (OPCIONAL - se usa la actual si no se proporciona)
        /// </summary>
        [DataType(DataType.DateTime)]
        public DateTime? FechaRegreso { get; set; }

        /// <summary>
        /// Estado final del viaje: COMPLETADO (normal) o CANCELADO (anulado)
        /// </summary>
        [StringLength(20)]
        [RegularExpression(@"^(COMPLETADO|CANCELADO)$", 
            ErrorMessage = "El estado debe ser COMPLETADO o CANCELADO")]
        public string Estado { get; set; } = "COMPLETADO";
    }
}

