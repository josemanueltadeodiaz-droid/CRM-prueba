using back_cabs.CRM.DTOs.Legacy;
using back_cabs.CRM.DTOs.Response;
using back_cabs.CRM.models.legacy;

namespace back_cabs.CRM.Interfaces.Soporte
{
    /// <summary>
    /// Interfaz para AdmOrdenServicio
    /// </summary>
    public interface IAdmOrdenServicioRepository
    {
        // ═══════════════════════════════════════════════════════════════
        // MÉTODOS PARA ORDENES DE SERVICIO
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Crea un documento de orden de servicio
        /// </summary>
        Task<int> CreateDocumentoOrdenServicioAsync(AdmDocumento documento);

        /// <summary>
        /// Inserta movimientos en un documento existente
        /// </summary>
        /// <param name="idDocumento">ID del documento</param>
        /// <param name="idDocumentoDe">ID del documento de origen</param>
        /// <param name="servicios">Lista de servicios a insertar</param>
        Task InsertarServiciosAsync(int idDocumento, int idDocumentoDe, List<AdmMovimiento> servicios);

        /// <summary>
        /// Obtiene un movimiento por su ID
        /// </summary>
        Task<AdmMovimiento?> GetMovimientoByIdAsync(int idMovimiento);

        /// <summary>
        /// Obtiene el último número de movimiento
        /// </summary>
        Task<double> GetUltimoNumeroMovimientoAsync(int documentoId);

        /// <summary>
        /// Actualiza las observaciones de un movimiento
        /// </summary>
        Task ActualizarObservacionesMovimientoAsync(int idMovimiento, string observaciones);

        Task<List<OrdenServicioDetalleResponseDto>> GetServicioByDocumentoIdAsync(int idDocumento);

        Task<List<OrdenServicioDetalleResponseDto>> GetServiciosByDocumentosIdsAsync(List<int> documentosIds);
        Task<List<AdmDocumento>> GetDocumentosByIdsAsync(List<int> documentosIds);

        /// <summary>
        /// Verifica si la orden esta cerrada
        /// </summary>
        Task<bool> OrdenCerradaAsync(int idDocumento);

        /// <summary>
        /// Elimina un documento de orden de servicio por su ID (compensación de transacción)
        /// </summary>
        Task DeleteDocumentoAsync(int documentoId);

        /// <summary>
        /// Actualiza el agente principal (CIDAGENTE) en admDocumentos
        /// </summary>
        Task UpdateAgentePrincipalAsync(int documentoId, int idAgente);

        /// <summary>
        /// Actualiza las observaciones (COBSERVACIONES) en admDocumentos
        /// </summary>
        Task UpdateObservacionesDocumentoAsync(int documentoId, string? observaciones);

        /// <summary>
        /// Actualiza el cliente (CIDCLIENTEPROVEEDOR) en admDocumentos.
        /// </summary>
        Task UpdateClienteAsync(int documentoId, int idCliente);
    }
}