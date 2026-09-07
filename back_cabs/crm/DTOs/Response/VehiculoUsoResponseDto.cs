using System;

namespace CRM.DTOs.Response
{
    /// <summary>
    /// DTO para retornar información del historial de uso de un vehículo
    /// Incluye detalles de conductores, fechas, kilometraje y duración
    /// </summary>
    public class VehiculoUsoResponseDto
    {
        /// <summary>
        /// ID único del registro de uso
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// ID del vehículo utilizado
        /// </summary>
        public int VehiculoId { get; set; }

        /// <summary>
        /// ID del usuario que utilizó el vehículo
        /// </summary>
        public int UsuarioId { get; set; }

        /// <summary>
        /// Nombre completo del conductor
        /// </summary>
        public string? UsuarioNombre { get; set; }

        /// <summary>
        /// Fecha y hora exacta cuando salió el vehículo
        /// </summary>
        public DateTime? FechaInicio { get; set; }

        /// <summary>
        /// Fecha y hora exacta cuando regresó el vehículo
        /// Null si aún está en uso (estado = EN_USO)
        /// </summary>
        public DateTime? FechaFin { get; set; }

        /// <summary>
        /// Motivo o descripción del uso del vehículo
        /// </summary>
        public string MotivoUso { get; set; } = string.Empty;

        /// <summary>
        /// Kilometraje del vehículo al momento de salida
        /// </summary>
        public int KilometrajeInicial { get; set; }

        /// <summary>
        /// Kilometraje del vehículo al momento de regreso
        /// Null si aún está en uso (estado = EN_USO)
        /// </summary>
        public int? KilometrajeFinal { get; set; }

        /// <summary>
        /// Kilómetros recorridos en el viaje
        /// Se calcula como: KilometrajeFinal - KilometrajeInicial
        /// </summary>
        public int? KilometrosRecorridos => KilometrajeFinal.HasValue 
            ? KilometrajeFinal.Value - KilometrajeInicial 
            : null;

        /// <summary>
        /// Duración total del viaje en minutos
        /// Se calcula como: FechaFin - FechaInicio
        /// </summary>
        public double? DuracionMinutos { get; set; }

        /// <summary>
        /// Observaciones o notas adicionales sobre el viaje
        /// </summary>
        public string? Observaciones { get; set; }

        /// <summary>
        /// Estado del uso: EN_USO, COMPLETADO, CANCELADO
        /// </summary>
        public string Estado { get; set; } = string.Empty;
    }
}
