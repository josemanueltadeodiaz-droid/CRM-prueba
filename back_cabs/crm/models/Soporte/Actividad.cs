using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using back_cabs.CRM.enums;

namespace back_cabs.CRM.models.Soporte
{
    [Table("Actividades")]
    public class Actividad
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public int? DocumentoId { get; set; }
        public int? Participantes { get; set; }
        [Required]
        public bool EsVirtual { get; set; }
        public int? Horas { get; set; }
        [Column(TypeName = "nvarchar(max)")]
        public string? InfDispositivo { get; set; }
        [Column(TypeName = "nvarchar(max)")]
        public string? Piezas { get; set; }
        [StringLength(255)]
        [Column(TypeName = "varchar(255)")]
        public string? Ubicacion { get; set; }
        public int? AgentePrincipal { get; set; }
        public string? Agentes { get; set; }
        public TipoSoftware SoftwareControlRemoto { get; set; } = 0;
        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
        public DateTime? HoraInicio { get; set; }
        public DateTime? HoraFin { get; set; }
        public TipoOrden TipoOrden { get; set; } = 0;
        public bool? UsaVehiculo { get; set; }
        public int? VehiculoId { get; set; }
        public decimal? Subtotal { get; set; }
        public decimal? Iva { get; set; }
        public decimal? TotalConIva { get; set; }        
    }
}