// =====================================================================================
// ENUM ESTADO ORDEN - EstadoOrden.cs
// =====================================================================================
//
// ¿QUÉ HACE ESTE ARCHIVO?
// Define los estados posibles para una orden de trabajo del módulo de Recepción.
// Garantiza consistencia en los estados y provee métodos de extensión útiles.
//
// CUÁNDO USARLO:
// - Validación de estados en órdenes de trabajo
// - Conversión entre string de BD y enum en el modelo
// - Control de flujo de trabajo de órdenes
//
// CÓMO USARLO:
// string estadoBd = EstadoOrden.CAPTURADA.ToDbValue();
// EstadoOrden estado = EstadoOrdenExtensions.FromDbValue("CAPTURADA");
//
// =====================================================================================

using System.ComponentModel;

namespace back_cabs.CRM.enums
{
    public enum EstadoOrden
    {
        [Description("Pendiente")]
        PENDIENTE = 0,

        [Description("En proceso")]
        EN_PROCESO = 1,

        [Description("Cerrada")]
        CERRADA = 2,

        [Description("Cancelada")]
        CANCELADA = 3
    }
}