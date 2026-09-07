// =====================================================================================
// ENUM TIPO ORDEN - TipoOrden.cs
// =====================================================================================
//
// ¿QUÉ HACE ESTE ARCHIVO?
// Define los tipos de órdenes disponibles en el módulo de Recepción.
//
// CUÁNDO USARLO:
// - Validación de datos de entrada
// - Filtros en consultas
// - Diferenciación entre cotizaciones y asesorías
//
// =====================================================================================

using System.ComponentModel;
using System.Text.Json.Serialization;

namespace back_cabs.CRM.enums
{
    /// <summary>
    /// Tipo de orden de trabajo: cotización o asesoría
    /// </summary>

    public enum TipoOrden
    {
        [Description("Servicio tecnico de sistemas o fallas")]
        SERVICIO_TECNICO,

        [Description("Capacitación")]
        ASESORIA,

        [Description("Reparación")]
        REPARACION,

    }
}