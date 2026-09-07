using System.ComponentModel.DataAnnotations;

namespace CRM.DTOs.Request;

public class VehiculoRequestDto
{
    [MaxLength(50)]
    public string? TipoVehiculo { get; set; }

    [MaxLength(20)]
    public string? Transmision { get; set; }

    public bool EsDeEmpresa { get; set; } = true;

    [MaxLength(20)]
    [RegularExpression(@"^[A-Z0-9\-]+$", 
        ErrorMessage = "Las placas deben contener solo mayúsculas, números y guiones")]
    public string? Placas { get; set; }

    public bool Activo { get; set; } = true;

    [StringLength(1000, 
        ErrorMessage = "Las observaciones no pueden superar 1000 caracteres")]
    public string? Observaciones { get; set; }

    [Required(ErrorMessage = "El nombre del vehículo es requerido")]
    [StringLength(100, MinimumLength = 3,
        ErrorMessage = "El nombre debe tener entre 3 y 100 caracteres")]
    public string NombreVehiculo { get; set; } = string.Empty;

    [Required(ErrorMessage = "El kilometraje es requerido")]
    [Range(0, int.MaxValue, 
        ErrorMessage = "El kilometraje debe ser mayor o igual a 0")]
    public int Kilometraje { get; set; }
}

/// <summary>
/// DTO específico para actualizar vehículos.
/// Solo permite modificar: kilometraje (obligatorio), placas (opcional), observaciones (opcional) y activo (opcional)
/// </summary>
public class VehiculoUpdateDto
{
    [Required(ErrorMessage = "El kilometraje es requerido")]
    [Range(0, int.MaxValue, 
        ErrorMessage = "El kilometraje debe ser mayor o igual a 0")]
    public int Kilometraje { get; set; }

    [MaxLength(20)]
    [RegularExpression(@"^[A-Z0-9\-]+$", 
        ErrorMessage = "Las placas deben contener solo mayúsculas, números y guiones")]
    public string? Placas { get; set; }

    [StringLength(1000, 
        ErrorMessage = "Las observaciones no pueden superar 1000 caracteres")]
    public string? Observaciones { get; set; }

    public bool? Activo { get; set; }
}
